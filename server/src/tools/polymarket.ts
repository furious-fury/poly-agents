
import { ethers } from "ethers";
import { prisma } from "../config/database.js";
// import fetch from "node-fetch"; // REPLACED BY ProxyManager
import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import { SecurityService } from "../services/SecurityService.js";
import { type MarketTool, type Position, type Balance, type TradeHistory, type Market, type TradeParams } from "../interfaces/MarketTool.js";
export { type Market, type TradeParams };
import { ClobClient, AssetType } from "@polymarket/clob-client";
import WebSocket from 'ws';
import { ProxyManager } from "../services/ProxyManager.js"; // IMPORT

// REMOVED STATIC PROXY SETUP - Handled by ProxyManager singleton

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
            // Use ProxyManager for fetch
            const response = await ProxyManager.fetch("https://clob.polymarket.com/time");
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
            const response = await ProxyManager.fetch(`${GAMMA_API_URL}/events?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`);
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
            const response = await ProxyManager.fetch(`${GAMMA_API_URL}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false`);
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
                tokenIds: m.clobTokenIds,
                endDate: m.endDate // Added endDate
            }));
        } catch (error) {
            console.error("get_markets error:", error);
            return [];
        }
    }

    async search_markets(query: string): Promise<Market[]> {
        try {
            const encoded = encodeURIComponent(query);
            const response = await ProxyManager.fetch(`${GAMMA_API_URL}/markets?active=true&closed=false&question=${encoded}&limit=10&order=volume24hr&ascending=false`);

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
                tokenIds: m.clobTokenIds,
                endDate: m.endDate // Added endDate
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
            if (user.scwAddress) {
                // User explicit request: Use Proxy ONLY if available
                addresses.push(user.scwAddress);
            } else if (user.walletAddress) {
                addresses.push(user.walletAddress);
            }

            // Define fetcher with null return (Failure = null)
            const fetchForAddress = async (addr: string): Promise<any[] | null> => {
                try {
                    const DATA_API_URL = "https://data-api.polymarket.com/positions";
                    const url = `${DATA_API_URL}?user=${addr}&sizeThreshold=0.1&limit=100&sortBy=TOKENS&sortDirection=DESC`;

                    const response = await ProxyManager.fetch(url);
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
        const retries = 15; // Increased from 3 to 15 to cycle through more proxies
        let lastError: any;

        for (let i = 0; i < retries; i++) {
            let clobClient: any;
            try {
                if (i > 0) {
                    console.log(`[TRADE] 🔄 Retry attempt ${i + 1}/${retries}...`);
                    // Ensure fresh proxy if retrying
                    // Note: ProxyManager.fetch() rotates automatically, but here we manually handle ClobClient
                }

                console.log(`[TRADE] 🔵 REQUEST: ${trade.side} ${trade.amount} on ${trade.marketId} for ${trade.userId}`);

                // DEBUG: Verify Proxy IP
                try {
                    const ipRes = await ProxyManager.fetch("https://api.ipify.org?format=json", {}, 1); // 1 retry only
                    if (ipRes.ok) {
                        const ipData: any = await ipRes.json();
                        console.log(`[TRADE] 🕵️ Current Proxy IP: ${ipData.ip}`);
                    }
                } catch (e) {
                    console.log("[TRADE] ⚠️ Could not verify Proxy IP (Proxy might be dead)");
                }

                const user = await prisma.user.findUnique({ where: { id: trade.userId } });
                if (!user || !user.scwOwnerPrivateKey) throw new Error("User or Key not found");

                // 1. Resolve Asset Token ID EARLY (Needed for Allowance)
                let assetTokenId = trade.marketId;
                // Resolve Token ID if it looks short (Gamma lookup)
                if (trade.marketId.length < 20) {
                    const marketRes = await ProxyManager.fetch(`${GAMMA_API_URL}/markets/${trade.marketId}`);
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

                console.log(`[TRADE] ✅ Order Successfully Placed! ID: ${postResp.orderID || postResp.transactionHash}`);

                return {
                    status: "FILLED",
                    txId: postResp.orderID || postResp.transactionHash,
                    price: finalPrice,
                    settlementPrice: finalPrice
                };

            } catch (error: any) {
                const msg = error?.message || "";
                lastError = error;

                // Check for block (Explicit or inferred from ProxyManager)
                const isExplicitBlock = msg.includes("403") || msg.includes("Forbidden") || msg.includes("429") || msg.includes("Service Unavailable") || msg.includes("CLOUDFLARE_BLOCK");
                const isGenericError = msg === "Order Failed" || msg.includes("request error");

                // If generic error happened within 2s of a proxy block, assume it was swallowed
                const wasRecentlyBlocked = (Date.now() - ProxyManager.lastBlockTimestamp) < 2000;

                if (isExplicitBlock || (isGenericError && wasRecentlyBlocked)) {
                    console.warn(`[TRADE] 🚫 Blocked/Throttled (${msg}). Rotating proxy...`);
                    // If inferred, we know ProxyManager ALREADY rotated in the interceptor.
                    // If explicit, we ensure rotation.
                    if (!wasRecentlyBlocked) ProxyManager.rotate();

                    // Loop spins again with new proxy
                    continue;
                } else {
                    // Non-blocking error, re-throw immediately
                    console.error("Trade failed:", msg);
                    throw error;
                }
            }
        }
        // If loop exhausts attempts
        throw lastError;
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
            if (user.scwAddress) {
                addresses.push(user.scwAddress);
            } else if (user.walletAddress) {
                addresses.push(user.walletAddress);
            }

            const fetchForAddress = async (addr: string) => {
                const response = await ProxyManager.fetch(`${DATA_API_URL}?user=${addr}&limit=100&takerOnly=false`);
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
        const response = await ProxyManager.fetch(`${DATA_API_URL}?user=${address}&limit=100&takerOnly=false`);
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
        const response = await ProxyManager.fetch(url);
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

        const token_id = position.asset_id || position.marketId;
        let executionPrice = 0;

        // 1. Fetch Order Book to get REAL-TIME liquidity
        try {
            const bookRes = await ProxyManager.fetch(`https://clob.polymarket.com/book?token_id=${token_id}`);
            if (bookRes.ok) {
                const book = await bookRes.json();
                if (book.bids && book.bids.length > 0) {
                    // Sell into the Best Buyer (Highest Bid)
                    // We match their price exactly to execute immediately (Maker/Taker)
                    const bestBid = Number(book.bids[0].price);
                    console.log(`[CLOSE] Found Best Bid: ${bestBid}`);
                    executionPrice = bestBid;
                }
            }
        } catch (err) {
            console.warn("[CLOSE] Failed to fetch orderbook, falling back to last price estimate.");
        }

        // 2. Fallback Logic if Book is empty or failed
        if (!executionPrice) {
            // Aggressive discount to FORCE a fill if we can't see the book
            executionPrice = Number(position.currentPrice) * 0.90;
        }

        // 3. Safety Clamps
        if (executionPrice < 0.01) executionPrice = 0.01; // Min Tick
        if (executionPrice > 0.99) executionPrice = 0.99; // Max Tick

        console.log(`[CLOSE] Executing Sell at ${executionPrice.toFixed(2)}`);

        // Pass SHARES directly for SELL. logic in place_trade handles it.
        return polymarketTool.place_trade({
            userId,
            marketId: token_id,
            outcome: position.outcome,
            side: "SELL",
            amount: Number(position.shares), // Direct Share Count
            price: Number(executionPrice.toFixed(2))
        });
    } catch (e) {
        console.error("close_position error", e);
        throw e;
    }
};

export const cancel_all_orders = async (userId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                scwAddress: true,
                walletAddress: true,
                scwOwnerPrivateKey: true,
                apiKey: true,
                apiSecret: true,
                apiPassphrase: true
            }
        });

        if (!user) throw new Error("User not found");

        if (!user.scwOwnerPrivateKey) {
            console.warn("User has no private key available to sign cancel all request.");
            return;
        }

        const privateKey = await SecurityService.decrypt(user.scwOwnerPrivateKey, user.id);
        const signer = new ethers.Wallet(privateKey);
        const chainId = 137;

        let creds: any;
        if (user.apiKey && user.apiSecret && user.apiPassphrase) {
            creds = { key: user.apiKey, secret: user.apiSecret, passphrase: user.apiPassphrase };
        } else {
            console.log("[CANCEL_ALL] Using L1 Signature");
            creds = await signer.signMessage("The only way to go fast, is to go well.") as any;
        }

        const useProxy = !!user.scwAddress;
        const clobClient = new ClobClient(
            "https://clob.polymarket.com",
            chainId,
            signer,
            creds,
            useProxy ? 2 : 0,
            useProxy ? user.scwAddress! : undefined
        );

        console.log(`[CANCEL] ⚠️ Executing Cancel All for ${user.scwAddress || user.walletAddress}...`);
        const response = await clobClient.cancelAll();
        console.log(`[CANCEL] Successfully cancelled orders.`);

        return response;

    } catch (error: any) {
        console.error("Cancel All Failed:", error.message);
        throw error;
    }
};

