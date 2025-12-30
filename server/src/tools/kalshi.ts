
import { type MarketTool, type Market, type Position, type Balance, type TradeParams, type TradeHistory } from "../interfaces/MarketTool.js";
import { prisma } from "../config/database.js";
import { SecurityService } from "../services/SecurityService.js";
import {
    Configuration,
    MarketApi,
    PortfolioApi,
    OrdersApi,
    type CreateOrderRequest,
    CreateOrderRequestActionEnum,
    CreateOrderRequestSideEnum,
    CreateOrderRequestTypeEnum,
    GetMarketsStatusEnum
} from "kalshi-typescript";

export class KalshiTool implements MarketTool {
    getName(): string {
        return "KALSHI";
    }

    private async getApis(userId: string) {
        // Cast select to any to bypass potential TS sync issues with new schema fields
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, kalshiApiKey: true, kalshiPrivateKey: true } as any
        });

        const safeUser = user as any;

        if (!safeUser || !safeUser.kalshiApiKey || !safeUser.kalshiPrivateKey) {
            throw new Error("Kalshi credentials not found for this user.");
        }

        const privateKeyPem = await SecurityService.decrypt(safeUser.kalshiPrivateKey, safeUser.id);

        const config = new Configuration({
            basePath: "https://api.elections.kalshi.com/trade-api/v2",
            apiKey: safeUser.kalshiApiKey,
            privateKeyPem: privateKeyPem
        });

        return {
            marketApi: new MarketApi(config),
            portfolioApi: new PortfolioApi(config),
            ordersApi: new OrdersApi(config)
        };
    }

    private async getAnyValidApis() {
        // Just find any user with keys to perform public lookups
        const user = await prisma.user.findFirst({
            where: { kalshiApiKey: { not: null } } as any
        });
        if (!user) throw new Error("No available Kalshi credentials in system.");
        return this.getApis(user.id);
    }

    async get_markets(limit: number = 20): Promise<Market[]> {
        try {
            const { marketApi } = await this.getAnyValidApis();
            const response = await marketApi.getMarkets(limit, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, GetMarketsStatusEnum.Open);

            return (response.data.markets || []).map((m: any) => ({
                id: m.ticker,
                question: m.title,
                outcome: "YES",
                bestBid: m.yes_bid ? m.yes_bid / 100 : 0,
                bestAsk: m.yes_ask ? m.yes_ask / 100 : 0,
                volume24hr: m.volume,
                questionId: m.event_ticker,
                conditionId: m.ticker,
                tokenIds: []
            }));
        } catch (error) {
            console.error("Kalshi get_markets error:", error);
            return [];
        }
    }

    async search_markets(query: string): Promise<Market[]> {
        try {
            const { marketApi } = await this.getAnyValidApis();
            const response = await marketApi.getMarkets(
                50,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                GetMarketsStatusEnum.Open
            );

            const all = response.data.markets || [];
            const lowerQ = query.toLowerCase();
            const filtered = all.filter((m: any) =>
                m.title.toLowerCase().includes(lowerQ) ||
                m.ticker.toLowerCase().includes(lowerQ)
            );

            return filtered.map((m: any) => ({
                id: m.ticker,
                question: m.title,
                outcome: "YES",
                bestBid: m.yes_bid ? m.yes_bid / 100 : 0,
                bestAsk: m.yes_ask ? m.yes_ask / 100 : 0,
                volume24hr: m.volume,
                questionId: m.event_ticker,
                conditionId: m.ticker,
                tokenIds: []
            }));
        } catch (error) {
            console.error("Kalshi search_markets error:", error);
            return [];
        }
    }

    async get_positions(userId: string): Promise<Position[] | null> {
        try {
            const { portfolioApi } = await this.getApis(userId);
            const response = await portfolioApi.getPositions();

            const positions: Position[] = [];

            for (const p of (response.data.market_positions || [])) {
                const netPosition = p.position;
                if (netPosition === 0) continue;

                // Derive values from available fields
                // 'total_traded' is cost basis (cents). 'market_exposure' is current value (cents).
                const absCount = Math.abs(netPosition);
                const totalTradedCents = p.total_traded;
                const marketExposureCents = p.market_exposure;
                const realizedPnlCents = p.realized_pnl;

                const avgPrice = absCount > 0 ? (Math.abs(totalTradedCents) / absCount) / 100 : 0;
                const curPrice = absCount > 0 ? (Math.abs(marketExposureCents) / absCount) / 100 : 0;

                positions.push({
                    id: p.ticker,
                    userId,
                    marketId: p.ticker,
                    marketTitle: p.ticker,
                    icon: "",
                    outcome: netPosition > 0 ? "YES" : "NO",
                    shares: absCount,
                    avgEntryPrice: avgPrice,
                    initialValue: Math.abs(totalTradedCents) / 100,
                    exposure: Math.abs(marketExposureCents) / 100,
                    pnl: realizedPnlCents / 100,
                    percentPnl: 0,
                    currentPrice: curPrice
                });
            }
            return positions;
        } catch (error) {
            console.error("Kalshi get_positions error:", error);
            return null;
        }
    }

    async get_balance(userId: string): Promise<Balance | null> {
        try {
            const { portfolioApi } = await this.getApis(userId);
            const response = await portfolioApi.getBalance();
            const bal = response.data.balance || 0;

            return {
                usdc: (bal / 100).toFixed(2),
                pol: "0",
                address: "KALSHI_ACCOUNT"
            };
        } catch (error) {
            console.error("Kalshi get_balance error:", error);
            return null;
        }
    }

    async place_trade(trade: TradeParams): Promise<{ status: string; txId: string; price: number; settlementPrice?: number }> {
        try {
            console.log(`[KALSHI] 🔵 REQUEST: ${trade.side} ${trade.amount} on ${trade.marketId}`);

            const { ordersApi } = await this.getApis(trade.userId);

            const side = trade.outcome.toUpperCase() === "NO" ? CreateOrderRequestSideEnum.No : CreateOrderRequestSideEnum.Yes;
            const action = trade.side.toUpperCase() === "SELL" ? CreateOrderRequestActionEnum.Sell : CreateOrderRequestActionEnum.Buy;

            let count = Math.floor(trade.amount);
            let priceCents = trade.price ? Math.floor(trade.price * 100) : 0;

            const orderReq: CreateOrderRequest = {
                ticker: trade.marketId,
                action: action,
                side: side,
                count: count,
                type: CreateOrderRequestTypeEnum.Limit,
                client_order_id: Math.random().toString(36).substring(7)
            };

            // Set specific price field based on side
            if (side === CreateOrderRequestSideEnum.Yes) {
                orderReq.yes_price = priceCents;
            } else {
                orderReq.no_price = priceCents;
            }

            const response = await ordersApi.createOrder(orderReq);
            // Access nested order object for ID
            const orderId = (response.data as any).order ? (response.data as any).order.order_id : "unknown";

            return {
                status: "FILLED",
                txId: orderId,
                price: priceCents / 100,
                settlementPrice: priceCents / 100
            };

        } catch (error: any) {
            console.error("Kalshi place_trade error:", error?.response?.data || error);
            throw error;
        }
    }

    async get_trades(userId: string): Promise<TradeHistory[]> {
        try {
            const { portfolioApi } = await this.getApis(userId);
            const response = await portfolioApi.getFills();

            return (response.data.fills || []).map((f: any) => ({
                id: f.trade_id,
                market: f.ticker,
                asset_id: f.ticker,
                side: f.action,
                size: f.count,
                price: f.price / 100,
                timestamp: Math.floor(new Date(f.created_time).getTime() / 1000),
                outcome: f.side,
                transactionHash: f.trade_id,
                icon: ""
            }));
        } catch (error) {
            console.error("Kalshi get_trades error:", error);
            return [];
        }
    }
}

export const kalshiTool = new KalshiTool();
