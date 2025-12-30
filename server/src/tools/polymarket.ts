
import { ethers } from "ethers";
import { prisma } from "../config/database.js";
import fetch from "node-fetch"; // Use node-fetch for proxy support
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import { SecurityService } from "../services/SecurityService.js";
import { type MarketTool, type Position, type Balance, type TradeHistory, type Market, type TradeParams } from "../interfaces/MarketTool.js";
export { type Market, type TradeParams };
import { ClobClient, AssetType } from "@polymarket/clob-client";
import WebSocket from 'ws';

// Configure Proxy if available
const proxyUrl = process.env.POLY_PROXY_URL;
const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

if (proxyUrl && agent) {
    console.log(`[PROXY] 🛡️ Using Residential Proxy: ${proxyUrl.replace(/:[^:]*@/, ":***@")}`);
    const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    const applyInterceptors = (instance: any) => {
        instance.interceptors.request.use((config: any) => {
            if (!config.headers) config.headers = {};
            if (config.headers.set && typeof config.headers.set === 'function') {
                config.headers.set('User-Agent', CHROME_UA);
            } else {
                config.headers['User-Agent'] = CHROME_UA;
                config.headers['user-agent'] = CHROME_UA;
            }
            return config;
        });
    };

    axios.defaults.httpsAgent = agent;
    axios.defaults.proxy = false;
    applyInterceptors(axios);

    const originalCreate = axios.create;
    axios.create = function (config) {
        const newConfig = { ...config };
        newConfig.httpsAgent = agent;
        newConfig.proxy = false;
        const instance = originalCreate.call(this, newConfig);
        applyInterceptors(instance);
        return instance;
    };
}

const GAMMA_API_URL = "https://gamma-api.polymarket.com";

// Helper: Get robust provider with fallback (Singleton)
let cachedProvider: ethers.providers.FallbackProvider | null = null;

const getMultiProvider = () => {
    if (cachedProvider) return cachedProvider;

    const primaryUrl = process.env.POLYGON_RPC_URL;
    const fallbacks = [
        "https://polygon.drpc.org",
        "https://rpc.ankr.com/polygon",
        "https://polygon-bor.publicnode.com",
        "https://1rpc.io/matic"
    ];

    const providers: ethers.providers.FallbackProviderConfig[] = [];

    // Add primary if it exists
    if (primaryUrl && !fallbacks.includes(primaryUrl)) {
        providers.push({
            provider: new ethers.providers.StaticJsonRpcProvider(primaryUrl, 137), // Explicit ChainId 137
            priority: 1,
            weight: 2
        });
    }

    // Add fallbacks
    fallbacks.forEach((url, i) => {
        try {
            // StaticJsonRpcProvider skips the 'detectNetwork' call which causes the 'noNetwork' error
            const p = new ethers.providers.StaticJsonRpcProvider(url, 137);
            providers.push({
                provider: p,
                priority: 2 + i,
                weight: 1
            });
        } catch (e) { }
    });

    if (providers.length === 0) {
        // Ultimate fallback if everything else fails
        providers.push({
            provider: new ethers.providers.StaticJsonRpcProvider("https://polygon-rpc.com", 137),
            priority: 10,
            weight: 1
        });
    }

    cachedProvider = new ethers.providers.FallbackProvider(providers, 1);
    return cachedProvider;
};

// Store original Date.now ONCE to prevent stacking offsets
const ORIGINAL_DATE_NOW = Date.now.bind(Date);

