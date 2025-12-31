import { z } from "zod";

export const withdrawSchema = z.object({
    body: z.object({
        userId: z.string().min(1, "UserId is required"),
        amount: z.number().positive("Amount must be positive"),
        currency: z.enum(["USDC", "POL", "MATIC"]).optional(),
    }),
});

export const updateSettingsSchema = z.object({
    body: z.object({
        userId: z.string().min(1, "UserId is required"),
        maxTradeAmount: z.number().positive().optional(),
        maxMarketExposure: z.number().positive().optional(),
        maxTotalExposure: z.number().positive().optional(),
        tradeCooldownSeconds: z.number().int().nonnegative().optional(),
    }),
});

export const importWalletSchema = z.object({
    body: z.object({
        userId: z.string().min(1),
        privateKey: z.string().length(66, "Private key must be 66 chars (including 0x)"), // specific to ethers / viem export
        proxyAddress: z.string().length(42, "Invalid address length"),
    }),
});
