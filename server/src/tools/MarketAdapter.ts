
import { polymarketTool } from "./polymarket.js";
import { kalshiTool } from "./kalshi.js";
import { type MarketTool } from "../interfaces/MarketTool.js";
import * as dotenv from "dotenv";

dotenv.config();

export const getMarketTool = (): MarketTool => {
    const activeExchange = process.env.ACTIVE_EXCHANGE || "POLYMARKET";

    if (activeExchange.toUpperCase() === "KALSHI") {
        return kalshiTool;
    }

    return polymarketTool;
};
