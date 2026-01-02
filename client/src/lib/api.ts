import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Helper to strip trailing slash
const stripSlash = (url: string) => url.replace(/\/$/, "");

// RAW Env Var (could be root or /api)
let rawUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Safety check: specific override for the placeholder in .env.example
if (rawUrl.includes("your-new-domain.com")) {
    // console.warn("⚠️ [API Setup] Detected placeholder domain in VITE_API_URL. Falling back to localhost.");
    rawUrl = "http://localhost:5000";
}

const ENV_URL = stripSlash(rawUrl);
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || "";

// Standardize: API_URL always ends with /api
export const API_URL = ENV_URL.endsWith("/api") ? ENV_URL : `${ENV_URL}/api`;

// console.log("🔗 [API Setup] Using API URL:", API_URL);

// Helper for authenticated requests
const authHeaders = () => {
    return {
        "Content-Type": "application/json",
        "x-admin-secret": ADMIN_SECRET
    };
};

// Agents API
export const useAgents = (userId: string | null) => {
    return useQuery({
        queryKey: ["agents", userId],
        queryFn: async () => {
            if (!userId) return [];
            const res = await fetch(`${API_URL}/agents?userId=${userId}`, {
                headers: { "x-admin-secret": ADMIN_SECRET } // Pass header for consistency, though read-only might not need it yet
            });
            const data = await res.json();
            return data.agents; // Extract agents array from response
        },
        enabled: !!userId,
    });
};

export const useControlAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ agentId, action, userId }: { agentId: string, action: string, userId: string }) => {
            const res = await fetch(`${API_URL}/agents/${agentId}/${action}`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error(`Failed to ${action} agent`);
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
            // Invalidate positions/trades too, as starting/stopping/running an agent might affect them (or trigger an immediate trade)
            if (variables.userId) {
                queryClient.invalidateQueries({ queryKey: ["positions", variables.userId] });
                queryClient.invalidateQueries({ queryKey: ["trades", variables.userId] });
                queryClient.invalidateQueries({ queryKey: ["balance", variables.userId] });
            }
        },
    });
};

export const useUpdateAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ agentId, data }: { agentId: string, data: any }) => {
            const res = await fetch(`${API_URL}/agents/${agentId}`, {
                method: "PUT",
                headers: authHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update agent");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
        },
    });
};

export const useCreateAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ name, description, riskProfile, userId, stopLossPercent, takeProfitPercent, llmProvider }: { name: string, description: string, riskProfile: string, userId: string, stopLossPercent?: number, takeProfitPercent?: number, llmProvider?: string }) => {
            const res = await fetch(`${API_URL}/agents`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ name, description, riskProfile, userId, stopLossPercent, takeProfitPercent, llmProvider }),
            });
            if (!res.ok) throw new Error("Failed to create agent");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
        },
    });
}

export const useDeleteAgent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (agentId: string) => {
            const res = await fetch(`${API_URL}/agents/${agentId}`, {
                method: "DELETE",
                headers: { "x-admin-secret": ADMIN_SECRET }
            });
            if (!res.ok) throw new Error("Failed to delete agent");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["agents"] });
        },
    });
};

export const useEnableTrading = () => {
    return useMutation({
        mutationFn: async (credentials: { userId: string; apiKey: string; apiSecret: string; apiPassphrase: string; proxyWallet: string }) => {
            const res = await fetch(`${API_URL}/agents/auth/polymarket`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify(credentials),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to enable trading");
            }
            return res.json();
        },
    });
};

// Trades API
export const useTrades = (userId: string) => {
    return useQuery({
        queryKey: ["trades", userId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/trade/history/${userId}`);
            const data = await res.json();
            return data.trades; // Extract trades array from response
        },
        enabled: !!userId,
        refetchInterval: 5000, // Faster refresh for trades (5s)
        refetchIntervalInBackground: true,
    });
};

// User Settings API
export const useUserSettings = (userId: string) => {
    return useQuery({
        queryKey: ['userSettings', userId],
        queryFn: async () => {
            // New format: GET /settings/:userId
            const res = await fetch(`${API_URL}/user/settings/${userId}`, {
                method: 'GET',
                headers: authHeaders() // Now required
            });
            if (!res.ok) throw new Error('Failed to fetch user settings');
            return res.json();
        },
        enabled: !!userId,
    });
};

// Logs API
export const useAgentLogs = (agentId: string) => {
    return useQuery({
        queryKey: ["agentLogs", agentId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/logs/agent/${agentId}`);
            const data = await res.json();
            return data.logs;
        },
        enabled: !!agentId,
        refetchInterval: 2000, // Auto-refresh every 2s
        refetchIntervalInBackground: true, // Keep updating even if looking at terminal
    });
};

