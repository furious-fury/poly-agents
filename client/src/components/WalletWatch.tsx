import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "./ui/dialog";
import { API_URL } from "../lib/api";
import { PnLCard } from "./PnLCard";

interface WalletWatchProps {
    userId: string;
}

interface Trade {
    id: string;
    market: string;
    side: string;
    outcome: string;
    size: string;
    price: string;
    timestamp: number;
    transactionHash: string;
    icon?: string;
}

interface Position {
    asset: string;
    title: string;
    market: string;
    outcome: string;
    size: number;
    value: number;
    price: number;
    initialValue: number;
    pnl: number;
    icon?: string;
}

export function WalletWatch({ userId }: WalletWatchProps) {
    const [wallets, setWallets] = useState<Array<{ address: string, name: string | null }>>([]);
    const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
    const [newWallet, setNewWallet] = useState("");
    const [newWalletName, setNewWalletName] = useState("");
    const [trades, setTrades] = useState<Trade[]>([]);
    const [positions, setPositions] = useState<Position[]>([]);
    const [viewMode, setViewMode] = useState<"history" | "positions">("positions");
    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [walletToDelete, setWalletToDelete] = useState<string | null>(null);

    const cache = useRef<{ [key: string]: { trades?: { data: Trade[], ts: number }, positions?: { data: Position[], ts: number } } }>({});
    const CACHE_DURATION = 20000; // 20 seconds

    // Initial Load
    useEffect(() => {
        if (userId) fetchWallets();
    }, [userId]);

    // Fetch data when wallet or view mode changes
    useEffect(() => {
        if (selectedWallet) {
            if (viewMode === "history") fetchHistory(selectedWallet);
            else fetchPositions(selectedWallet);
        }
    }, [selectedWallet, viewMode]);

    const fetchWallets = async () => {
        try {
            const res = await fetch(`${API_URL}/user/tracked-wallets?userId=${userId}`);
            const data = await res.json();
            if (data.success) {
                setWallets(data.wallets);
                if (data.wallets.length > 0 && !selectedWallet) setSelectedWallet(data.wallets[0].address);
            }
        } catch (e) { console.error(e); }
    };

    const addWallet = async () => {
        if (!newWallet || newWallet.length < 10) return;
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/user/tracked-wallets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, address: newWallet, name: newWalletName })
            });
            const data = await res.json();
            if (data.success) {
                setWallets(data.wallets);
                setNewWallet("");
                setNewWalletName("");
                setSelectedWallet(newWallet);
                setIsDialogOpen(false);
            }
        } finally { setIsLoading(false); }
    };

    const initiateRemoveWallet = (address: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setWalletToDelete(address);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!walletToDelete) return;

        // Optimistic UI update could be done here, but let's wait for server
        try {
            const res = await fetch(`${API_URL}/user/tracked-wallets`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, address: walletToDelete })
            });
            const data = await res.json();
            if (data.success) {
                setWallets(data.wallets);
                // Clear cache for removed wallet
                if (cache.current[walletToDelete]) delete cache.current[walletToDelete];

                if (selectedWallet === walletToDelete) {
                    setSelectedWallet(null);
                    setTrades([]);
                    setPositions([]);
                }
            }
        } catch (e) { } finally {
            setIsDeleteDialogOpen(false);
            setWalletToDelete(null);
        }
    };

    const fetchHistory = async (address: string) => {
        // Check cache
        const cached = cache.current[address]?.trades;
        if (cached && (Date.now() - cached.ts < CACHE_DURATION)) {
            setTrades(cached.data);
            return;
        }

        setIsDataLoading(true);
        try {
            const res = await fetch(`${API_URL}/trade/history-address/${address}`);
            const data = await res.json();
            if (data.success) {
                setTrades(data.trades);
                // Update cache
                if (!cache.current[address]) cache.current[address] = {};
                cache.current[address].trades = { data: data.trades, ts: Date.now() };
            } else {
                setTrades([]);
            }
        } catch (e) {
            console.error(e);
            setTrades([]);
        } finally { setIsDataLoading(false); }
    };

    const fetchPositions = async (address: string) => {
        // Check cache
        const cached = cache.current[address]?.positions;
        if (cached && (Date.now() - cached.ts < CACHE_DURATION)) {
            setPositions(cached.data);
            return;
        }

        setIsDataLoading(true);
        try {
            const res = await fetch(`${API_URL}/trade/positions-address/${address}`);
            const data = await res.json();
            if (data.success) {
                setPositions(data.positions);
                // Update cache
                if (!cache.current[address]) cache.current[address] = {};
                cache.current[address].positions = { data: data.positions, ts: Date.now() };
            } else {
                setPositions([]);
            }
        } catch (e) {
            console.error(e);
            setPositions([]);
        } finally { setIsDataLoading(false); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Wallet Watcher</h2>
                <p className="text-gray-500 mt-2">Track external whales and smart money movements in real-time.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:h-[800px]">
                {/* Sidebar - Watchlist */}
                <div className="lg:col-span-1 bg-white rounded-4xl border border-gray-100 shadow-card flex flex-col overflow-hidden h-[400px] lg:h-auto">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                        <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Watchlist</h3>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100 transition-all rounded-xl">
                                    <Plus size={14} /> Add
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-white border-gray-100 text-gray-900 sm:max-w-[400px] shadow-2xl rounded-3xl">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Track New Wallet</DialogTitle>
                                    <DialogDescription className="text-gray-500">
                                        Enter a wallet address to monitor its Polymarket activity.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Wallet Name (Optional)</label>
                                        <Input
                                            value={newWalletName}
                                            onChange={(e) => setNewWalletName(e.target.value)}
                                            placeholder="e.g. Whale 1"
                                            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Wallet Address</label>
                                        <Input
                                            value={newWallet}
                                            onChange={(e) => setNewWallet(e.target.value)}
                                            placeholder="0x..."
                                            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 font-mono rounded-xl"
                                        />
                                    </div>
                                    <Button onClick={addWallet} disabled={isLoading || !newWallet || newWallet.length < 10} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 shadow-lg shadow-blue-500/20">
                                        {isLoading ? "Adding..." : "Start Tracking"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto space-y-2 p-3">
                        {wallets.map(w => (
                            <div
                                key={w.address}
                                onClick={() => setSelectedWallet(w.address)}
                                className={`p-4 rounded-2xl cursor-pointer border transition-all flex justify-between items-center group
                                    ${selectedWallet === w.address
                                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                                        : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'}
                                `}
                            >
                                <div className="truncate">
                                    <div className={`font-bold text-sm ${selectedWallet === w.address ? 'text-blue-900' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                        {w.name || "Untitled"}
                                    </div>
                                    <div className={`text-xs font-mono mt-1 ${selectedWallet === w.address ? 'text-blue-600' : 'text-gray-400'}`}>
                                        {w.address.slice(0, 6)}...{w.address.slice(-4)}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => initiateRemoveWallet(w.address, e)}
                                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {wallets.length === 0 && (
                            <div className="text-center text-gray-400 text-sm py-10 italic">
                                No wallets tracked.
                            </div>
                        )}
                    </div>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                        <DialogContent className="bg-white border-gray-100 text-gray-900 sm:max-w-[400px] shadow-2xl rounded-3xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-red-600">Stop Tracking Wallet?</DialogTitle>
                                <DialogDescription className="text-gray-500">
                                    Are you sure you want to remove this wallet from your tracking list?
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-3 justify-end mt-4">
                                <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="hover:bg-gray-50 text-gray-500 hover:text-gray-900 rounded-xl">
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={confirmDelete} className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-100 rounded-xl font-bold shadow-none">
                                    Remove Wallet
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Main: Trade History */}
                <div className="lg:col-span-3 bg-white rounded-4xl border border-gray-100 shadow-card p-6 flex flex-col h-[500px] lg:h-full overflow-hidden relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-100 pb-6 gap-4 md:gap-0 shrink-0">
                        <div>
                            <h3 className="text-lg md:text-2xl font-bold text-gray-900 flex items-center gap-3">
                                {selectedWallet ? (
                                    <>
                                        <span className="truncate max-w-[200px] md:max-w-none">
                                            {wallets.find(w => w.address === selectedWallet)?.name ||
                                                `${selectedWallet.slice(0, 6)}...${selectedWallet.slice(-6)}`}
                                        </span>
                                        <a href={`https://polyscan.com/address/${selectedWallet}`} target="_blank" className="text-gray-300 hover:text-blue-500 transition-colors shrink-0">
                                            <ExternalLink size={20} />
                                        </a>
                                    </>
                                ) : "Select a wallet"}
                            </h3>
                            {selectedWallet && (
                                <p className="text-gray-500 font-mono text-xs md:text-sm mt-1 truncate max-w-[250px] md:max-w-none">{selectedWallet}</p>
                            )}
                        </div>
                        <div className="flex gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100 w-full md:w-auto overflow-x-auto">
                            <button
                                onClick={() => setViewMode("positions")}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm whitespace-nowrap ${viewMode === "positions" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Active Positions
                            </button>
                            <button
                                onClick={() => setViewMode("history")}
                                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm whitespace-nowrap ${viewMode === "history" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                Trade History
                            </button>
                        </div>
                    </div>

                    {isDataLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                            <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
                            <span className="font-medium text-sm">Scanning chain data...</span>
                        </div>
                    ) : viewMode === "history" ? (
                        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/30">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10 shadow-sm">
                                    <tr className="text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                                        <th className="py-4 pl-6">Time</th>
                                        <th className="py-4">Market</th>
                                        <th className="py-4 text-center">Type</th>
                                        <th className="py-4 text-right">Size</th>
                                        <th className="py-4 text-right">Price</th>
                                        <th className="py-4 text-right pr-6">Tx</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm bg-white divide-y divide-gray-50">
                                    {trades.map((t) => (
                                        <tr key={t.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="py-4 pl-6 text-gray-500 w-32">
                                                <div className="font-mono text-xs font-bold text-gray-900">
                                                    {new Date(t.timestamp * 1000).toLocaleDateString()}
                                                </div>
                                                <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                    {new Date(t.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="py-4 max-w-[200px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                                                        {t.icon ? <img src={t.icon} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold">?</div>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-gray-900 text-sm" title={t.market}>{t.market}</div>
                                                        <div className={`text-[10px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded ${t.outcome === 'YES' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                            {t.outcome}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${t.side === 'BUY' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                                    }`}>
                                                    {t.side}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right font-mono text-gray-600 font-medium">
                                                {parseFloat(t.size).toLocaleString()}
                                            </td>
                                            <td className="py-4 text-right font-mono text-gray-900 font-bold">
                                                {parseFloat(t.price).toFixed(2)}¢
                                            </td>
                                            <td className="py-4 text-right pr-6">
                                                <a
                                                    href={`https://polygonscan.com/tx/${t.transactionHash}`}
                                                    target="_blank"
                                                    className="text-blue-600 hover:text-blue-700 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-3 py-1.5 rounded-lg"
                                                >
                                                    View
                                                </a>
                                            </td>
                                        </tr>
                                    ))}
                                    {trades.length === 0 && selectedWallet && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20 text-gray-400 italic">
                                                No trade history found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50/30">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10 shadow-sm">
                                    <tr className="text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                                        <th className="py-4 pl-6">Market</th>
                                        <th className="py-4 text-right">Size</th>
                                        <th className="py-4 text-right">Value</th>
                                        <th className="py-4 text-right">Price</th>
                                        <th className="py-4 text-right pr-2">PnL</th>
                                        <th className="py-4 text-right w-[50px]"></th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm bg-white divide-y divide-gray-50">
                                    {positions.map((p, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                            <td className="py-4 pl-6 max-w-[240px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100 shadow-sm">
                                                        {p.icon ? <img src={p.icon} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400 font-bold">?</div>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold text-gray-900 text-sm" title={p.title}>{p.title}</div>
                                                        <div className={`text-[10px] font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded ${p.outcome === 'YES' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                            {p.outcome}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right font-mono text-gray-600 font-medium">
                                                {p.size.toLocaleString()}
                                            </td>
                                            <td className="py-4 text-right font-mono text-gray-900 font-bold">
                                                ${p.value.toFixed(2)}
                                            </td>
                                            <td className="py-4 text-right font-mono text-gray-600">
                                                {(p.price * 100).toFixed(1)}¢
                                            </td>
                                            <td className={`py-4 text-right pr-2 font-mono font-bold ${p.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                <div className="flex flex-col items-end">
                                                    <span>{p.pnl >= 0 ? '+' : '-'}${Math.abs(p.pnl).toFixed(2)}</span>
                                                    <span className="text-[10px] opacity-70 font-medium">
                                                        ({p.initialValue > 0 ? ((p.pnl / p.initialValue) * 100).toFixed(1) : '0.0'}%)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right pr-6">
                                                <PnLCard data={{
                                                    marketTitle: p.title,
                                                    outcome: p.outcome,
                                                    pnl: p.pnl,
                                                    pnlPercent: p.initialValue > 0 ? (p.pnl / p.initialValue) * 100 : 0,
                                                    bought: p.initialValue,
                                                    position: p.value
                                                }} />
                                            </td>
                                        </tr>
                                    ))}
                                    {positions.length === 0 && selectedWallet && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20 text-gray-400 italic">
                                                No active positions.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
