import { Side } from "../generated/prisma/client.js";
import { getMarketTool } from "../tools/MarketAdapter.js";
import { PortfolioService } from "./PortfolioService.js";

export interface TradeRequest {
    userId: string;
    agentId: string;
    marketId: string;
    marketQuestion?: string; // Added field
    outcome: string;
    amount: number;
    side: "BUY" | "SELL";
}

export const TradeService = {
    /**
     * Executes a trade and updates the user's portfolio
     */
    async executeAgentTrade(job: TradeRequest) {
        const { userId, agentId, marketId, marketQuestion, outcome, side, amount } = job;

        // Execute trade using Active Tool
        const tradeResult = await getMarketTool().place_trade({
            userId,
            agentId,
            marketId,
            outcome,
            amount,
            side,
        });

        // Fetch current market price (or fallback)
        const currentPrice = tradeResult.price ?? tradeResult.settlementPrice ?? 0;

        // Update user portfolio
        const updatedPosition = await PortfolioService.updatePosition(
            userId,
            agentId,
            marketId,
            side === "BUY" ? Side.BUY : Side.SELL,
            amount,           // THIS is the quantity
            tradeResult.price, // price executed
            currentPrice,     // current market price
            outcome,
            marketQuestion // Pass the title
        );

        return updatedPosition;
    },
};
