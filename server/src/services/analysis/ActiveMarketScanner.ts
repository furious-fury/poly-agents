import { get_markets, type Market } from "../../tools/polymarket.js";
import { logger } from "../../config/logger.js";
import { LLMRouter } from "../../llm/llm-router.js";

export interface MarketOpportunity {
    market: Market;
    action: "TRADE" | "HOLD";
    side?: "BUY" | "SELL";
    outcome?: "YES" | "NO";
    confidence: number;
    reasoning: string;
    ev: number; // Expected value score for ranking
}

export class ActiveMarketScanner {
    /**
     * Fetch top 20 active markets and analyze 5 random ones
     */
    static async scanActiveMarkets(
        systemPrompt: string,
        llmProvider: string,
        llmModel?: string,
        riskProfile?: string,
        sampleSize: number = 5
    ): Promise<MarketOpportunity[]> {
        const startTime = Date.now();
        try {
            // 1. Fetch top 20 active markets
            const topMarkets = await get_markets(20);
            if (topMarkets.length === 0) return [];

            // 2. Sample random markets
            const sampledMarkets = this.sampleRandomMarkets(topMarkets, sampleSize);
            logger.info(`📊 [Stage 1] Quick Scanning ${sampledMarkets.length} markets...`);

            // 3. Stage 1: Quick Filter (Parallel)
            // We verify if markets meet basic criteria (Spread, Volume, Time, Odds) BEFORE asking LLM
            const NOW = Date.now();
            const MIN_MS_TO_EXPIRY = 6 * 60 * 60 * 1000; // 6 Hours

            const quickAnalysis = await Promise.all(sampledMarkets.map(async (m) => {
                const spread = m.bestAsk - m.bestBid;

                // 1. Time Check
                let timeValid = true;
                if (m.endDate) {
                    const expiry = new Date(m.endDate).getTime();
                    if (expiry - NOW < MIN_MS_TO_EXPIRY) timeValid = false;
                }

                // 2. Odds Check (Avoid Resolved Markets)
                // If Bid is > 0.97 (97%) or Ask < 0.03 (3%), market is likely effectively resolved
                const oddsValid = m.bestBid < 0.97 && m.bestAsk > 0.03;

                // 3. Liquidity Check
                const isLiquid = m.volume24hr > 100 && spread < 0.15; // Max 15% spread

                const isValid = isLiquid && timeValid && oddsValid;

                let reason = "OK";
                if (!isLiquid) reason = `Spread/Vol: ${(spread * 100).toFixed(1)}% / $${m.volume24hr}`;
                else if (!timeValid) reason = "Expiring Soon (<6h)";
                else if (!oddsValid) reason = `Extreme Odds: ${(m.bestBid * 100).toFixed(1)}%`;

                return { market: m, valid: isValid, reason };
            }));

            const survivors = quickAnalysis.filter(r => r.valid).map(r => r.market);

            // Log detailed rejections for debugging
            const rejections = quickAnalysis.filter(r => !r.valid);
            if (rejections.length > 0) {
                logger.info(`🚫 [Filter] Rejected ${rejections.length} markets. Examples: ${rejections.slice(0, 3).map(r => `${r.market.question} (${r.reason})`).join(", ")}`);
            }

            logger.info(`📊 [Stage 1] Filtered: ${survivors.length}/${sampledMarkets.length} passed technical checks. (Time: ${Date.now() - startTime}ms)`);

            if (survivors.length === 0) return [];

            // 4. Stage 2: Deep Analysis (Limit to Top 2 survivors to save time)
            const targetMarkets = survivors.slice(0, 2);

            const opportunities: MarketOpportunity[] = [];
            const provider = LLMRouter.getProvider(llmProvider, llmModel);

            // Run LLM Analysis in Parallel for the few survivors
            const analysisResults = await Promise.all(targetMarkets.map(market =>
                this.analyzeMarket(market, systemPrompt, provider, riskProfile)
            ));

            for (const opp of analysisResults) {
                if (opp) opportunities.push(opp);
            }

            logger.info(`📊 [Stage 2] Found ${opportunities.length} opportunities. Total Scan Time: ${Date.now() - startTime}ms`);

            // Sort by EV descending
            return opportunities.sort((a, b) => b.ev - a.ev);

        } catch (error) {
            logger.error({ error }, "Failed to scan active markets");
            return [];
        }
    }

    /**
     * Randomly sample N markets from the list
     */
    private static sampleRandomMarkets(markets: Market[], sampleSize: number): Market[] {
        const shuffled = [...markets].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(sampleSize, markets.length));
    }

    /**
     * Analyze a single market and determine if there's a trading opportunity
     */
    private static async analyzeMarket(
        market: Market,
        systemPrompt: string,
        provider: any,
        riskProfile?: string
    ): Promise<MarketOpportunity | null> {
        try {
            const riskGuidelines = riskProfile === "DEGEN"
                ? "You are a DEGEN trader. Be AGGRESSIVE. Trade if you see ANY edge, even small ones. Confidence threshold: 30%+"
                : riskProfile === "HIGH"
                    ? "You are an aggressive trader. Trade if you see good opportunities. Confidence threshold: 50%+"
                    : riskProfile === "MEDIUM"
                        ? "You are a balanced trader. Trade on solid opportunities. Confidence threshold: 60%+"
                        : "You are a conservative trader. Only trade on very strong signals. Confidence threshold: 75%+";

            const analysisPrompt = `
MARKET ANALYSIS TASK:
You are analyzing a prediction market to find trading opportunities.

MARKET: "${market.question}"
CURRENT ODDS:
- YES: ${(market.bestBid * 100).toFixed(1)}%
- NO: ${((1 - market.bestAsk) * 100).toFixed(1)}%
- 24h Volume: $${market.volume24hr.toLocaleString()}

YOUR TRADING STYLE: ${riskGuidelines}

TASK:
Analyze this market and determine if there's a trading edge based on:
1. Current odds vs your assessment of the true probability
2. Market inefficiencies or mispricings
3. Recent news or events that might affect the outcome
4. Your knowledge of the topic

OUTPUT JSON:
{
    "action": "TRADE" | "HOLD",
    "side": "BUY" | "SELL",
    "outcome": "YES" | "NO",
    "confidence": 0-100,
    "reasoning": "Brief explanation of your analysis",
    "trueProb": 0-100 (your estimate of the true probability for YES outcome)
}

If you don't see a clear edge, return action: "HOLD".
`;

            const response = await provider.generateResponse(
                systemPrompt + "\n" + analysisPrompt,
                "Analyze this market."
            );

            if (!response) return null;

            const jsonStr = response.replace(/```json/g, "").replace(/```/g, "").trim();
            const analysis = JSON.parse(jsonStr);

            // Calculate EV based on confidence and mispricing
            const currentOdds = analysis.outcome === "YES" ? market.bestBid : (1 - market.bestAsk);
            const trueProb = analysis.trueProb / 100;
            const edge = trueProb - currentOdds;
            const ev = edge * analysis.confidence; // Simple EV heuristic

            return {
                market,
                action: analysis.action,
                side: analysis.side,
                outcome: analysis.outcome,
                confidence: analysis.confidence,
                reasoning: analysis.reasoning,
                ev: ev
            };

        } catch (error) {
            logger.error({ error, market: market.question }, "Failed to analyze market");
            return null;
        }
    }
}