// Helper: Sync time with Polymarket using SDK method
const syncTimeWithSDK = async (client: any) => {
    try {
        console.log("[TIME] ⏳ Syncing time with Clob SDK...");
        const serverTimeSec = await client.getServerTime();
        const serverTimeMs = serverTimeSec * 1000;
        const now = ORIGINAL_DATE_NOW();
        const offset = serverTimeMs - now;

        console.log(`[TIME] 📥 Server Time: ${serverTimeSec} | Local: ${Math.floor(now / 1000)}`);
        console.log(`[TIME] ⏱️ Offset: ${offset}ms`);

        if (Math.abs(offset) > 5000) {
            console.log(`[TIME] ⚠️ Adjusting local clock by ${offset}ms`);
            const OriginalDate = Date;
            // @ts-ignore
            global.Date = class extends OriginalDate {
                constructor(...args: any[]) {
                    if (args.length === 0) {
                        super(ORIGINAL_DATE_NOW() + offset);
                    } else {
                        // @ts-ignore
                        super(...args);
                    }
                }
                static now() { return ORIGINAL_DATE_NOW() + offset; }
                static parse(s: string) { return OriginalDate.parse(s); }
                // @ts-ignore
                static UTC(...args: any[]) { return OriginalDate.UTC(...args); }
            };
            console.log(`[TIME] ✅ Clock patched (Deep). New Time: ${new Date().toISOString()}`);
        } else {
            console.log(`[TIME] ✅ Time sync OK (offset < 5s)`);
        }
    } catch (e: any) {
        console.warn("[TIME] SDK sync failed, falling back to manual:", e.message);
        try {
            const response = await fetch("https://clob.polymarket.com/time", { agent });
            if (response.ok) {
                const text = await response.text();
                const serverTimeSec = parseInt(text.replace(/"/g, '').trim());
                if (!isNaN(serverTimeSec)) {
                    const offset = (serverTimeSec * 1000) - ORIGINAL_DATE_NOW();
                    if (Math.abs(offset) > 5000) {
                        Date.now = () => ORIGINAL_DATE_NOW() + offset;
                        console.log(`[TIME] ✅ Manual sync complete. Offset: ${offset}ms`);
                    }
                }
            }
        } catch (fallbackError: any) {
            console.warn("[TIME] Manual sync also failed:", fallbackError.message);
        }
    }
};

// Helper: Fetch real-time price via WebSocket
const getPriceViaWS = (tokenId: string, side: "BUY" | "SELL"): Promise<number | null> => {
    const WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
    return new Promise((resolve) => {
        const ws = new WebSocket(WS_URL);
        const timeout = setTimeout(() => {
            ws.terminate();
            console.warn(`[WS] Timeout fetching price for ${tokenId}`);
            resolve(null);
        }, 3000);

        ws.on('open', () => {
            ws.send(JSON.stringify({ assets_ids: [tokenId], type: "market" }));
        });

        ws.on('message', (data: any) => {
            try {
                const msg = JSON.parse(data.toString());
                const updates = Array.isArray(msg) ? msg : [msg];
                for (const update of updates) {
                    if (update.event_type === "book" && update.asset_id === tokenId) {
                        if (side === "BUY" && update.asks?.length > 0) {
                            const best = update.asks.reduce((p: any, c: any) => parseFloat(c.price) < parseFloat(p.price) ? c : p);
                            clearTimeout(timeout);
                            ws.close();
                            resolve(parseFloat(best.price));
                            return;
                        } else if (side === "SELL" && update.bids?.length > 0) {
                            const best = update.bids.reduce((p: any, c: any) => parseFloat(c.price) > parseFloat(p.price) ? c : p);
                            clearTimeout(timeout);
                            ws.close();
                            resolve(parseFloat(best.price));
                            return;
                        }
                    }
                }
            } catch (e) { }
        });

        ws.on('error', () => { clearTimeout(timeout); resolve(null); });
    });
};

export class PolymarketTool implements MarketTool {
    getName(): string {
        return "POLYMARKET";
    }

    async get_events(limit: number = 20): Promise<any[]> {
        try {
            const response = await fetch(`${GAMMA_API_URL}/events?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`, { agent });
            if (!response.ok) throw new Error("Failed to fetch events");
            const data: any = await response.json();
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error("get_events error:", error);
            return [];
        }
    }

    async get_markets(limit: number = 20): Promise<Market[]> {
        try {
            const response = await fetch(`${GAMMA_API_URL}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`, { agent });
            if (!response.ok) throw new Error("Failed to fetch markets");
            const data: any = await response.json();
            return data.map((m: any) => ({
                id: m.id,
                question: m.question,
                outcome: "Yes",
                bestBid: m.bestBid,
                bestAsk: m.bestAsk,
                volume24hr: m.volume24hr,
                questionId: m.questionID,
                conditionId: m.conditionId,
                tokenIds: m.clobTokenIds
            }));
        } catch (error) {
            console.error("get_markets error:", error);
            return [];
        }
    }

    async search_markets(query: string): Promise<Market[]> {
        try {
            const encoded = encodeURIComponent(query);
            const response = await fetch(`${GAMMA_API_URL}/markets?active=true&closed=false&question=${encoded}&limit=10&order=volume24hr&ascending=false`, { agent });

            if (!response.ok) return [];
            const data: any = await response.json();

            return data.map((m: any) => ({
                id: m.id,
                question: m.question,
                outcome: "Yes",
                bestBid: m.bestBid,
                bestAsk: m.bestAsk,
                volume24hr: m.volume24hr,
                questionId: m.questionID,
                conditionId: m.conditionId,
                tokenIds: m.clobTokenIds
            }));
        } catch (error) {
            console.error("search_markets error:", error);
            return [];
        }
    }

    async get_positions(userId: string): Promise<Position[] | null> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { scwAddress: true, walletAddress: true }
            });

            if (!user) return [];

            const addresses: string[] = [];
            if (user.scwAddress) addresses.push(user.scwAddress);

            // Define fetcher with null return (Failure = null)
            const fetchForAddress = async (addr: string): Promise<any[] | null> => {
                try {
                    const DATA_API_URL = "https://data-api.polymarket.com/positions";
                    const url = `${DATA_API_URL}?user=${addr}&sizeThreshold=0.1&limit=100&sortBy=TOKENS&sortDirection=DESC`;

                    const response = await fetch(url, { agent });
                    if (!response.ok) return null; // API Failure
                    const data: any = await response.json();
                    return Array.isArray(data) ? data : [];
                } catch (e) {
                    console.error(`[get_positions] Error for ${addr}:`, e);
                    return null; // Network Failure
                }
            };

            const results = await Promise.all(addresses.map(fetchForAddress));

            // If ANY address failed to fetch, return null to avoid recording a partial (dropped) balance.
            if (results.some(r => r === null)) {
                console.warn(`[get_positions] Partial fetch failure for ${userId}. Aborting to prevent data spikes.`);
                return null;
            }

            // Safe to flatten now that we know all are arrays
            const allPositions = (results as any[][]).flat();

            return allPositions.map((p: any) => ({
                id: p.asset || p.conditionId || Math.random().toString(),
                userId,
                marketId: p.asset || p.conditionId || "unknown",
                marketTitle: p.title || "Unknown Market",
                icon: p.icon,
                outcome: p.outcome || "YES",
                shares: Number(p.size || 0),
                avgEntryPrice: Number(p.avgPrice || 0),
                initialValue: Number(p.initialValue || 0),
                exposure: Number(p.currentValue || 0),
                pnl: Number(p.cashPnl || 0),
                percentPnl: Number(p.percentPnl || 0),
                currentPrice: Number(p.curPrice || 0)
            }));

        } catch (error) {
            console.error("get_positions error:", error);
            return null;
        }
    }

    async get_balance(userId: string): Promise<Balance | null> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, scwOwnerPrivateKey: true, scwAddress: true, balance: true }
            });

            if (!user || !user.scwOwnerPrivateKey) return { usdc: "0", pol: "0", address: "" };

            // Explicitly define RPCs for debugging/fallback
            const rpcs = [
                process.env.POLYGON_RPC_URL,
                "https://polygon.drpc.org",
                "https://polygon-bor.publicnode.com",
                "https://polygon-rpc.com",
                "https://rpc.ankr.com/polygon",
                "https://1rpc.io/matic"
            ].filter(Boolean) as string[];

            let lastError: any;
            let targetAddress = "";

            if (user.scwAddress) {
                targetAddress = user.scwAddress;
            } else {
                const privateKey = await SecurityService.decrypt(user.scwOwnerPrivateKey, user.id);
                targetAddress = new ethers.Wallet(privateKey).address;
            }

            const USDC_NATIVE = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
            const USDC_BRIDGED = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

            for (const rpcUrl of rpcs) {
                try {
                    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

                    const usdcNative = new ethers.Contract(USDC_NATIVE, ["function balanceOf(address) view returns (uint256)"], provider);
                    const usdcBridged = new ethers.Contract(USDC_BRIDGED, ["function balanceOf(address) view returns (uint256)"], provider);

                    const [polBalance, nativeBal, bridgedBal] = await Promise.all([
                        provider.getBalance(targetAddress),
                        usdcNative.balanceOf(targetAddress),
                        usdcBridged.balanceOf(targetAddress)
                    ]);

                    const totalUSDC = nativeBal.add(bridgedBal);

                    return {
                        usdc: ethers.utils.formatUnits(totalUSDC, 6),
                        pol: ethers.utils.formatEther(polBalance),
                        address: targetAddress
                    };

                } catch (e: any) {
                    lastError = e;
                    continue;
                }
            }

            console.error(`[Balance] All RPCs failed for ${userId}. Last error:`, lastError?.message);
            return null; // Return null on total failure

        } catch (fatal: any) {
            console.error("get_balance fatal error:", fatal);
            return null;
        }
    }

    async place_trade(trade: TradeParams): Promise<{ status: string; txId: string; price: number; settlementPrice?: number }> {
        let clobClient: any;
        try {
            console.log(`[TRADE] 🔵 REQUEST: ${trade.side} ${trade.amount} on ${trade.marketId} for ${trade.userId}`);

            const user = await prisma.user.findUnique({ where: { id: trade.userId } });
            if (!user || !user.scwOwnerPrivateKey) throw new Error("User or Key not found");

            // 1. Resolve Asset Token ID EARLY (Needed for Allowance)
            let assetTokenId = trade.marketId;
            // Resolve Token ID if it looks short (Gamma lookup)
            if (trade.marketId.length < 20) {
                const marketRes = await fetch(`${GAMMA_API_URL}/markets/${trade.marketId}`, { agent });
                if (marketRes.ok) {
                    const md: any = await marketRes.json();
                    if (md.clobTokenIds) {
                        const tids = typeof md.clobTokenIds === 'string' ? JSON.parse(md.clobTokenIds) : md.clobTokenIds;
                        if (Array.isArray(tids)) {
                            if (trade.outcome.toUpperCase() === "YES" && tids.length > 0) assetTokenId = tids[0];
                            else if (trade.outcome.toUpperCase() === "NO" && tids.length > 1) assetTokenId = tids[1];
                        }
                    }
                }
            }

            const provider = getMultiProvider();
            const privateKey = await SecurityService.decrypt(user.scwOwnerPrivateKey, user.id);
            const eoaWallet = new ethers.Wallet(privateKey, provider);

            // Temp client for keys & time
            const tempClient = new ClobClient("https://clob.polymarket.com", 137, eoaWallet);
            await syncTimeWithSDK(tempClient);
            const negRisk = await tempClient.getNegRisk(assetTokenId);
            const tickSize = await tempClient.getTickSize(assetTokenId);
            console.log(`[TRADE] ⚙️ Market Config | NegRisk: ${negRisk} | TickSize: ${tickSize}`);

            // Generate Keys if missing
            if (!user.apiKey || !user.apiSecret || !user.apiPassphrase) {
                let keys = await tempClient.deriveApiKey().catch(() => null);
                if (!keys || !keys.key) keys = await tempClient.createApiKey();

                await prisma.user.update({
                    where: { id: user.id },
                    data: { apiKey: keys.key, apiSecret: keys.secret, apiPassphrase: keys.passphrase }
                });
                user.apiKey = keys.key;
                user.apiSecret = keys.secret;
                user.apiPassphrase = keys.passphrase;
            }

            const creds = { key: user.apiKey!, secret: user.apiSecret!, passphrase: user.apiPassphrase! };

            // Auto-Check Allowance (USDC / COLLATERAL)
            if (user.scwAddress) {
                const CTF_EXCHANGE = "0x4bfb41d5b3570defd30c3975a9c70d529202fcae";
                const BRIDGED_USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
                const usdc = new ethers.Contract(BRIDGED_USDC, ["function allowance(address, address) view returns (uint256)"], provider);
                const allowProxy = await usdc.allowance(user.scwAddress, CTF_EXCHANGE);
                if (allowProxy.lt(ethers.utils.parseUnits("1000", 6))) {
                    console.log("⚠️ Proxy has insufficient USDC allowance! Enabling trading...");
                    const allowClient = new ClobClient("https://clob.polymarket.com", 137, eoaWallet, creds, 2, user.scwAddress);
                    await allowClient.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
                }

                // Check CTF Approval for SELLING
                if (trade.side.toUpperCase() === "SELL") {
                    const CTF_CONTRACT = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045";
                    const ctf = new ethers.Contract(CTF_CONTRACT, ["function isApprovedForAll(address, address) view returns (bool)"], provider);
                    const isApproved = await ctf.isApprovedForAll(user.scwAddress, CTF_EXCHANGE);

                    if (!isApproved) {
                        console.log("⚠️ Proxy has insufficient CTF allowance for Selling! Enabling...");
                        const allowClient = new ClobClient("https://clob.polymarket.com", 137, eoaWallet, creds, 2, user.scwAddress);
                        console.log(`[ALLOWANCE] ⚠️ Enabling CTF Allowance for Token: ${assetTokenId}`);
                        try {
                            const allowRes = await allowClient.updateBalanceAllowance({ asset_type: AssetType.CONDITIONAL, token_id: assetTokenId });
                            console.log("[ALLOWANCE] Result:", JSON.stringify(allowRes));
                        } catch (err: any) {
                            console.error("[ALLOWANCE] ❌ Update Failed:", err.message);
                        }

                        // Wait for propagation
                        // Wait for propagation (Shortened to match script velocity)
                        console.log("⏳ Allowance updated. Waiting 3s for propagation...");
                        await new Promise(r => setTimeout(r, 3000));
                    }
                }
            }

            const useProxy = !!user.scwAddress;
            const proxyAddress = user.scwAddress;

            clobClient = new ClobClient(
                "https://clob.polymarket.com",
                137,
                eoaWallet,
                creds,
                useProxy ? 2 : 0,
                useProxy ? proxyAddress! : undefined
            );

            const side = trade.side.toUpperCase() === "BUY" ? "BUY" : "SELL";
            let finalPrice = trade.price;
            let orderType = trade.price ? "GTC" : "FOK";

            if (!finalPrice) {
                const wsPrice = await getPriceViaWS(assetTokenId, side as "BUY" | "SELL");
                if (wsPrice) {
                    const buffer = 0.03;
                    finalPrice = side === "BUY" ? Math.min(wsPrice + buffer, 0.99) : Math.max(wsPrice - buffer, 0.02);
                    finalPrice = Math.floor(finalPrice * 100) / 100;
                } else {
                    finalPrice = 0.50; // Fallback
                }
            }

            // Adjust Price to Tick Size
            if (tickSize && !isNaN(parseFloat(tickSize))) {
                // Calculate decimals from string "0.01" -> 2
                const parts = tickSize.split('.');
                const decimals = (parts.length > 1 && parts[1]) ? parts[1].length : 0;
                const multiplier = Math.pow(10, decimals);
                finalPrice = Math.floor(finalPrice * multiplier) / multiplier;
                console.log(`[TRADE] 🏷️ Price configured to ${decimals} decimals: ${finalPrice}`);
            }

            let quantity = parseFloat(trade.amount.toString());

            // Quantity Logic:
            // BUY: 'amount' is USDC Budget. Quantity = Budget / Price
            // SELL: 'amount' is Share Count. Quantity = Amount (Fractional allowed)
            if (trade.side.toUpperCase() === "BUY" && trade.amount && finalPrice > 0) {
                quantity = Math.floor(trade.amount / finalPrice);
            } else if (trade.side.toUpperCase() === "SELL") {
                // Sells can be fractional (0.5 shares), don't floor yet. 
                // Precision rounding happens later.
                quantity = parseFloat(trade.amount.toString());
            }

            // Sanity Check
            if (quantity <= 0) {
                // Throw error so frontend catches it and shows "Failed" toast
                throw new Error(`[TRADE] Quantity calculated to 0. Amount: ${trade.amount}, Price: ${finalPrice}`);
            }

            // Precision: Round to 2 decimals (Match test-sell.js)
            quantity = Math.floor(quantity * 100) / 100;

            console.log(`[TRADE] 🚀 Placing ${orderType} ${side} Order: ${quantity} contracts @ ${finalPrice}`);

            const order = await clobClient.createOrder({
                tokenID: assetTokenId,
                price: finalPrice.toString(),
                side: side,
                size: quantity.toString(),
                feeRateBps: 0,
                expiration: 0,
                nonce: 0
            }, { negRisk: true });

            const postResp = await clobClient.postOrder(order, orderType === "FOK" ? "FOK" : "GTC");
            if (!postResp.success && !postResp.orderID) throw new Error(postResp.errorMsg || "Order Failed");

            return {
                status: "FILLED",
                txId: postResp.orderID || postResp.transactionHash,
                price: finalPrice,
                settlementPrice: finalPrice
            };

        } catch (error: any) {
            console.error("Trade failed:", error?.message || error);
            throw error;
        }
    }

    async get_trades(userId: string): Promise<TradeHistory[]> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { walletAddress: true, scwAddress: true }
            });
            if (!user) return [];

            const DATA_API_URL = "https://data-api.polymarket.com/trades";
            const addresses: string[] = [];
            if (user.scwAddress) addresses.push(user.scwAddress);
            else if (user.walletAddress) addresses.push(user.walletAddress);

            const fetchForAddress = async (addr: string) => {
                const response = await fetch(`${DATA_API_URL}?user=${addr}&limit=100&takerOnly=false`, { agent });
                return response.ok ? await response.json() : [];
            };

            const results = await Promise.all(addresses.map(fetchForAddress));
            const allTrades = results.flat().map((t: any) => ({
                id: t.transactionHash,
                market: t.title || "Unknown Market",
                asset_id: t.asset,
                side: t.side,
                size: t.size,
                price: t.price,
                timestamp: t.timestamp,
                outcome: t.outcome,
                transactionHash: t.transactionHash,
                icon: t.icon
            }));

            return allTrades;
        } catch (error) {
            console.error("get_trades error:", error);
            return [];
        }
    }
}

