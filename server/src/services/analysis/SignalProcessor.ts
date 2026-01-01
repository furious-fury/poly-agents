import type { MarketSignal } from "./MarketIntelligence.js";
import { search_markets, type Market } from "../../tools/polymarket.js";
import { logger } from "../../config/logger.js";

export interface TradeOpportunity {
    market: Market;
    signal: MarketSignal;
    action: "BUY" | "SELL"; // Usually BUY for long/short via YES/NO tokens
    outcome: "YES" | "NO";
    confidence: number;
    ev: number; // Expected Value per share
}

export class SignalProcessor {

    /**
     * Process signals, find markets, and calculate EV
     */
    static async processSignals(signals: MarketSignal[]): Promise<TradeOpportunity[]> {
        const opportunities: TradeOpportunity[] = [];

        for (const signal of signals) {
            // 1. Find relevant markets
            // Use the topic + relevant tickers
            const queries = [signal.marketTopic, ...signal.relevantTickers.slice(0, 2)];
            let markets: Market[] = [];

            for (const q of queries) {
                if (!q) continue;
                const results = await search_markets(q);
                markets.push(...results);
            }

            // Deduplicate markets
            markets = Array.from(new Map(markets.map(m => [m.id, m])).values());

            if (markets.length === 0) {
                logger.info(`⚠ No markets found for signal: "${signal.headline}"`);
                continue;
            }

            // 2. Evaluate each market (High level EV check)
            for (const market of markets) {
                const opp = this.evaluateMarket(market, signal);
                if (opp) {
                    opportunities.push(opp);
                }
            }
        }

        // Sort by EV descending
        return opportunities.sort((a, b) => b.ev - a.ev);
    }

    private static evaluateMarket(market: Market, signal: MarketSignal): TradeOpportunity | null {
        // Improved matching: Check for semantic relevance, not just keyword presence
        const marketQuestion = market.question.toLowerCase();
        const signalTopic = signal.marketTopic.toLowerCase();
        const signalHeadline = signal.headline.toLowerCase();

        // Check if topic appears in market question
        const topicMatch = marketQuestion.includes(signalTopic);

        // Check if any tickers appear in market question
        const tickerMatch = signal.relevantTickers.some(t => marketQuestion.includes(t.toLowerCase()));

        // Basic keyword match
        if (!topicMatch && !tickerMatch) return null;

        // STRICTER FILTER: Avoid false positives like "Fed" matching "Trump nominating himself as Fed chair"
        // Check if the signal headline keywords appear in the market question
        const headlineWords = signalHeadline.split(' ').filter(w => w.length > 4); // Only meaningful words
        const matchingWords = headlineWords.filter(word => marketQuestion.includes(word));
        const matchRatio = matchingWords.length / Math.max(headlineWords.length, 1);

        // Require at least 20% of headline words to appear in market question
        // OR require both topic AND ticker match (stronger signal)
        if (matchRatio < 0.2 && !(topicMatch && tickerMatch)) {
            logger.info(`⚠ Weak match: Signal "${signal.headline}" vs Market "${market.question}" (${(matchRatio * 100).toFixed(0)}% word overlap)`);
            return null;
        }

        // Calculate EV
        // AI Confidence is for the "Event happening" (which usually means YES outcome, or direction specific)
        // If direction is BULLISH, we assume YES for positive markets (price goes up) or... 
        // Wait, "BULLISH on Bitcoin" -> YES on "Will Bitcoin hit 100k?" or NO on "Will Bitcoin crash?"
        // This is complex. We need to align signal direction with market question.
        // For MVP: assume signal direction aligns with "YES" if Question is positive?
        // Let's trust "outcome" in signal? No, signal gives BULLISH/BEARISH.

        // Let's assume the LLM analysis aligns with the market question if we passed the market to LLM.
        // BUT we are doing search AFTER LLM.
        // So we have a mismatch risk: Signal "Bitcoin Bullish" vs Market "Will Bitcoin crash?"
        // We might need a 2nd LLM pass: "Given Signal X, and Market Question Y, which outcome matches?"
        // OR simpler: Only trade if market question seems to align with topic directly.

        // For V1: Let's assume we Buy YES if Bullish and NO if Bearish? 
        // Too risky.

        // ALTERNATIVE: AgentLoop does the validation. SignalProcessor just candidates?
        // The plan says "Signal Processor runs EV calc".

        // Let's implement a straightforward EV based on "Confidence" provided by AI,
        // assuming AI's confidence map to "Outcome YES".
        // To do this properly, we really need the LLM to look at the market question.
        // Refinement: SignalProcessor should maybe ask LLM "Does this market match the signal?"
        // Or we stick to strict keyword matching.

        // Let's return the opportunity with raw data, and let AgentLoop doing the final Decision (which calls LLM again with specific market context) decide the exact Outcome.
        // So here we just rank by "Potential".

        // Actually, the new loop design:
        // 1. News -> Signal
        // 2. Signal -> Search Markets
        // 3. Agent analyses SPECIFIC MARKET in `tick()` using full context.

        // So SignalProcessor just needs to find CANDIDATE markets.
        // It doesn't need to calculate perfect EV yet, just filter obviously bad ones (e.g. 0 volume).

        // STRICT FILTERING (Replicated from ActiveMarketScanner)
        const NOW = Date.now();
        const MIN_MS_TO_EXPIRY = 6 * 60 * 60 * 1000; // 6 Hours

        // 1. Time Check
        if (market.endDate) {
            const expiry = new Date(market.endDate).getTime();
            if (expiry - NOW < MIN_MS_TO_EXPIRY) {
                logger.info(`🚫 [Filter] Rejected Market "${market.question}": Expiring Soon`);
                return null;
            }
        }

        // 2. Odds Check (Avoid Resolved Markets)
        if (market.bestBid > 0.97 || market.bestAsk < 0.03) {
            logger.info(`🚫 [Filter] Rejected Market "${market.question}": Extreme Odds (${market.bestBid}/${market.bestAsk})`);
            return null;
        }

        if (market.volume24hr < 100) return null; // Filter dead markets

        return {
            market,
            signal,
            action: "BUY",
            outcome: "YES", // Placeholder, determined in final step
            confidence: signal.confidence,
            ev: 0 // Placeholder
        };
    }
}
