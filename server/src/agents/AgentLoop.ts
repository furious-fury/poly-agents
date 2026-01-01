import { PortfolioRedis, Portfolio } from "../models/Portfolio.js";
import { LLMRouter } from "../llm/llm-router.js";
import { logger } from "../config/logger.js";
import { get_markets } from "../tools/polymarket.js";
import { TruthOracle } from "../tools/truth-oracle.js";
import { prisma } from "../config/database.js";
import { AgentLog } from "../models/AgentLog.js";

interface AgentDecision {
    action: "TRADE" | "HOLD";
    marketId?: string;
    side?: "BUY" | "SELL";
    amount?: number;
    outcome?: "YES" | "NO";
    reason?: string;
}

export class AgentLoop {
    agentId: string;
    userId: string;
    running: boolean = false;
    isProcessing: boolean = false; // Lock to prevent concurrent ticks
    interval?: NodeJS.Timeout;

    constructor(agentId: string, userId: string) {
        this.agentId = agentId;
        this.userId = userId;
    }

    start(intervalMs: number = 120000) {
        if (this.running) return;
        this.running = true;

        // Run immediately first, then interval
        this.tick();

        this.interval = setInterval(() => this.tick(), intervalMs);
        logger.info(`🧠 AgentLoop started for ${this.agentId} (User: ${this.userId})`);
    }

    stop() {
        this.running = false;
        if (this.interval) clearInterval(this.interval);
        logger.info(`🧠 AgentLoop stopped for ${this.agentId}`);
    }

    private async tick() {
        // Skip if previous tick is still processing
        if (this.isProcessing) {
            logger.warn(`⚠️ Skipping tick for ${this.agentId} - previous tick still processing`);
            return;
        }

        this.isProcessing = true;

        try {
            // 1. Load Agent from DB (Fresh state every tick)
            const agent = await prisma.agent.findUnique({ where: { id: this.agentId } });

            if (!agent) {
                logger.warn(`Agent ${this.agentId} not found in DB. Stopping loop.`);
                this.stop();
                return;
            }

            // -----------------------------------------------------------------
            // 0. POSITION MANAGEMENT (Stop Loss / Take Profit) - Runs even if PAUSED
            // -----------------------------------------------------------------
            const { PositionManager } = await import("../services/analysis/PositionManager.js");
            const exitSignals = await PositionManager.evaluatePositions(this.agentId, this.userId);

            if (exitSignals.length > 0) {
                logger.info(`🚨 Found ${exitSignals.length} positions to exit.`);

                for (const signal of exitSignals) {
                    await this.executeExit(agent, signal);
                }
            }

            if (!agent.isActive) {
                logger.info(`Agent ${this.agentId} is PAUSED. Position checks complete, skipping new trades.`);
                return;
            }

            // -----------------------------------------------------------------
            // NEW: News-Driven Logic
            // -----------------------------------------------------------------

            // 2. Fetch & Preprocess News
            const { newsService } = await import("../services/news/NewsService.js");
            const { NewsPreprocessor } = await import("../services/news/NewsPreprocessor.js");

            const rawNews = await newsService.fetchAllNews();
            const cleanNews = await NewsPreprocessor.process(rawNews);

            if (cleanNews.length === 0) {
                logger.info("No relevant news found this tick.");
                return;
            }

            // Log Data Fetch with source breakdown
            const sourceBreakdown = rawNews.reduce((acc: Record<string, number>, item) => {
                acc[item.source] = (acc[item.source] || 0) + 1;
                return acc;
            }, {});

            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "DATA_FETCH",
                message: `Ingested ${cleanNews.length} news items from ${Object.keys(sourceBreakdown).length} sources.`,
                metadata: {
                    sourceCount: rawNews.length,
                    cleanCount: cleanNews.length,
                    topHeadline: cleanNews[0]?.title,
                    sources: sourceBreakdown
                }
            });

            // 3. Analyze News for Signals
            const { MarketIntelligence } = await import("../services/analysis/MarketIntelligence.js");
            const signals = await MarketIntelligence.analyze(cleanNews);