export const polymarketTool = new PolymarketTool();

// Legacy Exports - Restoring missing functions specific to Polymarket
export const get_markets = (limit?: number) => polymarketTool.get_markets(limit);
export const search_markets = (query: string) => polymarketTool.search_markets(query);
export const get_positions = (userId: string) => polymarketTool.get_positions(userId);
export const get_balance = (userId: string) => polymarketTool.get_balance(userId);
export const place_trade = (trade: TradeParams) => polymarketTool.place_trade(trade);
export const get_trades = (userId: string) => polymarketTool.get_trades(userId);

// Restored: get_active_events (Now correctly fetches /events for grouped markets)
export const get_active_events = async (limit: number = 20) => {
    return polymarketTool.get_events(limit);
};

// Restored: get_trades_by_address (Direct API call, bypassing DB User check if needed, or helper)
export const get_trades_by_address = async (address: string) => {
    try {
        const DATA_API_URL = "https://data-api.polymarket.com/trades";
        const response = await fetch(`${DATA_API_URL}?user=${address}&limit=100&takerOnly=false`, { agent });
        if (!response.ok) return [];
        const data: any = await response.json();
        return Array.isArray(data) ? data.map((t: any) => ({
            ...t,
            outcome: t.outcome || "YES", // normalizing
            market: t.title
        })) : [];
    } catch (e) {
        console.error("get_trades_by_address error", e);
        return [];
    }
};