export const useUserLogs = (userId: string) => {
    return useQuery({
        queryKey: ["userLogs", userId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/logs/user/${userId}`);
            const data = await res.json();
            return data.logs;
        },
        enabled: !!userId,
        refetchInterval: 60000,
    });
};

export const useUpdateSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: {
            userId: string;
            maxTradeAmount?: number;
            maxMarketExposure?: number;
            maxTotalExposure?: number;
            tradeCooldownSeconds?: number;
        }) => {
            const res = await fetch(`${API_URL}/user/settings`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to update settings');
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userSettings', variables.userId] });
        },
    });
};

export const useSyncDeposits = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch(`${API_URL}/user/proxy/sync`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error('Failed to sync deposits');
            return res.json();
        },
        onSuccess: (_, userId) => {
            // Invalidate activity and balance to refresh UI
            queryClient.invalidateQueries({ queryKey: ['activity', userId] });
            queryClient.invalidateQueries({ queryKey: ['proxyWallet', userId] });
        },
    });
};

export const useSetProxyWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, proxyWallet }: { userId: string; proxyWallet: string }) => {
            const res = await fetch(`${API_URL}/user/proxy-wallet`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ userId, proxyWallet }),
            });
            if (!res.ok) throw new Error('Failed to set proxy wallet');
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userSettings', variables.userId] });
        },
    });
};

export const useProxyWallet = (userId: string) => {
    return useQuery({
        queryKey: ["proxyWallet", userId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/user/proxy?userId=${userId}`, {
                headers: { "x-admin-secret": ADMIN_SECRET } // GET needs headers too
            });
            if (res.status === 404) return null; // Handle no wallet found gracefully
            if (!res.ok) throw new Error("Failed to fetch proxy wallet");
            return res.json();
        },
        enabled: !!userId,
        refetchInterval: 10000, // Proxy wallet check (10s)
    });
};

export const useUserPositions = (userId: string) => {
    return useQuery({
        queryKey: ['positions', userId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/portfolio/${userId}`);
            if (!res.ok) throw new Error("Failed to fetch user positions");
            const data = await res.json();
            // Ensure we return the positions array from the response { success: true, positions: [] }
            return data.positions || [];
        },
        enabled: !!userId,
        // count 0 shares as closed, so we might want to filter them out here or in UI
        select: (positions: any[]) => positions.filter((p: any) => p.shares > 0),
        refetchInterval: 5000, // Positions update every 5s
        refetchIntervalInBackground: true,
    });
};

export const useUserActivity = (userId: string) => {
    return useQuery({
        queryKey: ['activity', userId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/user/activity/${userId}`);
            if (!res.ok) throw new Error("Failed to fetch user activity");
            const data = await res.json();
            return data.activities || [];
        },
        enabled: !!userId,
        refetchInterval: 5000, // Activity feed every 5s
        refetchIntervalInBackground: true,
    });
};

export const useUserBalance = (userId: string) => {
    return useQuery({
        queryKey: ['balance', userId],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/portfolio/balance/${userId}`);
            if (!res.ok) throw new Error("Failed to fetch user balance");
            const data = await res.json();
            return data.balance || { usdc: "0", pol: "0", address: "" };
        },
        enabled: !!userId,
        refetchInterval: 5000, // Balance every 5s
        refetchIntervalInBackground: true,
    });
};

export const usePortfolioHistory = (userId: string, range: '24h' | '1w' | '1m' = '24h') => {
    return useQuery({
        queryKey: ["portfolioHistory", userId, range],
        queryFn: async () => {
            const res = await fetch(`${API_URL}/portfolio/history/${userId}?range=${range}`);
            if (!res.ok) throw new Error("Failed to fetch history");
            const data = await res.json();
            return data.history || [];
        },
        enabled: !!userId,
        refetchInterval: 30000, // Update every 30s
    });
};

// --- New Mutations for Refactor ---

export const useLoginUser = () => {
    return useMutation({
        mutationFn: async (walletAddress: string) => {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ walletAddress })
            });
            if (!res.ok) throw new Error("Failed to login");
            return res.json();
        }
    });
};

export const useImportWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, privateKey, proxyAddress }: { userId: string, privateKey: string, proxyAddress: string }) => {
            const res = await fetch(`${API_URL}/user/proxy/import`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ userId, privateKey, proxyAddress }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to import wallet');
            }
            return res.json();
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['userSettings', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['proxyWallet', variables.userId] });
        }
    });
};

export const useClosePosition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, marketId, outcome }: { userId: string, marketId: string, outcome: string }) => {
            const res = await fetch(`${API_URL}/trade/close`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ userId, marketId, outcome })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to close position");
            return data;
        },
        onSuccess: (_, variables) => {
            // Optimistic Update: Remove the position from cache immediately
            // This prevents the UI from "flickering" or showing the old position while the indexer catches up
            queryClient.setQueryData(['positions', variables.userId], (old: any[]) => {
                if (!old) return [];
                // Filter out by marketId (or asset_id as fallback)
                return old.filter((p: any) => {
                    const id = p.marketId || p.asset_id;
                    return id !== variables.marketId;
                });
            });

            // Invalidate all relevant queries to trigger immediate UI update
            queryClient.invalidateQueries({ queryKey: ['positions', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['trades', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['balance', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['portfolioHistory', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['activity', variables.userId] });
        }
    });
};

export const useOpenOrders = (userId: string) => {
    return useQuery({
        queryKey: ['openOrders', userId],
        queryFn: async () => {
            if (!userId) return [];
            // Use the fetch wrapper if available, else standard fetch with auth
            const res = await fetch(`${API_URL}/trade/open-orders/${userId}`, {
                headers: authHeaders()
            });
            if (!res.ok) throw new Error("Failed to fetch open orders");
            const data = await res.json();
            return data.orders;
        },
        enabled: !!userId,
        refetchInterval: 10000
    });
};

export const useCancelOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ userId, orderId }: { userId: string, orderId: string }) => {
            const res = await fetch(`${API_URL}/trade/cancel`, {
                method: "POST",
                headers: authHeaders(),
                body: JSON.stringify({ userId, orderId })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Failed to cancel order");
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['openOrders', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['userSettings', variables.userId] }); // Balance might update
        }
    });
};
