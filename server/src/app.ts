import cors from "cors";
import express from "express";
import bodyParser from "body-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

//routes
import { portfolioRouter } from "./routes/portfolio.routes.js";
import { agentRouter } from "./routes/agent.routes.js";
import { tradeRouter } from "./routes/trade.routes.js";
import { authRouter } from "./routes/auth.routes.js";
import { activitiesRouter } from "./endpoints/activities.js";
import { statsRouter } from "./endpoints/stats.js";
import userRouter from "./routes/user.routes.js";
import { riskRouter } from "./routes/risk.routes.js";
import { queueRouter } from "./routes/queue.routes.js";
import { marketRouter } from "./routes/market.routes.js";
import { logRouter } from "./routes/log.routes.js";

export const app = express();

// Security Middleware
app.use(helmet()); // Sets secure HTTP headers (XSS, no-sniff, etc.)

// Rate Limiting: Prevent brute-force and DOS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Limit each IP to 500 requests per window (approx 1 request every 2s on avg)
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
});
app.use(limiter);

// Middleware
app.use(express.json());    // Parse JSON request bodies

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [process.env.FRONTEND_DOMAIN || 'http://localhost:5173'];

const corsOptions = {
    origin: (origin: any, callback: any) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (isProduction) {
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        } else {
            // Dev: Allow all
            callback(null, true);
        }
    },
    credentials: true // Allow cookies/headers
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Simple health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.get("/", (req, res) => {
    res.send("✅ Server is running");
});


// API routes
app.use("/api/trade", tradeRouter);
app.use("/api/portfolio", portfolioRouter);
app.use("/api/risk", riskRouter);
app.use("/api/queue", queueRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/stats", statsRouter);
app.use("/api/markets", marketRouter);
app.use("/api/auth", authRouter);
app.use("/api/agents", agentRouter);
app.use("/api/user", userRouter);
app.use("/api/logs", logRouter);