export const get_open_orders = async (userId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                scwAddress: true,
                walletAddress: true,
                apiKey: true,
                apiSecret: true,
                apiPassphrase: true,
                scwOwnerPrivateKey: true // Needed for signer
            }
        });
        if (!user) throw new Error("User not found");

        const provider = getMultiProvider();
        let signer: ethers.Wallet;

        if (user.scwOwnerPrivateKey) {
            const privateKey = await SecurityService.decrypt(user.scwOwnerPrivateKey, user.id);
            signer = new ethers.Wallet(privateKey, provider);
        } else {
            // Fallback if no private key stored (shouldn't happen for active traders)
            // But we can't create a wallet without a key. 
            // If we have API keys we might not strictly "need" a signer for GET requests in some SDK versions,
            // but the constructor requires it.
            console.warn("[OPEN_ORDERS] User has no private key. Cannot init ClobClient.");
            return [];
        }

        const chainId = 137;

        // 1. Determine Target Address (Proxy Prefered)
        const useProxy = !!user.scwAddress;
        const targetAddress = useProxy ? user.scwAddress! : user.walletAddress!;

        // console.log(`[OPEN_ORDERS] Fetching for ${targetAddress} (Proxy: ${useProxy})...`);

        // 2. Prepare Credentials (L2 Preferred)
        let creds: any;
        if (user.apiKey && user.apiSecret && user.apiPassphrase) {
            // console.log("[OPEN_ORDERS] Using stored L2 API Keys.");
            creds = { key: user.apiKey, secret: user.apiSecret, passphrase: user.apiPassphrase };
        } else {
            console.log("[OPEN_ORDERS] No API Keys found. Generating L1 Signature...");
            creds = await signer.signMessage("The only way to go fast, is to go well.") as any;
        }

        // 3. Fetch
        try {
            const client = new ClobClient(
                "https://clob.polymarket.com",
                chainId,
                signer,
                creds,
                useProxy ? 2 : 0,
                useProxy ? targetAddress : undefined
            );
            const rawOrders = await client.getOpenOrders();
            // console.log(`[OPEN_ORDERS] Found ${rawOrders.length} orders.`);

            // Enrich with Market Titles (Concurrent Fetch)
            const enrichedOrders = await Promise.all(rawOrders.map(async (o: any) => {
                let marketTitle = "Unknown Market";
                o.marketTitle = "Unknown Market";
                o.marketImage = "";

                // FETCH MARKET DETAILS from Gamma API
                // The CLOB 'market' field corresponds to the 'conditionId' in Gamma.
                try {
                    if (o.market) {
                        const gammaUrl = `https://gamma-api.polymarket.com/markets?condition_ids=${o.market}`;
                        const response = await ProxyManager.fetch(gammaUrl);
                        if (response.ok) {
                            const markets = await response.json();
                            // Find the market that actually contains this asset_id/token_id
                            const matchingMarket = Array.isArray(markets)
                                ? markets.find((m: any) => m.clobTokenIds && m.clobTokenIds.includes(o.asset_id))
                                : null;

                            if (matchingMarket) {
                                o.marketTitle = matchingMarket.question;
                                o.marketImage = matchingMarket.image;
                            } else {
                                console.warn(`[OPEN_ORDERS] Gamma returned no matching market for condition_id ${o.market} and asset_id ${o.asset_id}`);
                            }
                        } else {
                            console.warn(`[OPEN_ORDERS] Gamma fetch failed for condition_id ${o.market}: ${response.status}`);
                        }
                    }
                } catch (err) {
                    console.warn(`[OPEN_ORDERS] Failed to resolve title for ${o.asset_id}`);
                }

                return {
                    orderID: o.id,
                    marketId: o.market, // Condition ID
                    marketTitle: o.marketTitle,
                    marketImage: o.marketImage,
                    asset_id: o.asset_id,
                    side: o.side,
                    price: o.price,
                    size: o.size_matched ? (Number(o.original_size) - Number(o.size_matched)).toString() : o.original_size,
                    originalSize: o.original_size,
                    sizeMatched: o.size_matched || "0",
                    expiration: o.expiration,
                    orderType: o.order_type, // GTC, FOK, etc
                    outcome: o.outcome,
                    timestamp: o.created_at
                };
            }));

            return enrichedOrders;

        } catch (e: any) {
            console.error(`[OPEN_ORDERS] Failed for ${targetAddress}`, e?.message);
            return [];
        }
    } catch (error: any) {
        console.error("fetch open orders error", error);
        return [];
    }
};