// Restored: get_positions_by_address
export const get_positions_by_address = async (address: string) => {
    try {
        const DATA_API_URL = "https://data-api.polymarket.com/positions";
        const url = `${DATA_API_URL}?user=${address}&sizeThreshold=0.1&limit=100&sortBy=TOKENS&sortDirection=DESC`;
        const response = await fetch(url, { agent });
        if (!response.ok) return [];
        const data: any = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("get_positions_by_address error", e);
        return [];
    }
};

// Restored: close_position (Specific logic often required separate handling)
export const close_position = async (userId: string, position: any) => {
    try {
        console.log(`[CLOSE] Closing position for ${position.marketTitle}`);

        // Safe Price: 5% below market (for SELL) to ensure fill, but floored at 0.01
        let safePrice = Number(position.currentPrice) * 0.95;
        if (safePrice < 0.01) safePrice = 0.01; // Clamp to min tick
        if (safePrice > 0.99) safePrice = 0.99; // Clamp to max tick

        // Pass SHARES directly for SELL. logic in place_trade handles it.
        return polymarketTool.place_trade({
            userId,
            marketId: position.marketId || position.asset_id,
            outcome: position.outcome,
            side: "SELL",
            amount: Number(position.shares), // Direct Share Count
            price: Number(safePrice.toFixed(2))
        });
    } catch (e) {
        console.error("close_position error", e);
        throw e;
    }
};
