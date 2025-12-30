import { Router } from "express";
import { TradeService, type TradeRequest } from "../services/TradeService.js";
import { prisma } from "../config/database.js";

export const tradeRouter = Router();

// POST /api/trade/agent
tradeRouter.post("/agent", async (req, res) => {
    try {
        const tradeRequest: TradeRequest = req.body;
        const result = await TradeService.executeAgentTrade(tradeRequest);
        res.json({ success: true, result });
    } catch (err) {
        console.error("Trade error:", err);
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
});
// GET /api/trade/history/:userId
tradeRouter.get("/history/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const { get_trades } = await import("../tools/polymarket.js");

        const trades = await get_trades(userId);
        res.json({ success: true, trades });
    } catch (err) {
        console.error("Trade history error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch trade history" });
    }
});
// GET /api/trade/history-address/:address
tradeRouter.get("/history-address/:address", async (req, res) => {
    try {
        const address = req.params.address;

        // Try Cache First
        const cached = await prisma.trackedWallet.findFirst({
            where: { address },
            select: { cachedTrades: true, lastUpdated: true }
        });

        if (cached?.cachedTrades && cached.lastUpdated && (Date.now() - cached.lastUpdated.getTime() < 120000)) {
            // console.log(`[API] Serving cached trades for ${address}`);
            return res.json({ success: true, trades: cached.cachedTrades });
        }

        const { get_trades_by_address } = await import("../tools/polymarket.js");

        const trades = await get_trades_by_address(address);

        // Update cache implicitly? No, let service handle or update here if we are nice.
        // Let's update here to "heal" the cache on miss
        if (trades.length > 0) {
            try {
                // Try to update existing first (works for global OR user-specific if address is unique enough or we just update any)
                // Actually, without ID we can't easily target. But we know address.
                // If it's a global wallet, it has no userid.

                // Strategy: Find first, then update. If not found, create global.
                const existing = await prisma.trackedWallet.findFirst({
                    where: { address }
                });

                if (existing) {
                    await prisma.trackedWallet.update({
                        where: { id: existing.id },
                        data: { cachedTrades: trades as any, lastUpdated: new Date() }
                    });
                } else {
                    await prisma.trackedWallet.create({
                        data: {
                            address,
                            cachedTrades: trades as any,
                            lastUpdated: new Date()
                        }
                    });
                }
            } catch (e) {
                console.error("Failed to update trade cache", e);
            }
        }

        res.json({ success: true, trades });
    } catch (err) {
        console.error("Address history error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch address history" });
    }
});
// GET /api/trade/positions-address/:address
tradeRouter.get("/positions-address/:address", async (req, res) => {
    try {
        const address = req.params.address;
        const CACHE_TTL = 10 * 60 * 1000; // 10 Minutes

        // 1. Try Cache First
        const cached = await prisma.trackedWallet.findFirst({
            where: { address },
            select: { cachedPositions: true, lastUpdated: true }
        });

        // 2. Define Refresh Logic (Background)
        const refreshCache = async () => {
            try {
                const { get_positions_by_address } = await import("../tools/polymarket.js");
                const positions = await get_positions_by_address(address);
                if (positions.length > 0) {
                    // Upsert to handle if it didn't exist
                    // Check existing
                    const existing = await prisma.trackedWallet.findFirst({ where: { address } });

                    if (existing) {
                        await prisma.trackedWallet.update({
                            where: { id: existing.id },
                            data: { cachedPositions: positions as any, lastUpdated: new Date() }
                        });
                    } else {
                        await prisma.trackedWallet.create({
                            data: {
                                address,
                                cachedPositions: positions as any,
                                lastUpdated: new Date()
                            }
                        });
                    }
                }
            } catch (e) { console.error(`[Background Refresh] Failed for ${address}`, e); }
        };

        // 3. Serve Cache Logic
        if (cached?.cachedPositions) {
            const age = cached.lastUpdated ? Date.now() - cached.lastUpdated.getTime() : Infinity;

            if (age < CACHE_TTL) {
                // Fresh enough: Serve and do nothing
                return res.json({ success: true, positions: cached.cachedPositions });
            } else {
                // Stale: Serve cached data immediately, then refresh in background
                res.json({ success: true, positions: cached.cachedPositions });
                // Trigger background refresh (fire and forget)
                refreshCache();
                return;
            }
        }

        // 4. No Cache: Must wait for fetch
        const { get_positions_by_address } = await import("../tools/polymarket.js");
        const positions = await get_positions_by_address(address);

        // Save to cache for next time
        if (positions.length > 0) {
            // Check existing
            const existing = await prisma.trackedWallet.findFirst({ where: { address } });

            if (existing) {
                await prisma.trackedWallet.update({
                    where: { id: existing.id },
                    data: { cachedPositions: positions as any, lastUpdated: new Date() }
                });
            } else {
                await prisma.trackedWallet.create({
                    data: {
                        address,
                        cachedPositions: positions as any,
                        lastUpdated: new Date()
                    }
                });
            }
        }
        res.json({ success: true, positions });

    } catch (err) {
        console.error("Address positions error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch address positions" });
    }
});
// POST /api/trade/close
tradeRouter.post("/close", async (req, res) => {
    try {
        const { userId, marketId, outcome } = req.body;

        // Lazy import
        const { close_position, get_positions } = await import("../tools/polymarket.js");

        // We need the full position object (shares, currentPrice) for the new close_position logic
        // Try to fetch it from the user's current positions
        const positions = await get_positions(userId);
        if (!positions) {
            throw new Error("Failed to fetch positions (API/RPC Error)");
        }
        const targetPosition = positions.find((p: any) =>
            (p.marketId === marketId || p.asset_id === marketId) && p.outcome === outcome
        );

        if (!targetPosition) {
            throw new Error("Position not found or already closed");
        }

        const result = await close_position(userId, targetPosition);
        res.json({ success: true, result });
    } catch (err) {
        console.error("Close trade error:", err);
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to close position" });
    }
});
