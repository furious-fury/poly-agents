import { prisma } from "../config/database.js";
import { Portfolio } from "../models/Portfolio.js";
import { Side } from "../generated/prisma/client.js";
import { getMarketTool } from "../tools/MarketAdapter.js";

export interface TradeRecord {
    userId: string;
    agentId: string;
    marketId: string;
    outcome: string;
    amount: number;
    side: "BUY" | "SELL";
    txId: string;
    price: number;
}

export class PortfolioService {
    // ... existing methods

    /**
     * Take a snapshot of the user's current portfolio value (Cash + Positions)
     */
    static async takeSnapshot(userId: string) {
        try {
            const [balanceObj, positions] = await Promise.all([
                PortfolioService.getUserBalance(userId),
                PortfolioService.getAllUserPositions(userId)
            ]);

            // Fix: Abort if data fetch failed to avoid recording false drops (spikes)
            if (!balanceObj || !positions) {
                console.warn(`[Snapshot] Aborted for ${userId} due to missing data (Network/RPC failure).`);
                return null;
            }

            const cashBalance = parseFloat(balanceObj.usdc || "0");
            const positionsValue = positions.reduce((sum: number, p: any) => sum + (p.exposure || 0), 0);
            const totalValue = cashBalance + positionsValue;

            await prisma.portfolioSnapshot.create({
                data: {
                    userId,
                    cashBalance,
                    positionsValue,
                    totalValue
                }
            });

            return { cashBalance, positionsValue, totalValue };
        } catch (error) {
            console.error("takeSnapshot failed:", error);
            return null;
        }
    }

    /**
     * Get portfolio history for chart
     */
    static async getHistory(userId: string, range: '24h' | '1w' | '1m' = '24h') {
        let since = new Date();
        switch (range) {
            case '24h':
                since.setHours(since.getHours() - 24);
                break;
            case '1w':
                since.setDate(since.getDate() - 7);
                break;
            case '1m':
                since.setDate(since.getDate() - 30);
                break;
        }

        // Fetch records within the timeframe
        // Increase limit to ensure we cover the full range even with frequent snapshots
        const rawHistory = await prisma.portfolioSnapshot.findMany({
            where: {
                userId,
                timestamp: { gte: since }
            },
            orderBy: { timestamp: 'desc' },
            take: 5000
        });

        // Restore chronological order (oldest -> newest)
        let history = rawHistory.reverse();

        // 1. Filter out known "bad data" artifacts (spurious drops to near-zero)
        history = history.filter(h => h.totalValue > 1.0);

        // 2. Downsample if too many points (Recharts performance)
        // Target ~500 points max
        if (history.length > 500) {
            const step = Math.ceil(history.length / 500);
            history = history.filter((_, index) => index % step === 0);
        }

        // Check if we need a new snapshot (Lazy Tracking) - Only trigger on '24h' view or if very stale
        const lastSnapshot = history[history.length - 1];
        const now = new Date();
        // If empty history OR last snapshot > 1 hour ago, take a new one
        const shouldSnapshot = !lastSnapshot || (now.getTime() - lastSnapshot.timestamp.getTime() > 60 * 60 * 1000);

        if (shouldSnapshot && range === '24h') {
            // Take snapshot in background (or await if we want fresh data immediately)
            console.log(`[PortfolioService] Lazy snapshot triggered for ${userId}`);
            const newSnap = await PortfolioService.takeSnapshot(userId);
            if (newSnap) {
                history.push({
                    id: "temp",
                    userId,
                    timestamp: now,
                    cashBalance: newSnap.cashBalance,
                    positionsValue: newSnap.positionsValue,
                    totalValue: newSnap.totalValue
                });
            }
        }

        return history.map(h => ({
            time: h.timestamp.toISOString(),
            value: h.totalValue
        }));
    }

    // ... existing methods
    /**
     * Update a user's position after a trade.
     * Returns the updated position including PnL calculation.
     */
    static async updatePosition(
        userId: string,
        agentId: string,
        marketId: string,
        side: Side,
        quantity: number,
        price: number,
        currentPrice: number,
        outcome: string,
        marketTitle?: string,
    ) {
        return await Portfolio.updatePositionAfterTrade(
            userId,
            agentId,
            marketId,
            side,
            quantity,
            price,
            currentPrice,
            outcome,
            marketTitle,
        );
    }

    /**
     * Save executed trade details for history/logging
     */
    static async saveTrade(trade: TradeRecord) {
        return await Portfolio.saveTrade(trade);
    }

    /**
     * Fetch current positions for a user or agent from Polymarket API
     */
    static async getAllUserPositions(userId: string) {
        // Fetch Normalized Positions from Active Tool
        return await getMarketTool().get_positions(userId);
    }

    /**
     * Fetch user balance (USDC & POL)
     */
    static async getUserBalance(userId: string) {
        return await getMarketTool().get_balance(userId);
    }

    /**
     * Fetch PnL for a specific market or overall
     */
    static async getPnL(userId: string, marketId?: string) {
        // ... (rest currently placeholder)
        return 0;
    }
}