export const cancel_order = async (userId: string, orderId: string) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                scwAddress: true,
                walletAddress: true,
                scwOwnerPrivateKey: true,
                apiKey: true,
                apiSecret: true,
                apiPassphrase: true
            }
        });
        if (!user) throw new Error("User not found");

        if (!user.scwOwnerPrivateKey) {
            throw new Error("User has no private key available to sign cancel request.");
        }

        const privateKey = await SecurityService.decrypt(user.scwOwnerPrivateKey, user.id);
        const signer = new ethers.Wallet(privateKey);
        const chainId = 137;

        let creds: any;
        if (user.apiKey && user.apiSecret && user.apiPassphrase) {
            creds = { key: user.apiKey, secret: user.apiSecret, passphrase: user.apiPassphrase };
        } else {
            console.log("[CANCEL] Using L1 Signature for Auth");
            creds = await signer.signMessage("The only way to go fast, is to go well.") as any;
        }

        const useProxy = !!user.scwAddress;
        const clobClient = new ClobClient(
            "https://clob.polymarket.com",
            chainId,
            signer,
            creds,
            useProxy ? 2 : 0,
            useProxy ? user.scwAddress! : undefined
        );

        console.log(`[CANCEL] Cancelling order ${orderId} for ${user.scwAddress || user.walletAddress}...`);
        const res = await clobClient.cancelOrder({ orderID: orderId });
        console.log(`[CANCEL] Order cancelled successfully.`);
        return res;
    } catch (error: any) {
        console.error("cancel order error", error);
        throw error;
    }
};
