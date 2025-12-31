import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Ghost, History, Activity } from "lucide-react";
import { useUserPositions, useTrades, useUserBalance, usePortfolioHistory, useClosePosition } from "../lib/api";
import TradeHistory from "./TradeHistory";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PnLCard } from "./PnLCard";

interface ActivePositionsProps {
    userId: string | null;
    className?: string;
}

export default function ActivePositions({ userId, className }: ActivePositionsProps) {
    const [tab, setTab] = useState<"positions" | "history">("positions");

    // Hooks
    const { data: positions, isLoading } = useUserPositions(userId || "");
    useTrades(userId || "");
    useUserBalance(userId || "");
    usePortfolioHistory(userId || "");

    const [closingId, setClosingId] = useState<string | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<any | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const isEmpty = !isLoading && (!positions || positions.length === 0);

    const closePositionMutation = useClosePosition();

    const handleClosePosition = async () => {
        if (!userId || !selectedPosition) return;

        const { marketId, outcome } = selectedPosition;
        setClosingId(marketId);
        setIsDialogOpen(false); // Close dialog immediately

        try {
            await closePositionMutation.mutateAsync({
                userId,
                marketId,
                outcome
            });

            toast.success(`Successfully sold ${outcome} position!`);

            // Refetch is handled by mutation onSuccess (invalidating queries)
            // But we can keep explicit refetch here if we want double assurance, 
            // though invalidateQueries is cleaner.
            // Let's rely on invalidateQueries in the hook.

        } catch (e: any) {
            toast.error("Failed to close position: " + e.message);
        } finally {
            setClosingId(null);
            setSelectedPosition(null);
        }
    };

    const confirmClose = (pos: any) => {
        setSelectedPosition(pos);
        setIsDialogOpen(true);
    };

    return (
        <Card className={`bg-white border border-gray-100 shadow-card p-6 overflow-hidden flex flex-col ${className || 'h-[400px]'} rounded-4xl`}>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-white border-gray-100 text-gray-900 shadow-2xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Confirm Sale</DialogTitle>
                        <DialogDescription className="text-gray-500">
                            Are you sure you want to CLOSE your <span className="text-gray-900 font-bold">{selectedPosition?.outcome}</span> position on market <span className="text-gray-900 font-bold">{selectedPosition?.marketTitle || selectedPosition?.marketId}</span>?
                            <br /><br />
                            This will sell all shares immediately at the best available market price.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="hover:bg-gray-50 hover:text-gray-900 text-gray-500 rounded-xl">Cancel</Button>
                        <Button onClick={handleClosePosition} className="bg-red-500 hover:bg-red-600 text-white border-0 font-bold rounded-xl shadow-lg shadow-red-500/20">
                            Confirm Sell
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 shrink-0 gap-4 md:gap-0">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Portfolio Activity</h3>
                    <p className="text-gray-500 text-sm">Manage predictions and view history.</p>
                </div>
                <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-full md:w-auto">
                    <button
                        onClick={() => setTab("positions")}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${tab === "positions"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        Active Positions
                    </button>
                    <button
                        onClick={() => setTab("history")}
                        className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${tab === "history"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        Trade History
                    </button>
                </div>
            </div>

            {tab === "history" ? (
                <TradeHistory userId={userId} className="flex-1 min-h-0" />
            ) : (
                <>
                    {isLoading && (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            Loading positions...
                        </div>
                    )}

                    {isEmpty && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                            <div className="p-4 bg-gray-50 rounded-full border border-gray-100">
                                <Ghost size={32} className="text-gray-300" />
                            </div>
                            <div>
                                <h4 className="text-gray-900 font-bold">No active open positions</h4>
                                <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                                    Your active trades will appear here. Start trading to build your portfolio.
                                </p>
                            </div>
                        </div>
                    )}

                    {!isLoading && !isEmpty && (
                        <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2 min-h-0 rounded-2xl border border-gray-100 bg-gray-50/30">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-md z-10 shadow-sm">
                                    <TableRow className="border-b border-gray-100 hover:bg-transparent text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                        <TableHead className="pl-6 w-[40%] py-4">Market</TableHead>
                                        <TableHead className="text-right py-4">Avg <span className="text-gray-400">→</span> Now</TableHead>
                                        <TableHead className="text-right py-4">Bet</TableHead>
                                        <TableHead className="text-right py-4">To Win</TableHead>
                                        <TableHead className="text-right py-4">Value</TableHead>
                                        <TableHead className="w-[120px] py-4"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {positions?.map((pos: any) => {
                                        const isProfit = (pos.percentPnl || 0) >= 0;
                                        const toWin = pos.shares * 1.0; // Max payout if outcome occurs

                                        return (
                                            <TableRow key={pos.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                                                {/* MARKET */}
                                                <TableCell className="pl-6 py-4 align-top">
                                                    <div className="flex gap-3">
                                                        {/* Icon */}
                                                        <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shrink-0 mt-0.5 border border-gray-100 shadow-sm">
                                                            {pos.icon ? (
                                                                <img src={pos.icon} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">?</div>
                                                            )}
                                                        </div>

                                                        {/* Details */}
                                                        <div className="flex flex-col gap-1 min-w-0">
                                                            <p className="text-gray-900 font-bold text-sm truncate leading-tight pr-4" title={pos.marketTitle}>
                                                                {pos.marketTitle}
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className={`px-1.5 py-0.5 rounded font-bold ${pos.outcome?.toUpperCase() === 'YES' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                                                    }`}>
                                                                    {pos.outcome} {pos.currentPrice?.toFixed(2)}¢
                                                                </span>
                                                                <span className="text-gray-500 font-medium">
                                                                    {pos.shares} shares
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* AVG -> NOW */}
                                                <TableCell className="text-right font-mono text-sm py-4 align-top">
                                                    <div className="flex items-center justify-end gap-1.5 mt-1 font-medium">
                                                        <span className="text-gray-400">{(pos.avgEntryPrice * 100).toFixed(1)}¢</span>
                                                        <span className="text-gray-300">→</span>
                                                        <span className="text-gray-900 font-bold">{(pos.currentPrice * 100).toFixed(1)}¢</span>
                                                    </div>
                                                </TableCell>

                                                {/* BET (Initial Value) */}
                                                <TableCell className="text-right py-4 align-top">
                                                    <p className="text-gray-500 font-mono text-sm mt-1 font-medium">
                                                        ${pos.initialValue?.toFixed(2) || "0.00"}
                                                    </p>
                                                </TableCell>

                                                {/* TO WIN (Max Payout) */}
                                                <TableCell className="text-right py-4 align-top">
                                                    <p className="text-emerald-600 font-mono text-sm mt-1 font-bold">
                                                        ${toWin.toFixed(2)}
                                                    </p>
                                                </TableCell>

                                                {/* VALUE (Current + PnL) */}
                                                <TableCell className="text-right py-4 align-top">
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-gray-900 font-bold font-mono text-sm">
                                                            ${pos.exposure?.toFixed(2) || "0.00"}
                                                        </span>
                                                        <span className={`text-xs font-mono whitespace-nowrap font-bold ${isProfit ? "text-emerald-600" : "text-red-500"}`}>
                                                            {isProfit ? "+" : ""}{pos.pnl?.toFixed(2)} ({pos.percentPnl?.toFixed(2)}%)
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* ACTIONS */}
                                                <TableCell className="text-right pr-6 py-4 align-middle">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <PnLCard data={{
                                                            marketTitle: pos.marketTitle,
                                                            outcome: pos.outcome,
                                                            pnl: pos.pnl || 0,
                                                            pnlPercent: pos.percentPnl || 0,
                                                            bought: pos.initialValue || 0,
                                                            position: pos.exposure || 0
                                                        }} />
                                                        <button
                                                            onClick={() => confirmClose(pos)}
                                                            disabled={!!closingId}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                                                        >
                                                            {closingId === pos.marketId ? (
                                                                <Activity className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                "Sell"
                                                            )}
                                                        </button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
