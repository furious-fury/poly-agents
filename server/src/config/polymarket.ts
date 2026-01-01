import { ClobClient } from "@polymarket/clob-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";
import type { BuilderApiKeyCreds } from "@polymarket/builder-signing-sdk";
import { ethers } from "ethers";
import { logger } from "./logger.js";
import { ProxyManager } from "../services/ProxyManager.js"; // Initialize ProxyManager (applies global patch)

// Proxy setup is handled by ProxyManager singleton
if (process.env.POLY_PROXY_URL) {
    logger.info(`[PROXY] 🛡️ CLOB Client Proxy Manager Active`);
}

// Initialize delegation wallet from private key
const delegationPrivateKey = process.env.DELEGATION_PRIVATE_KEY;
if (!delegationPrivateKey) {
    throw new Error("DELEGATION_PRIVATE_KEY not set in environment variables");
}

// Initialize robust provider (Fallback)
const rpcUrls = [
    process.env.POLYGON_RPC_URL,
    "https://polygon.drpc.org",
    "https://rpc.ankr.com/polygon",
    "https://polygon-bor.publicnode.com"
].filter(Boolean) as string[];

const providers = rpcUrls.map((url, i) => ({
    provider: new ethers.providers.StaticJsonRpcProvider(url, 137),
    priority: i + 1,
    weight: 1
}));

const provider = new ethers.providers.FallbackProvider(providers, 1);
const wallet = new ethers.Wallet(delegationPrivateKey, provider);

// Initialize CLOB client with L2 proxy wallet delegation

// ... [existing code]

// Initialize CLOB client with L2 proxy wallet delegation
// We add Builder Credentials if available for Attribution
const builderApiKey = process.env.POLY_BUILDER_API_KEY;
const builderSecret = process.env.POLY_BUILDER_SECRET;
const builderPassphrase = process.env.POLY_BUILDER_PASSPHRASE;

let builderConfig: BuilderConfig | undefined = undefined;

if (builderApiKey && builderSecret && builderPassphrase) {
    const builderCreds: BuilderApiKeyCreds = {
        key: builderApiKey,
        secret: builderSecret,
        passphrase: builderPassphrase
    };
    // Assuming BuilderConfig is a class based on lint usage
    builderConfig = new BuilderConfig({
        localBuilderCreds: builderCreds
    });
    logger.info("🔧 Builder Credentials Loaded for Attribution");
} else {
    logger.warn("⚠️ No Builder Credentials found - Orders will not be attributed");
}

const clobClient = new ClobClient(
    process.env.POLYMARKET_CLOB_URL || "https://clob.polymarket.com",
    137, // Polygon chain ID
    wallet,
    {
        key: process.env.POLYMARKET_API_KEY || "",
        secret: process.env.POLYMARKET_API_SECRET || "",
        passphrase: process.env.POLYMARKET_PASSPHRASE || "",
    },
    2, // Safe proxy wallet type
    process.env.PROXY_WALLET_ADDRESS, // User's proxy wallet address (will be overridden per-user)
    undefined, // options
    undefined, // socket options
    builderConfig // custom options / builder config
);

logger.info("✅ Polymarket CLOB client initialized with L2 delegation");

export { clobClient, wallet };
