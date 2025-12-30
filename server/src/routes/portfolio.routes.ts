import { Router } from "express";
import { PortfolioService } from "../services/PortfolioService.js";

export const portfolioRouter = Router();

// GET /api/portfolio/:userId
portfolioRouter.get("/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const positions = await PortfolioService.getAllUserPositions(userId);
        res.json({ success: true, positions });
    } catch (err) {
        console.error("Portfolio error:", err);
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
});

// GET /api/portfolio/balance/:userId
portfolioRouter.get("/balance/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const balance = await PortfolioService.getUserBalance(userId);
        res.json({ success: true, balance });
    } catch (err) {
        console.error("Balance error:", err);
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
});

// GET /api/portfolio/history/:userId?range=24h|1w|1m
portfolioRouter.get("/history/:userId", async (req, res) => {
    try {
        const userId = req.params.userId;
        const range = (req.query.range as '24h' | '1w' | '1m') || '24h';
        const history = await PortfolioService.getHistory(userId, range);
        res.json({ success: true, history });
    } catch (err) {
        console.error("History error:", err);
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
    }
});
