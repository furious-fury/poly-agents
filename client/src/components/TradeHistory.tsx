
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Ghost, PlusCircle, MinusCircle } from "lucide-react";
import { useTrades } from "../lib/api";
import { formatDistanceToNow } from "date-fns";

interface TradeHistoryProps {
    userId: string | null;
    className?: string;
}

export default function TradeHistory({ userId, className }: TradeHistoryProps) {
    const { data: trades, isLoading } = useTrades(userId || "");
    const isEmpty = !isLoading && (!trades || trades.length === 0);

    return (
        <div className={`flex flex-col ${className || 'h-[400px]'}`}>
            {isLoading && (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Loading history...
                </div>
            )}

            {isEmpty && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                    <div className="p-4 bg-gray-50 rounded-full border border-gray-100">
                        <Ghost size={32} className="text-gray-300" />
                    </div>
                    <div>
                        <h4 className="text-gray-900 font-bold">No trade history</h4>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                            Your executed trades will appear here.
                        </p>
                    </div>
                </div>
            )}

            {!isLoading && !isEmpty && (
                <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2 min-h-0 rounded-2xl border border-gray-100 bg-gray-50/30">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-md z-10 shadow-sm">
                            <TableRow className="border-b border-gray-100 hover:bg-transparent text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <TableHead className="pl-6 w-[120px] py-4">Activity</TableHead>
                                <TableHead className="py-4">Market</TableHead>
                                <TableHead className="text-right pr-6 py-4">Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {trades?.map((trade: any) => {
                                const isBuy = trade.side === "BUY";
                                const value = parseFloat(trade.size) * parseFloat(trade.price);
                                const timeAgo = trade.timestamp
                                    ? formatDistanceToNow(trade.timestamp * 1000, { addSuffix: true })
                                    : "Just now";

                                return (
                                    <TableRow key={trade.id || trade.transactionHash} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors group">
                                        {/* ACTIVITY */}
                                        <TableCell className="pl-6 py-4 align-top">
                                            <div className="flex items-center gap-2">
                                                {isBuy ? (
                                                    <PlusCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <MinusCircle className="w-4 h-4 text-gray-400 shrink-0" />
                                                )}
                                                <span className="font-bold text-gray-900 text-sm">
                                                    {isBuy ? "Bought" : "Sold"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* MARKET */}
                                        <TableCell className="py-4 align-top">
                                            <div className="flex gap-3">
                                                {/* Market Icon */}
                                                <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shrink-0 mt-0.5 border border-gray-100 shadow-sm">
                                                    {trade.icon ? (
                                                        <img src={trade.icon} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs text-secondary">?</div>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <p className="text-gray-900 font-bold text-sm truncate leading-tight pr-4" title={trade.market}>
                                                        {trade.market}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs flex-wrap">
                                                        <span className={`px-1.5 py-0.5 rounded font-bold ${trade.outcome?.toUpperCase() === 'YES' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                                                            }`}>
                                                            {trade.outcome || "YES"}
                                                        </span>
                                                        <span className="text-gray-500 font-medium">
                                                            {(parseFloat(trade.price) * 100).toFixed(1)}¢
                                                        </span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-gray-500">
                                                            {parseFloat(trade.size).toFixed(1)} shares
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* VALUE */}
                                        <TableCell className="pr-6 py-4 align-top text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`font-mono text-sm font-bold ${isBuy ? 'text-gray-900' : 'text-emerald-600'}`}>
                                                    {isBuy ? "-" : "+"}${value.toFixed(2)}
                                                </span>
                                                <span className="text-xs text-gray-400 whitespace-nowrap font-medium">
                                                    {timeAgo}
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
