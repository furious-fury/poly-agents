import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import fetch from "node-fetch";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

class ProxyManagerService {
    private proxies: string[] = [];
    private currentIndex: number = 0;
    private currentAgent: HttpsProxyAgent<string> | undefined;

    // Track last block time to help consumers (like place_trade) identify swallowed errors
    public lastBlockTimestamp: number = 0;

    constructor() {
        this.reload();
        // Patch Global Axios
        this.patchAxiosInstance(axios, "Global");

        // Patch Nested Axios (Critical for ClobClient)
        try {
            // Attempt to resolve the nested axios inside @polymarket/clob-client
            // We use 'require.resolve' strategy or try specific paths
            const nestedAxiosPath = require.resolve("@polymarket/clob-client/node_modules/axios");
            const nestedAxios = require(nestedAxiosPath);
            if (nestedAxios && nestedAxios !== axios) {
                console.log(`[ProxyManager] 🔧 Patching Nested Axios at ${nestedAxiosPath}`);
                this.patchAxiosInstance(nestedAxios, "Nested");
            } else {
                console.log(`[ProxyManager] ⚠️ Nested Axios resolved to Global Axios (or not found distinct).`);
            }
        } catch (e) {
            // Fallback: Try relative path assuming standard node_modules structure
            try {
                // @ts-ignore
                const nestedAxios = require("../../node_modules/@polymarket/clob-client/node_modules/axios");
                console.log(`[ProxyManager] 🔧 Patching Nested Axios (Relative Path)`);
                this.patchAxiosInstance(nestedAxios, "Nested-Relative");
            } catch (e2) {
                console.warn("[ProxyManager] ⚠️ Could not load nested Axios. ClobClient might use unpatched connection.");
            }
        }
    }

