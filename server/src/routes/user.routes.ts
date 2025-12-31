import { Router, type Request, type Response } from "express";
import { prisma } from "../config/database.js";
import { logger } from "../config/logger.js";
import { ethers } from "ethers";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { withdrawSchema, updateSettingsSchema, importWalletSchema } from "../schemas/user.schemas.js";

const router = Router();

/**
 * GET /api/user/settings/:userId
 * Get user's risk limits and settings
 */
router.get("/settings/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                maxTradeAmount: true,
                maxMarketExposure: true,
                maxTotalExposure: true,
                tradeCooldownSeconds: true,
                scwAddress: true,
                scwOwnerPrivateKey: true // Need this to derive EOA
            },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Backward compatibility for Frontend:
        // If Proxy (scwAddress) exists, use it.
        // If NOT, derive the EOA (Bot Wallet) address so UI shows "Initialized".
        let displayAddress = user.scwAddress;
        if (!displayAddress && user.scwOwnerPrivateKey) {
            try {
                const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC_URL || "https://polygon-rpc.com");
                const wallet = new ethers.Wallet(user.scwOwnerPrivateKey, provider);
                displayAddress = wallet.address;
                // console.log("Derived EOA for UI:", displayAddress);
            } catch (err) {
                console.error("Failed to derive EOA for UI", err);
            }
        }

        res.json({
            ...user,
            scwOwnerPrivateKey: undefined, // Do not leak key
            proxyAddress: displayAddress
        });
    } catch (error: any) {
        logger.error({ error }, "Failed to fetch user settings");
        res.status(500).json({ error: "Failed to fetch settings" });
    }
});

/**
 * PUT /api/user/settings
 * Update user's risk limits
 */
router.put("/settings", requireAuth, validate(updateSettingsSchema), async (req: Request, res: Response) => {
    try {
        const { userId, maxTradeAmount, maxMarketExposure, maxTotalExposure, tradeCooldownSeconds } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const updateData: any = {};
        if (maxTradeAmount !== undefined) updateData.maxTradeAmount = parseFloat(maxTradeAmount);
        if (maxMarketExposure !== undefined) updateData.maxMarketExposure = parseFloat(maxMarketExposure);
        if (maxTotalExposure !== undefined) updateData.maxTotalExposure = parseFloat(maxTotalExposure);
        if (tradeCooldownSeconds !== undefined) updateData.tradeCooldownSeconds = parseInt(tradeCooldownSeconds);

        const updated = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                maxTradeAmount: true,
                maxMarketExposure: true,
                maxTotalExposure: true,
                tradeCooldownSeconds: true,
            },
        });

        logger.info({ userId, updateData }, "User settings updated");
        res.json(updated);
    } catch (error: any) {
        logger.error({ error }, "Failed to update user settings");
        res.status(500).json({ error: "Failed to update settings" });
    }
});

// Obsolete /proxy-wallet route removed (replaced by /proxy/create)

/**
 * PUT /api/user/credentials
 * Update user's derived API credentials (API Key, Secret, Passphrase)
 */
router.put("/credentials", async (req: Request, res: Response) => {
    try {
        const { userId, apiKey, apiSecret, apiPassphrase } = req.body;

        if (!userId || !apiKey || !apiSecret || !apiPassphrase) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                apiKey,
                apiSecret,
                apiPassphrase
            },
            select: {
                id: true,
                walletAddress: true
            }
        });

        logger.info({ userId }, "User API credentials updated");
        res.json({ success: true, message: "Credentials stored successfully" });
    } catch (error: any) {
        logger.error({ error }, "Failed to update user credentials");
        res.status(500).json({ error: "Failed to update credentials" });
    }
});

import { importProxyWallet, getProxyWallet, exportProxyWallet, withdrawFunds, syncDeposits } from "../controllers/proxy.controller.js";

/**
 * POST /api/user/proxy/import
 * Import an existing Proxy Wallet and Private Key
 */
router.post("/proxy/import", requireAuth, validate(importWalletSchema), importProxyWallet);

/**
 * POST /api/user/proxy/sync
 * Manually trigger a blockchain scan for deposits
 */
router.post("/proxy/sync", syncDeposits);

// ... [previous imports]

/**
 * GET /api/user/proxy
 * Get user's server-managed proxy wallet details
 */
router.get("/proxy", requireAuth, getProxyWallet);

/**
 * GET /api/user/proxy/export
 * Retrieve the decrypted proxy private key
 * CRITICAL: Protected by Admin Secret
 */
router.get("/proxy/export", requireAuth, exportProxyWallet);

/**
 * POST /api/user/proxy/withdraw
 * Withdraw funds from proxy to main wallet
 * CRITICAL: Protected by Admin Secret
 */
router.post("/proxy/withdraw", requireAuth, validate(withdrawSchema), withdrawFunds);

import { ActivityController } from "../controllers/activity.controller.js";

/**
 * GET /api/user/activity/:userId
 * Fetch wallet generic activity (deposits/withdrawals)
 */
router.get("/activity/:userId", ActivityController.getUserActivity);

/**
 * POST /api/user/activity/log
 * Manually log an activity (e.g. from frontend deposit)
 */
router.post("/activity/log", ActivityController.logActivity);

// Tracked Wallets Endpoints

/**
 * GET /api/user/tracked-wallets
 */
router.get("/tracked-wallets", async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId || typeof userId !== 'string') return res.status(400).json({ error: "userId required" });

        const wallets = await prisma.trackedWallet.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { address: true, name: true, id: true }
        });
        res.json({ success: true, wallets });
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch wallets" });
    }
});

/**
 * POST /api/user/tracked-wallets
 * Adds a new tracked wallet with optional name
 */
router.post("/tracked-wallets", async (req: Request, res: Response) => {
    try {
        const { userId, address, name } = req.body;
        if (!userId || !address) return res.status(400).json({ error: "Missing fields" });

        // Upsert to handle updates to name or existing check
        const wallet = await prisma.trackedWallet.upsert({
            where: {
                userId_address: {
                    userId,
                    address
                }
            },
            update: { name: name || null }, // Update name if provided
            create: {
                userId,
                address,
                name: name || null
            }
        });

        // Return updated list
        const wallets = await prisma.trackedWallet.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { address: true, name: true, id: true }
        });

        res.json({ success: true, wallets });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to add wallet" });
    }
});

/**
 * DELETE /api/user/tracked-wallets
 */
router.delete("/tracked-wallets", async (req: Request, res: Response) => {
    try {
        const { userId, address } = req.body;
        if (!userId || !address) return res.status(400).json({ error: "Missing fields" });

        await prisma.trackedWallet.deleteMany({
            where: {
                userId,
                address
            }
        });

        const wallets = await prisma.trackedWallet.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: { address: true, name: true, id: true }
        });
        res.json({ success: true, wallets });
    } catch (e) {
        res.status(500).json({ error: "Failed to remove wallet" });
    }
});

export default router;