            // Log AI Analysis Results (all signals, even low confidence)
            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "ANALYSIS",
                message: signals.length > 0
                    ? `Agent detected ${signals.length} signal(s) from news analysis.`
                    : "Agent found no actionable signals in current news cycle.",
                metadata: {
                    totalSignals: signals.length,
                    signals: signals.map(s => ({
                        confidence: s.confidence,
                        direction: s.direction,
                        topic: s.marketTopic,
                        headline: s.headline,
                        reasoning: s.reasoning
                    }))
                }
            });

            if (signals.length === 0) {
                logger.info("News analyzed, but no high-confidence signals found. Will scan active markets instead.");
                // Don't return - continue to active market scanning
            }

            // 4. Find Market Opportunities from Signals
            const { SignalProcessor } = await import("../services/analysis/SignalProcessor.js");
            const opportunities = await SignalProcessor.processSignals(signals);

            if (opportunities.length === 0) {
                logger.info("Signals found, but no matching Polymarket markets available. Will scan active markets instead.");

                // Log the failed market search
                await AgentLog.create({
                    agentId: this.agentId,
                    userId: this.userId,
                    type: "ANALYSIS",
                    message: `Searched for markets matching ${signals.length} signal(s), but found no tradeable opportunities on Polymarket.`,
                    metadata: {
                        signalsDetected: signals.length,
                        searchedTopics: signals.map(s => s.marketTopic),
                        reason: "No matching prediction markets available",
                        signals: signals.map(s => ({
                            confidence: s.confidence,
                            direction: s.direction,
                            topic: s.marketTopic,
                            headline: s.headline,
                            reasoning: s.reasoning
                        }))
                    }
                });
                // Don't return - continue to active market scanning
            }

            // Log Discovery
            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "ANALYSIS",
                message: `Found ${opportunities.length} trade opportunities from news.`,
                metadata: {
                    totalSignals: signals.length,
                    totalOpportunities: opportunities.length,
                    signals: signals.map(s => ({
                        confidence: s.confidence,
                        direction: s.direction,
                        topic: s.marketTopic,
                        headline: s.headline,
                        reasoning: s.reasoning
                    })),
                    topOpp: opportunities[0]?.market.question
                }
            });

            // 5. ACTIVE MARKET SCANNING - Analyze 5 random markets from top 20
            logger.info("📊 Scanning active markets for trading opportunities...");
            let activeTradeOpps: any[] = [];

            try {
                const { ActiveMarketScanner } = await import("../services/analysis/ActiveMarketScanner.js");
                const activeMarketOpps = await ActiveMarketScanner.scanActiveMarkets(
                    agent.systemPrompt,
                    agent.llmProvider,
                    agent.llmModel || undefined,
                    agent.riskProfile, // Pass risk profile for aggressive trading
                    50
                );

                // Convert active market opportunities to TradeOpportunity format
                activeTradeOpps = activeMarketOpps
                    .filter(opp => opp.action === "TRADE")
                    .map(opp => {
                        const direction: "BULLISH" | "BEARISH" | "NEUTRAL" = opp.side === "BUY" ? "BULLISH" : "BEARISH";
                        return {
                            market: opp.market,
                            signal: {
                                headline: `Market Analysis: ${opp.market.question}`,
                                confidence: opp.confidence,
                                direction: direction,
                                marketTopic: "Active Market",
                                reasoning: opp.reasoning,
                                relevantTickers: []
                            },
                            action: (opp.side || "BUY") as "BUY" | "SELL",
                            outcome: (opp.outcome || "YES") as "YES" | "NO",
                            confidence: opp.confidence,
                            ev: opp.ev
                        };
                    });

                logger.info(`📊 Active market scan complete: ${activeTradeOpps.length} tradeable opportunities found`);

            } catch (error: any) {
                logger.error({ error }, `❌ Active market scanning failed: ${error.message}`);
                activeTradeOpps = []; // Continue with empty array
            }

            // Log active market scanning results
            logger.info(`📊 About to create ANALYSIS log for ${activeTradeOpps.length} opportunities`);

            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "ANALYSIS",
                message: `Scanned 5 active markets, found ${activeTradeOpps.length} tradeable opportunities.`,
                metadata: {
                    strategy: "Active Market Scan",
                    marketsAnalyzed: 5,
                    tradeableOpportunities: activeTradeOpps.length,
                    opportunities: activeTradeOpps.map(opp => ({
                        market: opp.market.question,
                        confidence: opp.confidence,
                        action: opp.action,
                        outcome: opp.outcome,
                        reasoning: opp.signal.reasoning,
                        ev: opp.ev
                    }))
                }
            });

            logger.info(`📊 ANALYSIS log created successfully`);

            // 6. Merge opportunities from both strategies
            const allOpportunities = [...opportunities, ...activeTradeOpps];
            allOpportunities.sort((a, b) => b.ev - a.ev);

            logger.info(`📊 Total opportunities: ${allOpportunities.length} (${opportunities.length} news + ${activeTradeOpps.length} active market)`);

            if (allOpportunities.length === 0) {
                logger.info("No tradeable opportunities found from either strategy.");
                return;
            }

            // 7. Select Best Opportunity
            const bestOpp = allOpportunities[0];
            if (!bestOpp) return;

            const strategy = opportunities.includes(bestOpp) ? "News-Driven" : "Active Market";
            logger.info(`🎯 Best opportunity from ${strategy} strategy`);

            const market = bestOpp.market;

            // Log strategy selection
            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "ANALYSIS",
                message: `Selected best opportunity from ${strategy} strategy: "${market.question}"`,
                metadata: {
                    strategy: strategy,
                    totalOpportunities: allOpportunities.length,
                    newsOpportunities: opportunities.length,
                    activeMarketOpportunities: activeTradeOpps.length,
                    selectedMarket: market.question,
                    confidence: bestOpp.confidence,
                    ev: bestOpp.ev
                }
            });

            logger.info(`🎯 Targeting Market: "${market.question}" based on signal: "${bestOpp.signal.headline}"`);

            // 6. Final Decision Logic (Re-using context builder)
            // Get User Stats - Use LIVE balance from Polymarket, not stale DB balance
            const exposure = await Portfolio.getUserExposure(this.userId);
            const user = await prisma.user.findUnique({
                where: { id: this.userId },
                select: { maxTradeAmount: true, maxTotalExposure: true, balance: true }
            });

            // Fetch live balance from Polymarket
            const { PortfolioService } = await import("../services/PortfolioService.js");
            const liveBalanceObj = await PortfolioService.getUserBalance(this.userId);
            if (!liveBalanceObj) {
                console.warn(`[AgentLoop] Failed to fetch balance for user ${this.userId}, assuming 0 for now.`);
            }
            const liveBalance = parseFloat(liveBalanceObj?.usdc || "0");

            logger.info(`💰 Live Balance: $${liveBalance} (DB shows: $${user?.balance || 0})`);

            const currentExposure = exposure.exposure * liveBalance;
            const maxBudget = user?.maxTotalExposure || 100;

            // Check budget before expensive LLM call
            if (currentExposure >= maxBudget) {
                logger.warn("Max exposure reached. Skipping trade.");
                await AgentLog.create({
                    agentId: this.agentId,
                    userId: this.userId,
                    type: "RISK_BLOCK",
                    message: `Maximum exposure limit reached ($${currentExposure.toFixed(2)} / $${maxBudget}). Trade blocked.`,
                    metadata: { currentExposure, maxBudget, market: market.question }
                });
                return;
            }

            // Log that we're proceeding with decision-making
            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "DECISION",
                message: `Evaluating trade for market: "${market.question}"`,
                metadata: {
                    marketId: market.id,
                    signal: bestOpp.signal.headline,
                    confidence: bestOpp.signal.confidence,
                    direction: bestOpp.signal.direction,
                    currentExposure: currentExposure.toFixed(2),
                    availableBudget: (maxBudget - currentExposure).toFixed(2),
                    liveBalance: liveBalance.toFixed(2)
                }
            });

            // Construct Prompt for Final Decision (Validate Signal vs Market)
            const provider = LLMRouter.getProvider(agent.llmProvider, agent.llmModel || undefined);

            const decisionPrompt = `
            MARKET: "${market.question}" (ID: ${market.id})
            PRICES: YES=${market.bestBid}, NO=${market.bestAsk}
            
            NEWS SIGNAL: "${bestOpp.signal.headline}" (Confidence: ${bestOpp.signal.confidence}%)
            REASONING: ${bestOpp.signal.reasoning}
            DIRECTION: ${bestOpp.signal.direction}

            PORTFOLIO:
            - Balance: $${liveBalance}
            - Max Trade: $${user?.maxTradeAmount}

            AGENT PROFILE:
            - Name: ${agent.name}
            - Risk Appetite: ${agent.riskProfile}
            
            RISK GUIDELINES:
            - LOW (Conservative): Only trade if Signal Confidence > 85%. Avoid uncertain markets.
            - MEDIUM (Balanced): Trade if Signal Confidence > 70%.
            - HIGH (Aggressive): Trade if Signal Confidence > 55%.
            - DEGEN (High Risk): Trade if Signal Confidence > 30%. YOLO allowed.

            TASK:
            Decide if we should trade this market based on the news signal.
            Verify if the "Signal Direction" aligns with the "Market Question".
            Example: Signal "Bitcoin Bullish" + Market "Will BTC hit 100k?" -> YES.
            Example: Signal "Bitcoin Bullish" + Market "Will BTC crash?" -> NO.

            IMPORTANT CONSTRAINTS:
            - Your trade amount MUST be between $1 and $${Math.min(liveBalance, user?.maxTradeAmount || 100)}
            - You have $${liveBalance} available balance
            - Maximum single trade is $${user?.maxTradeAmount || 100}
            - DO NOT suggest amounts higher than these limits

            OUTPUT JSON:
            { "action": "TRADE" | "HOLD", "side": "BUY", "outcome": "YES" | "NO", "amount": number, "reason": "string" }
            `;

            const response = await provider.generateResponse(agent.systemPrompt + "\n" + decisionPrompt, "Make a decision.");
            if (!response) return;

            const jsonStr = response.replace(/```json/g, "").replace(/```/g, "").trim();
            const decision: AgentDecision = JSON.parse(jsonStr);

            // ... (Rest of execution logic is same) ...

            await this.executeDecision(agent, decision, market, currentExposure);

        } catch (err) {
            logger.error({ err }, `❌ Error in AgentLoop for ${this.agentId}`);
        } finally {
            this.isProcessing = false;
        }
    }

    // Helper to keep tick() clean
    private async executeDecision(agent: any, decision: AgentDecision, market: any, currentExposure: number) {
        // Log Decision
        const marketQuestion = `"${market.question}"`;
        const amountStr = decision.amount ? `$${decision.amount}` : "default amount";

        await AgentLog.create({
            agentId: this.agentId,
            userId: this.userId,
            type: "DECISION",
            message: decision.action === "TRADE"
                ? `Decided to ${decision.side} ${decision.outcome} (${amountStr}) on ${marketQuestion}`
                : `Holding: ${decision.reason}`,
            metadata: { decision, marketQuestion }
        });

        // 5. Act
        if (decision.action === "TRADE" && decision.marketId || decision.action === "TRADE") { // marketId might come from context
            // Fix: decision might not have marketId if prompt didn't ask for it specifically because we gave it ONE market.
            // So we use 'market.id'

            logger.info(`💡 ${agent.name} decides to TRADE: ${decision.side} ${decision.outcome} (${amountStr}) on ${marketQuestion}`);

            const tradeAmount = decision.amount || 10;

            // ** RISK CHECK **
            const { RiskManager } = await import("../services/RiskManager.js");
            const riskCheck = await RiskManager.validateTrade({
                userId: this.userId,
                marketId: market.id,
                amount: tradeAmount,
            });

            if (!riskCheck.allowed) {
                logger.warn(`🚫 Trade blocked by risk manager: ${riskCheck.reason}`);
                await AgentLog.create({
                    agentId: this.agentId,
                    userId: this.userId,
                    type: "RISK_BLOCK",
                    message: `Risk Block: ${riskCheck.reason}`,
                    metadata: { trade: decision, riskCheck }
                });
                return;
            }

            // Log Successful Risk Assessment
            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "RISK_ASSESSMENT",
                message: "Risk checks passed. Trade approved.",
                metadata: {
                    check: "PASSED",
                    tradeAmount,
                    exposure: currentExposure
                }
            });


            // Execute trade directly (no queue)
            const { TradeService } = await import("../services/TradeService.js");

            try {
                const tradeRequest = {
                    userId: this.userId,
                    agentId: this.agentId,
                    marketId: market.id,
                    marketQuestion: market.question,
                    outcome: decision.outcome || "YES",
                    amount: tradeAmount,
                    side: decision.side || "BUY",
                };

                logger.info(`� Executing trade: ${decision.side} ${decision.outcome} ($${tradeAmount}) on "${market.question}"`);

                const result = await TradeService.executeAgentTrade(tradeRequest);

                // Record trade for cooldown tracking
                const { RiskManager } = await import("../services/RiskManager.js");
                await RiskManager.recordTrade(this.userId);

                logger.info(`✅ Trade executed successfully: ${JSON.stringify(result)}`);

                // Log successful trade execution
                await AgentLog.create({
                    agentId: this.agentId,
                    userId: this.userId,
                    type: "TRADE",
                    message: `🚀 Trade executed: ${decision.side} ${decision.outcome} ($${tradeAmount}) on "${market.question}"`,
                    metadata: {
                        status: "EXECUTED",
                        marketId: market.id,
                        marketQuestion: market.question,
                        side: decision.side,
                        outcome: decision.outcome,
                        amount: tradeAmount,
                        result: result
                    }
                });

            } catch (error: any) {
                logger.error({ error }, `❌ Trade execution failed: ${error.message}`);

                // Log failed trade
                await AgentLog.create({
                    agentId: this.agentId,
                    userId: this.userId,
                    type: "RISK_BLOCK",
                    message: `Trade execution failed: ${error.message}`,
                    metadata: {
                        status: "FAILED",
                        marketId: market.id,
                        error: error.message
                    }
                });
            }
        } else {
            logger.info(`💤 ${agent.name} decides to HOLD. Reason: ${decision.reason}`);
        }

    }

    // Helper to execute forced exits (Stop Loss / Take Profit)
    private async executeExit(agent: any, signal: any) {
        try {
            logger.info(`📉 Executing Forced Exit: ${signal.marketQuestion} (${signal.type})`);

            // Log intention
            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "DECISION", // Or new type RISK_EXIT
                message: `Triggered ${signal.type}: Selling ${signal.amount} shares of "${signal.marketQuestion}". Reason: ${signal.reason}`,
                metadata: { signal }
            });

            const { TradeService } = await import("../services/TradeService.js");

            // Execute Trade
            const tradeRequest = {
                userId: this.userId,
                agentId: this.agentId,
                marketId: signal.marketId, // Note: PositionManager returns asset/condition ID usually
                marketQuestion: signal.marketQuestion,
                outcome: signal.outcome,
                amount: signal.amount, // Full size
                side: "SELL" as "SELL",
            };

            const result = await TradeService.executeAgentTrade(tradeRequest);

            // Log Success
            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "TRADE",
                message: `✅ EXIT SUCCESSFUL: Sold position in "${signal.marketQuestion}"`,
                metadata: { result, type: signal.type, reason: signal.reason }
            });

        } catch (error: any) {
            logger.error({ error }, `❌ Failed to execute exit for ${signal.marketQuestion}`);
            await AgentLog.create({
                agentId: this.agentId,
                userId: this.userId,
                type: "RISK_BLOCK", // Using RISK_BLOCK for errors for now
                message: `Failed to execute forced exit: ${error.message}`,
                metadata: { error: error.message, signal }
            });
        }
    }

} // end of class
