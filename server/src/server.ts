import "dotenv/config";
import { app } from "./app.js";
import { redis } from "./config/redis.js"; // your Redis client
import { AgentWorker } from "./workers/AgentWorker.js";
import { PortfolioTracker } from './workers/PortfolioTracker.js';

import { logger } from "./config/logger.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
    try {
        // Redis is already connected via import
        logger.info("✅ Redis connected");

        const { prisma } = await import("./config/database.js");

        // 1. Restore Active Agents via Manager
        const { AgentManager } = await import("./agents/AgentManager.js");
        await AgentManager.restoreAgents();

        // 2. Start Agent Workers (General pool)
        // We can have a few workers handling the shared queue
        const workers = [new AgentWorker("worker_1", 3), new AgentWorker("worker_2", 3)];
        workers.forEach((w) => w.start());

        // 3. Schedule Log Cleanup (Daily at midnight)
        const { LogCleanupService } = await import("./services/LogCleanupService.js");

        // Run once on startup to clean old junk
        LogCleanupService.pruneOldLogs(7).catch(err => logger.error({ err }, "Initial log prune failed"));

        // Schedule daily check (86400000 ms)
        setInterval(() => {
            LogCleanupService.pruneOldLogs(7);
        }, 24 * 60 * 60 * 1000);

        // 4. Start Wallet Tracker Service (Background Sync)
        const { WalletTrackerService } = await import("./services/WalletTrackerService.js");
        WalletTrackerService.startTracking();

        // 5. Start Portfolio Tracker (Net Worth Snapshots)
        const portfolioTracker = new PortfolioTracker();
        portfolioTracker.start();


        // Start Express server
        app.listen(PORT, "0.0.0.0", () => {
            logger.info(`🚀 Server running on http://0.0.0.0:${PORT}`);
        });
    } catch (err) {
        logger.error("❌ Failed to start server: " + (err instanceof Error ? err.message : String(err)));
        process.exit(1);
    }
}

startServer();
