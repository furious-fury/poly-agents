
import { prisma } from "../../config/database.js";
import { PortfolioService } from "../PortfolioService.js";
import { AgentLog } from "../../models/AgentLog.js";
import { LLMRouter } from "../../llm/llm-router.js";
import { logger } from "../../config/logger.js";

interface positionExitDecision {
    shouldExit: boolean;
    reason: string;
    type: "STOP_LOSS" | "TAKE_PROFIT" | "SENTIMENT" | "NONE";
}

export class PositionManager {

    /**
     * Evaluate all active positions for a specific agent.
     * Returns a list of positions that should be closed.
     */
    static async evaluatePositions(agentId: string, userId: string): Promise<any[]> {
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent) return [];

        // Fetch active positions via Portfolio tool (polymarket API)
        // We use the PortfolioService to get the standardized format with PnL
        const positions = await PortfolioService.getAllUserPositions(userId);

        const actionsToTake = [];

        if (!positions) return []; // Return empty suggestions if fetch failed

        for (const position of positions) {
            // Filter: Only check positions managed by this agent? 
            // Currently, our DB 'Position' model tracks 'agentId', but the PortfolioService fetches *all* positions for the user from Polymarket.
            // Since on-chain positions don't have 'agentId' metadata, we assume the agent manages the whole portfolio OR we check our local DB to match marketIds.

            // For safety, let's strict check against local DB if possible, or just manage everything.
            // Let's assume for now the agent manages ALL positions for the user to keep it simple and powerful.

            const decision = await PositionManager.checkExitCondition(agent, position);

            if (decision.shouldExit) {
                logger.info(`🚨 Position Exit Signal: ${decision.type} for ${position.marketTitle} (${decision.reason})`);

                actionsToTake.push({
                    marketId: position.marketId, // Note: This might be asset ID, need to handle carefully in TradeService
                    marketQuestion: position.marketTitle,
                    outcome: position.outcome,
                    amount: position.shares, // Sell ALL
                    reason: decision.reason,
                    type: decision.type
                });
            }
        }

        return actionsToTake;
    }

    /**
     * Check if a single position meets exit criteria
     */
    private static async checkExitCondition(agent: any, position: any): Promise<positionExitDecision> {
        // 1. Hard Stops (PnL)
        // Recalculate PnL regarding Initial Value to avoid API ambiguity (decimal vs percent)
        let pnlPercent = 0;
        if (position.initialValue > 0) {
            // (Current - Initial) / Initial * 100
            pnlPercent = ((position.exposure - position.initialValue) / position.initialValue) * 100;
        } else {
            // Fallback if initial is 0 (e.g. air-drop or error), use API field cautiously
            pnlPercent = position.percentPnl * 100;
        }

        // logger.info(`🔍 [PositionManager] Check: ${position.marketTitle} | Init: $${position.initialValue} | Curr: $${position.exposure} | Calc PnL: ${pnlPercent.toFixed(2)}%`);

        // Stop Loss (e.g. -20%)
        // If PnL is -25%, it is LESS than -20%.
        if (pnlPercent < -(agent.stopLossPercent)) {
            return {
                shouldExit: true,
                reason: `Stop Loss Triggered: PnL ${pnlPercent.toFixed(2)}% < -${agent.stopLossPercent}%`,
                type: "STOP_LOSS"
            };
        }

        // Take Profit (e.g. +100%)
        if (pnlPercent > agent.takeProfitPercent) {
            return {
                shouldExit: true,
                reason: `Take Profit Triggered: PnL ${pnlPercent.toFixed(2)}% > +${agent.takeProfitPercent}%`,
                type: "TAKE_PROFIT"
            };
        }

        // 2. Sentiment Check (Optional / Future)
        // We can integrate NewsService here later using the "marketTitle" to search for negative news.

        return { shouldExit: false, reason: "", type: "NONE" };
    }
}
