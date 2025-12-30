import { useState, useEffect } from "react";
import { useUserSettings, useUpdateSettings, useImportWallet } from "../lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldAlert, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";

interface UserSettingsProps {
    dbUserId: string;
}

export default function UserSettings({ dbUserId }: UserSettingsProps) {
    const { data: settings } = useUserSettings(dbUserId);
    const updateSettings = useUpdateSettings();

    const [formData, setFormData] = useState({
        maxTradeAmount: 100,
        maxMarketExposure: 500,
        maxTotalExposure: 2000,
        tradeCooldownSeconds: 300,
    });

    const [proxyWalletAddress, setProxyWalletAddress] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isCreatingProxy, setIsCreatingProxy] = useState(false);

    // Import State
    const [importPK, setImportPK] = useState("");
    const [importProxy, setImportProxy] = useState("");

    // Update form when settings are fetched
    useEffect(() => {
        if (settings) {
            setFormData(prev => ({
                maxTradeAmount: settings.maxTradeAmount ?? prev.maxTradeAmount,
                maxMarketExposure: settings.maxMarketExposure ?? prev.maxMarketExposure,
                maxTotalExposure: settings.maxTotalExposure ?? prev.maxTotalExposure,
                tradeCooldownSeconds: settings.tradeCooldownSeconds ?? prev.tradeCooldownSeconds,
            }));
            // Map 'proxyWallet' (from DB) to our local state 'proxyWalletAddress'
            // DB field is 'proxyWallet' or 'proxyAddress' depending on what we returned.
            // The existing API hook probably returns 'proxyWallet' property.
            // Let's check user.routes.ts... it returns `proxyWallet` in the select.
            // But wait, I updated the SCHEMA to `proxyAddress` but the ROUTE `POST /settings` 
            // selects `proxyWallet: true`. 
            // I need to check if I updated the `POST /settings` route to select `proxyAddress`.
            // I DID NOT update the select in `POST /settings` in Step 3121. I only looked at it.
            // Step 3121 view showed `proxyWallet: true`.
            // Step 3107 changed schema to `proxyAddress`.
            // THIS MEANS `POST /settings` IS BROKEN too because `proxyWallet` column doesn't exist anymore!

            // I MUST FIX THE ROUTE FIRST/ALSO. 
            // For now, in frontend, I will assume the key might be missing or I'll fix the route next.
            // Let's assume I will fix the route to return `proxyAddress`.
            if ((settings as any).proxyAddress || (settings as any).proxyWallet) {
                setProxyWalletAddress((settings as any).proxyAddress || (settings as any).proxyWallet);
            }
        }
    }, [settings]);

    const handleSaveSettings = async () => {
        try {
            await updateSettings.mutateAsync({
                userId: dbUserId,
                ...formData,
            });
            setMessage({ type: "success", text: "Risk configuration updated successfully" });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: "error", text: "Failed to update settings" });
        }
    };

    const importWalletMutation = useImportWallet();

    const handleImportProxy = async () => {
        setIsCreatingProxy(true);
        try {
            const data = await importWalletMutation.mutateAsync({
                userId: dbUserId,
                privateKey: importPK,
                proxyAddress: importProxy
            });

            setMessage({ type: "success", text: "Wallet imported successfully!" });
            setProxyWalletAddress(data.address);

            // Query invalidation handled in hook onSuccess

        } catch (error: any) {
            setMessage({ type: "error", text: error.message || "Failed to import wallet" });
        } finally {
            setIsCreatingProxy(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">System Settings</h2>
                <p className="text-gray-500 mt-2">Manage global risk parameters and account integrations.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 shadow-sm ${message.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    : "bg-red-50 text-red-700 border border-red-100"
                    }`}>
                    {message.type === "success" ? <CheckCircle2 size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Risk Management Section */}
                <Card className="bg-white border border-gray-100 shadow-card rounded-4xl overflow-hidden">
                    <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 shadow-sm">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <CardTitle className="text-xl text-gray-900 font-bold">Risk Configuration</CardTitle>
                                <CardDescription className="text-gray-500 mt-1">Set safety limits for your autonomous agents.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Max Trade Amount</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={formData.maxTradeAmount}
                                        onChange={(e) => setFormData({ ...formData, maxTradeAmount: parseFloat(e.target.value) })}
                                        className="bg-white border-gray-200 text-gray-900 pr-16 focus-visible:ring-blue-500 rounded-xl h-11"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded">USDC</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Max Market Exp.</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={formData.maxMarketExposure}
                                        onChange={(e) => setFormData({ ...formData, maxMarketExposure: parseFloat(e.target.value) })}
                                        className="bg-white border-gray-200 text-gray-900 pr-16 focus-visible:ring-blue-500 rounded-xl h-11"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded">USDC</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Total Account Exp.</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={formData.maxTotalExposure || ''}
                                        onChange={(e) => setFormData({ ...formData, maxTotalExposure: parseFloat(e.target.value) || 0 })}
                                        className="bg-white border-gray-200 text-gray-900 pr-16 focus-visible:ring-blue-500 rounded-xl h-11"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded">USDC</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Trade Cooldown</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        value={formData.tradeCooldownSeconds || ''}
                                        onChange={(e) => setFormData({ ...formData, tradeCooldownSeconds: parseInt(e.target.value) || 0 })}
                                        className="bg-white border-gray-200 text-gray-900 pr-16 focus-visible:ring-blue-500 rounded-xl h-11"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold bg-gray-50 px-2 py-1 rounded">SEC</span>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSaveSettings}
                            disabled={updateSettings.isPending}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20"
                        >
                            {updateSettings.isPending ? "Saving..." : "Update Risk Parameters"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Integrations Section */}
                <div className="space-y-8">
                    <Card className="bg-white border border-gray-100 shadow-card rounded-4xl overflow-hidden h-fit">
                        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600 shadow-sm">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <CardTitle className="text-xl text-gray-900 font-bold">Proxy Trading Wallet</CardTitle>
                                    <CardDescription className="text-gray-500 mt-1">Server-managed Smart Account for autonomous trading.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-8">

                            {proxyWalletAddress ? (
                                <div className="space-y-4">
                                    <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Active Proxy Address</h3>
                                        <div className="flex items-center justify-between gap-2">
                                            <code className="text-sm text-purple-900 font-mono break-all bg-white p-3 rounded-xl border border-purple-100 w-full shadow-sm">
                                                {proxyWalletAddress}
                                            </code>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
                                        <p className="text-sm text-blue-700 leading-relaxed font-medium">
                                            <strong>Action Required:</strong> Send Bridged USDC to this address to fund your agent's trading activities.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        To enable autonomous trading, you must import your existing Polymarket Proxy wallet and its controlling Private Key.
                                    </p>
                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-4 flex gap-3">
                                        <ShieldAlert className="text-blue-600 shrink-0 mt-0.5" size={18} />
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-blue-800">Security Guarantee</p>
                                            <p className="text-xs text-blue-600/90 leading-relaxed">
                                                Your Private Key is encrypted using <strong>AES-256-GCM</strong> with a user-specific key derived via <strong>HKDF</strong>. It is never stored in plain text.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-4 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase text-gray-500">Owner Private Key</label>
                                            <Input
                                                type="password"
                                                placeholder="0x..."
                                                value={importPK}
                                                onChange={(e) => setImportPK(e.target.value)}
                                                className="bg-white border-gray-200 text-gray-900 text-xs font-mono h-10"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase text-gray-500">Proxy Address</label>
                                            <Input
                                                placeholder="0x..."
                                                value={importProxy}
                                                onChange={(e) => setImportProxy(e.target.value)}
                                                className="bg-white border-gray-200 text-gray-900 text-xs font-mono h-10"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleImportProxy}
                                        disabled={isCreatingProxy || !importPK || !importProxy}
                                        className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20"
                                    >
                                        {isCreatingProxy ? "Importing..." : "Import Trading Credentials"}
                                    </Button>
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                                    <span>Status</span>
                                    <span className={`flex items-center gap-1.5 ${proxyWalletAddress ? "text-emerald-600" : "text-gray-400"}`}>
                                        <div className={`w-2 h-2 rounded-full ${proxyWalletAddress ? "bg-emerald-500 ring-2 ring-emerald-100" : "bg-gray-300"}`} />
                                        {proxyWalletAddress ? "Ready for Funding" : "Not Initialized"}
                                    </span>
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                    {/* Private Key Export Section */}
                    {proxyWalletAddress && (
                        <Card className="bg-red-50 border-red-100 shadow-sm rounded-4xl overflow-hidden h-fit">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 rounded-xl text-red-600">
                                        <AlertCircle size={20} />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg text-red-900 font-bold">Export Private Key</CardTitle>
                                        <CardDescription className="text-red-700/80 text-xs">Retrieve your trading key for external use.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-white rounded-xl border border-red-100 mb-2">
                                    <p className="text-xs text-red-600 leading-relaxed font-bold">
                                        WARNING: Anyone with this key can access your funds. Never share it.
                                    </p>
                                </div>
                                <ExportKeyButton userId={dbUserId} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

const ExportKeyButton = ({ userId }: { userId: string }) => {
    const [key, setKey] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);

    const handleReveal = async () => {
        if (revealed) {
            setKey(null);
            setRevealed(false);
            return;
        }

        try {
            const res = await fetch(`http://localhost:5000/api/user/proxy/export?userId=${userId}`);
            const data = await res.json();
            if (data.privateKey) {
                setKey(data.privateKey);
                setRevealed(true);
            }
        } catch (e) {
            console.error("Failed to export key", e);
        }
    };

    return (
        <div className="space-y-2">
            <Button
                variant="outline"
                onClick={handleReveal}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 bg-white"
            >
                {revealed ? "Hide Private Key" : "Reveal Private Key"}
            </Button>
            {revealed && key && (
                <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 font-mono text-xs break-all text-red-200 select-all shadow-inner">
                    {key}
                </div>
            )}
        </div>
    );
};
