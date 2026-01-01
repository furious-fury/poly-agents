import { HttpsProxyAgent } from "https-proxy-agent";
import axios from "axios";
import fetch from "node-fetch";

class ProxyManagerService {
    private proxies: string[] = [];
    private currentIndex: number = 0;
    private currentAgent: HttpsProxyAgent<string> | undefined;

    constructor() {
        this.patchAxiosCreate();
        this.reload();
    }

    private patchAxiosCreate() {
        const originalCreate = axios.create;
        const self = this; // Capture 'this' context

        // @ts-ignore
        axios.create = function (config: any) {
            const newConfig = { ...config };
            if (self.currentAgent) {
                newConfig.httpsAgent = self.currentAgent;
                newConfig.proxy = false;
            }
            // Ensure User-Agent
            if (!newConfig.headers) newConfig.headers = {};
            newConfig.headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

            const instance = originalCreate.call(this, newConfig);

            // Add interceptor to instance to ensure headers persist
            instance.interceptors.request.use((cfg: any) => {
                const agent = self.currentAgent;
                if (agent) {
                    cfg.httpsAgent = agent;
                    cfg.proxy = false;
                }
                if (!cfg.headers) cfg.headers = {};
                cfg.headers['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
                return cfg;
            });

            return instance;
        };
    }

    public reload() {
        const raw = process.env.POLY_PROXY_URL || "";
        // Support comma-separated list
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
        if (!url) return; // Safety check for TS

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
        const agent = this.currentAgent;
        const CHROME_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

        if (agent) {
            axios.defaults.httpsAgent = agent;
            axios.defaults.proxy = false;
        }

        axios.defaults.headers.common['User-Agent'] = CHROME_UA;
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
                    // Non-blocking error or max retries -> Break loop (will throw after)
                    if (!isBlock) throw error; // If it's a network error, maybe valid to retry too? 
                    // Let's retry on network errors too if we have proxies?
                    // Actually, if it's not a block, maybe the proxy is dead. So YES, rotate on network error too.
                    console.warn(`[ProxyManager] ❌ Request failed (${error.message}). Rotating proxy...`);
                    this.rotate();
                }
            }
        }
        throw lastError;
    }
}

export const ProxyManager = new ProxyManagerService();
