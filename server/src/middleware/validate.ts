import type { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";

export const validate = (schema: z.ZodObject<any, any>) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error: any) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: (error as any).errors.map((e: any) => ({
                    path: e.path.join("."),
                    message: e.message,
                })),
            });
        }
        return res.status(500).json({ error: "Internal validation error" });
    }
};
