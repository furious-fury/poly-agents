
import { useOpenOrders, useCancelOrder } from '../lib/api';
import { toast } from 'sonner';
import { Ghost, X } from 'lucide-react';
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface OpenOrdersProps {
    userId: string;
    className?: string;
}

export default function OpenOrders({ userId, className }: OpenOrdersProps) {
    const { data: orders, isLoading, refetch } = useOpenOrders(userId);
    const cancelMutation = useCancelOrder();

    const handleCancel = async (orderId: string) => {
        try {
            await cancelMutation.mutateAsync({ userId, orderId });
            toast.success("Order Cancelled");
            refetch();
        } catch (error) {
            toast.error("Failed to cancel order");
        }
    };

    const isEmpty = !isLoading && (!orders || orders.length === 0);

    const getExpirationText = (order: any) => {
        if (!order.expiration || order.expiration === "0") return "Until Cancelled";
        return new Date(Number(order.expiration) * 1000).toLocaleString();
    }

    return (
        <Card className={`bg-white border border-gray-100 shadow-card p-6 overflow-hidden flex flex-col ${className || 'h-[400px]'} rounded-4xl`}>
            {isLoading && (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                    Loading open orders...
                </div>
            )}

            {isEmpty && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                    <div className="p-4 bg-gray-50 rounded-full border border-gray-100">
                        <Ghost size={32} className="text-gray-300" />
                    </div>
                    <div>
                        <h4 className="text-gray-900 font-bold">No open orders</h4>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                            Active limit orders will appear here.
                        </p>
                    </div>
                </div>
            )}

            {!isLoading && !isEmpty && (
                <div className="overflow-y-auto custom-scrollbar flex-1 -mr-2 pr-2 min-h-0 rounded-2xl border border-gray-100 bg-gray-50/30">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-md z-10 shadow-sm">
                            <TableRow className="border-b border-gray-100 hover:bg-transparent text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <TableHead className="pl-6 w-[35%] py-4">Market</TableHead>
                                <TableHead className="text-center py-4">Side</TableHead>
                                <TableHead className="text-center py-4">Outcome</TableHead>
                                <TableHead className="text-right py-4">Price</TableHead>
                                <TableHead className="text-center py-4">Filled</TableHead>
                                <TableHead className="text-right py-4">Total</TableHead>
                                <TableHead className="text-center py-4">Expiration</TableHead>
                                <TableHead className="text-right py-4 pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order: any) => (
                                <TableRow key={order.orderID} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                    {/* MARKET */}
                                    <TableCell className="pl-6 py-4 align-top">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shrink-0 mt-0.5 border border-gray-100 shadow-sm">
                                                {order.marketImage ? (
                                                    <img src={order.marketImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">?</div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1 min-w-0">
                                                <p className="text-gray-900 font-bold text-sm truncate leading-tight pr-4" title={order.marketTitle || order.market}>
                                                    {order.marketTitle || "Unknown Market"}
                                                </p>
                                                {(!order.marketTitle || order.marketTitle === "Unknown Market") && (
                                                    <span className="text-[10px] text-gray-400 font-mono truncate">{order.orderID}</span>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* SIDE */}
                                    <TableCell className="py-4 align-top text-center">
                                        <span className={`font-bold text-xs ${order.side === 'BUY' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {order.side === 'BUY' ? 'Buy' : 'Sell'}
                                        </span>
                                    </TableCell>

                                    {/* OUTCOME */}
                                    <TableCell className="py-4 align-top text-center">
                                        <span className={`font-bold text-xs px-2 py-1 rounded bg-gray-100 text-gray-600`}>
                                            {order.outcome}
                                        </span>
                                    </TableCell>

                                    {/* PRICE */}
                                    <TableCell className="text-right py-4 align-top font-mono text-sm text-gray-700 font-bold">
                                        {Number(order.price * 100).toFixed(1)}¢
                                    </TableCell>

                                    {/* FILLED */}
                                    <TableCell className="text-center py-4 align-top font-mono text-sm text-gray-500">
                                        <span className="text-gray-900 font-bold">{Math.floor(Number(order.sizeMatched))}</span>
                                        <span className="text-gray-400"> / </span>
                                        <span>{Math.floor(Number(order.originalSize))}</span>
                                    </TableCell>

                                    {/* TOTAL */}
                                    <TableCell className="text-right py-4 align-top font-mono text-sm text-gray-900 font-bold">
                                        ${(Number(order.price) * Number(order.originalSize)).toFixed(2)}
                                    </TableCell>

                                    {/* EXPIRATION */}
                                    <TableCell className="text-center py-4 align-top text-xs text-gray-500 font-medium">
                                        {getExpirationText(order)}
                                    </TableCell>

                                    {/* ACTION */}
                                    <TableCell className="text-right py-4 align-top pr-6">
                                        <button
                                            onClick={() => handleCancel(order.orderID)}
                                            disabled={cancelMutation.isPending}
                                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                            title="Cancel Order"
                                        >
                                            {cancelMutation.isPending ? "..." : <X size={18} />}
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    );
}