    // Generic patcher for any Axios object (root or instance)
    private patchAxiosInstance(axiosLib: any, label: string) {
        if (!axiosLib || axiosLib._isPatchedByProxyManager) return;

        const originalCreate = axiosLib.create;
        const self = this;

        // 1. Patch .create()
        // @ts-ignore
        axiosLib.create = function (config: any) {
            const newConfig = { ...config };
            if (self.currentAgent) {
                newConfig.httpsAgent = self.currentAgent;
                newConfig.proxy = false;
            }
            if (!newConfig.headers) newConfig.headers = {};

            // Only spoof UA if not already set (Let ClobClient use its own ID)
            if (!newConfig.headers['User-Agent'] && !newConfig.headers['user-agent']) {
                newConfig.headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            }

            const instance = originalCreate.call(this, newConfig);

            // Add Response Interceptor to instance
            self.attachInterceptor(instance, `${label}-Instance`);

            return instance;
        };

        // 2. Patch Defaults & Global Interceptors (in case they use raw axios)
        if (self.currentAgent) {
            axiosLib.defaults.httpsAgent = self.currentAgent;
            axiosLib.defaults.proxy = false;
        }
        axiosLib.defaults.headers.common['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

        // Attach Global Interceptor
        // self.attachInterceptor(axiosLib, `${label}-Global`); 
        // CAREFUL: ClobClient might rely on default behavior. Let's stick to instances first? 
        // Actually, if ClobClient does 'axios.get', it needs this.
        self.attachInterceptor(axiosLib, `${label}-Global`);

        axiosLib._isPatchedByProxyManager = true;
        console.log(`[ProxyManager] ✅ Patched ${label} Axios library.`);
    }

    private attachInterceptor(instance: any, label: string) {
        // Idempotency check? Axios allows multiple interceptors.
        // We can't easily check if it's already there without keeping ID refs. But Constructor runs once.

        instance.interceptors.response.use(
            (response: any) => response,
            async (error: any) => {
                const status = error.response ? error.response.status : 0;
                // Log all errors during debug
                // console.log(`[ProxyManager:${label}] Error Status: ${status}`);

                if (status === 403 || status === 429 || status === 503) {
                    console.warn(`[ProxyManager:${label}] 🚫 Axios Blocked (${status}). Rotating proxy...`);
                    this.lastBlockTimestamp = Date.now();
                    this.rotate();
                    // Strip the potentially sensitive/large data and throw clean error
                    const cleanError = new Error(`CLOUDFLARE_BLOCK_${status}`);
                    // @ts-ignore
                    cleanError.originalStatus = status;
                    return Promise.reject(cleanError);
                }
                return Promise.reject(error);
            }
        );
        // Ensure request interceptor for agent rotation on instances that persist
        instance.interceptors.request.use((cfg: any) => {
            if (this.currentAgent) {
                cfg.httpsAgent = this.currentAgent;
                cfg.proxy = false;
            }
            if (!cfg.headers) cfg.headers = {};
            cfg.headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            return cfg;
        });
    }

    public reload() {
        const raw = process.env.POLY_PROXY_URL || "";
        this.proxies = raw.split(",").map(p => p.trim()).filter(Boolean);
        this.currentIndex = 0;
        this.updateAgent();
        this.applyGlobalAxiosPatch();
    }

    private updateAgent() {
        if (this.proxies.length === 0) {
            this.currentAgent = undefined;
            return;
        }
        const url = this.proxies[this.currentIndex];
        if (!url) return;

        console.log(`[ProxyManager] 🛡️ Switched to Proxy #${this.currentIndex + 1}/${this.proxies.length}: ${this.maskUrl(url)}`);
        this.currentAgent = new HttpsProxyAgent(url);
    }

    private maskUrl(url: string): string {
        return url.replace(/:[^:]*@/, ":***@");
    }

    public rotate() {
        if (this.proxies.length <= 1) {
            console.warn("[ProxyManager] ⚠️ Rotation requested but only 1 proxy available.");
            return;
        }
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        this.updateAgent();
        this.applyGlobalAxiosPatch();
    }

    public get agent() {
        return this.currentAgent;
    }

    // Patch Axios globally (for ClobClient and others using global axios)
    private applyGlobalAxiosPatch() {
        // Implementation moved to generic patcher, but we can keep updates here
        const agent = this.currentAgent;
        if (agent) {
            axios.defaults.httpsAgent = agent;
            axios.defaults.proxy = false;

            // Should also update the nested axios defaults if we found them
            try {
                const nestedAxios = require(require.resolve("@polymarket/clob-client/node_modules/axios"));
                if (nestedAxios) {
                    nestedAxios.defaults.httpsAgent = agent;
                    nestedAxios.defaults.proxy = false;
                }
            } catch (e) { }
        }
    }

    // Wrapper for node-fetch with auto-retry and rotation
    public async fetch(url: string, options: any = {}, retries = 3): Promise<any> {
        let lastError;

        for (let i = 0; i < retries; i++) {
            try {
                // Always use current agent
                const opts = { ...options, agent: this.currentAgent };

                // Ensure User-Agent
                if (!opts.headers) opts.headers = {};
                if (!opts.headers['User-Agent']) {
                    opts.headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
                }

                const res = await fetch(url, opts);

                // Check for blocking status codes
                if (res.status === 403 || res.status === 429 || res.status === 503) {
                    const text = await res.text();
                    // Check specifically for Cloudflare or similar blocks if needed, strictly 403 is a good indicator though.
                    throw new Error(`Blocking Status ${res.status}: ${text.substring(0, 100)}...`);
                }

                return res;

            } catch (error: any) {
                lastError = error;
                const isBlock = error.message.includes("403") || error.message.includes("429") || error.message.includes("503");

                if (isBlock && i < retries - 1) {
                    console.warn(`[ProxyManager] 🚫 Request blocked (${error.message}). Rotating proxy and retrying (${i + 1}/${retries})...`);
                    this.rotate();
                    // Small delay
                    await new Promise(r => setTimeout(r, 1000));
                } else {
                    if (!isBlock) throw error;
                    console.warn(`[ProxyManager] ❌ Request failed (${error.message}). Rotating proxy...`);
                    this.rotate();
                }
            }
        }
        throw lastError;
    }
}

export const ProxyManager = new ProxyManagerService();
