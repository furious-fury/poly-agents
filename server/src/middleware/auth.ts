import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminSecret = process.env.ADMIN_SECRET;

        // If no secret is configured on the server, we might fail-open or fail-closed.
        // For security, we MUST fail closed if not configured, or warn heavily.
        if (!adminSecret) {
            logger.error("CRITICAL: ADMIN_SECRET not set in server environment. Rejecting all protected requests.");
            return res.status(500).json({ error: "Server misconfiguration: Authentication not available" });
        }

        const clientSecret = req.headers['x-admin-secret'];

        if (!clientSecret || clientSecret !== adminSecret) {
            logger.warn({
                ip: req.ip,
                path: req.path
            }, "Unauthorized access attempt: Invalid or missing admin secret");
            return res.status(401).json({ error: "Unauthorized" });
        }

        next();
    } catch (error) {
        logger.error({ error }, "Auth middleware error");
        res.status(500).json({ error: "Internal auth error" });
    }
};
