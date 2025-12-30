import { Router } from "express";
import { prisma } from "../config/database.js";

export const authRouter = Router();

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            res.status(400).json({ success: false, message: "Wallet address is required" });
            return;
        }

        // Upsert: Create if not exists, otherwise return existing
        const user = await prisma.user.upsert({
            where: { walletAddress: walletAddress },
            update: {}, // No updates needed on login for now
            create: {
                walletAddress: walletAddress,
                userName: `User-${walletAddress.slice(0, 6)}-${Date.now()}`, // Ensure uniqueness
            }
        });

        // Check if user has agents
        const agentCount = await prisma.agent.count({
            where: { userId: user.id }
        });

        if (agentCount === 0) {
            console.log(`[Auth] Seeding default agents for ${user.id}...`);
            const { generateSystemPrompt } = await import("../agents/prompts.js");

            const defaults = [
                { name: "Safe Agent", risk: "LOW" as const, sl: 20.0, tp: 100.0 },
                { name: "Standard Agent", risk: "MEDIUM" as const, sl: 30.0, tp: 200.0 },
                { name: "Risky Agent", risk: "HIGH" as const, sl: 50.0, tp: 500.0 }
            ];

            for (const def of defaults) {
                await prisma.agent.create({
                    data: {
                        userId: user.id,
                        name: def.name,
                        description: "Default Agent",
                        riskProfile: def.risk,
                        systemPrompt: generateSystemPrompt(def.name, "Default Agent", def.risk),
                        llmProvider: "OPENAI", // Default to OpenAI
                        llmModel: "gpt-4o-mini", // Cost efficient default
                        pollingInterval: 120, // 2 minutes
                        isActive: false,
                        stopLossPercent: def.sl,
                        takeProfitPercent: def.tp
                    }
                });
            }
        }

        res.json({ success: true, user });
    } catch (err) {
        console.error("Auth error:", err);
        res.status(500).json({ success: false, message: "Failed to authenticate user" });
    }
});
