import { useUserLogs } from "../lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "./ui/skeleton";
import { useState } from "react";

interface GlobalActivityFeedProps {
    userId: string | null;
}

export default function GlobalActivityFeed({ userId }: GlobalActivityFeedProps) {
    const { data: logs, isLoading } = useUserLogs(userId || "");
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    if (!userId) {
        return <div className="text-center text-muted-foreground p-4">Please connect wallet to view activity.</div>;
    }

    if (isLoading) {
        return (
            <div className="max-h-[700px] w-full rounded-md bg-panel p-4 overflow-hidden">
                <div className="space-y-4 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex items-start gap-4 p-3">
                            <Skeleton className="h-8 w-8 rounded-full bg-white/5" />
                            <div className="flex-1 space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-5 w-24 bg-white/5" />
                                    <Skeleton className="h-4 w-12 bg-white/5" />
                                </div>
                                <Skeleton className="h-4 w-full bg-white/5" />
                                <Skeleton className="h-4 w-2/3 bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "ANALYSIS": return "🔍";
            case "DECISION": return "💡";
            case "TRADE": return "⚡";
            case "RISK_BLOCK": return "🛡️";
            case "ERROR": return "❌";
            case "DATA_FETCH": return "📡";
            case "RISK_ASSESSMENT": return "✅";
            default: return "📝";
        }
    }

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case "TRADE": return "bg-green-100 text-green-700 border-green-200 shadow-sm";
            case "RISK_BLOCK": return "bg-orange-100 text-orange-700 border-orange-200 shadow-sm";
            case "ERROR": return "bg-red-100 text-red-700 border-red-200 shadow-sm";
            case "DECISION": return "bg-blue-100 text-blue-700 border-blue-200 shadow-sm";
            case "ANALYSIS": return "bg-purple-100 text-purple-700 border-purple-200 shadow-sm";
            case "DATA_FETCH": return "bg-cyan-100 text-cyan-700 border-cyan-200 shadow-sm";
            case "RISK_ASSESSMENT": return "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm";
            default: return "bg-gray-100 text-gray-600 border-gray-200 shadow-sm";
        }
    }

    return (
        <ScrollArea className="custom-height w-full rounded-4xl bg-white border border-gray-100 shadow-card p-2">
            <div className="space-y-4">
                {logs?.map((log: any) => {
                    const cleanMessage = log.message.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, "");
                    const time = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const isExpanded = expandedLog === log.id;

                    return (
                        <div
                            key={log.id}
                            className="p-3 my-4 rounded-xl hover:bg-gray-200/50 transition-colors border border-transparent hover:border-border/50 group cursor-pointer"
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                        >
                            <div className="flex items-start gap-4">
                                {/* Icon Column */}
                                <div className="shrink-0 mt-1">
                                    <span className="text-xl filter drop-shadow-md">{getIcon(log.type)}</span>
                                </div>

                                {/* Content Column */}
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={`${getBadgeStyle(log.type)} transition-all duration-300`}>
                                                {log.type}
                                            </Badge>
                                            {/* Agent Name Badge */}
                                            <Badge variant="secondary" className="bg-surface text-text-secondary border-border">
                                                🤖 {log.agent?.name || "Unknown Agent"}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-text-secondary font-mono opacity-70 group-hover:opacity-100 transition-opacity">
                                            {time}
                                        </span>
                                    </div>
                                    <p className="text-sm text-text-primary leading-relaxed">
                                        {cleanMessage}
                                    </p>

                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-border/30 space-y-2">
                                            {/* Special handling for ANALYSIS logs with signals */}
                                            {log.type === "ANALYSIS" && log.metadata?.signals && log.metadata.signals.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs text-text-secondary uppercase font-bold">Detected Signals</p>
                                                    {log.metadata.signals.map((signal: any, idx: number) => (
                                                        <div key={idx} className="bg-surface/50 p-2 rounded border border-border/20">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-blue-400">{signal.confidence}%</span>
                                                                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${signal.direction === 'BULLISH' ? 'bg-green-500/20 text-green-400' :
                                                                    signal.direction === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                                                                        'bg-gray-500/20 text-gray-400'
                                                                    }`}>{signal.direction}</span>
                                                                <span className="text-xs text-text-primary">{signal.topic}</span>
                                                            </div>
                                                            <p className="text-[11px] text-text-primary mb-1">{signal.headline}</p>
                                                            <p className="text-[10px] italic text-text-secondary">"{signal.reasoning}"</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Special handling for DECISION logs */}
                                            {log.type === "DECISION" && log.metadata?.decision && (
                                                <div className="space-y-2">
                                                    <p className="text-xs text-text-secondary uppercase font-bold">Decision Details</p>
                                                    <div className="bg-surface/50 p-2 rounded border border-border/20">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`text-xs font-bold px-2 py-1 rounded ${log.metadata.decision.action === 'TRADE' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                                                }`}>{log.metadata.decision.action}</span>
                                                            {log.metadata.decision.action === 'TRADE' && (
                                                                <>
                                                                    <span className="text-xs text-text-secondary">{log.metadata.decision.side}</span>
                                                                    <span className="text-xs text-text-primary font-bold">{log.metadata.decision.outcome}</span>
                                                                    {log.metadata.decision.amount && (
                                                                        <span className="text-xs text-blue-400">${log.metadata.decision.amount}</span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                        {log.metadata.marketQuestion && (
                                                            <p className="text-[11px] text-text-primary mb-1">Market: {log.metadata.marketQuestion}</p>
                                                        )}
                                                        <p className="text-[10px] italic text-text-secondary">"{log.metadata.decision.reason}"</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Raw metadata */}
                                            <details className="mt-2">
                                                <summary className="text-xs text-text-secondary cursor-pointer hover:text-text-primary">Raw Metadata</summary>
                                                <pre className="text-[10px] font-mono bg-surface/50 p-2 rounded overflow-x-auto text-text-secondary mt-1">
                                                    {JSON.stringify(log.metadata, null, 2)}
                                                </pre>
                                            </details>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
                {!logs?.length && (
                    <div className="text-center text-text-secondary py-10 flex flex-col items-center gap-2">
                        <span className="text-4xl opacity-20">💤</span>
                        <p>No activity recorded yet.</p>
                    </div>
                )}
            </div>
        </ScrollArea>
    );
}
