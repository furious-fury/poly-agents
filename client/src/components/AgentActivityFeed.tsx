import { useAgentLogs } from "../lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Log {
    id: string;
    type: "ANALYSIS" | "DECISION" | "TRADE" | "RISK_BLOCK" | "ERROR" | "DATA_FETCH" | "RISK_ASSESSMENT";
    message: string;
    metadata?: any;
    createdAt: string;
}

export default function AgentActivityFeed({ agentId }: { agentId: string }) {
    const { data: logs, isLoading } = useAgentLogs(agentId);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);

    const getLogStyle = (type: string) => {
        switch (type) {
            case "DATA_FETCH": return "bg-purple-500/10 border-purple-500/20 text-purple-200";
            case "ANALYSIS": return "bg-blue-500/10 border-blue-500/20 text-blue-200";
            case "DECISION": return "bg-gray-500/10 border-gray-500/20 text-gray-200";
            case "TRADE": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-200";
            case "RISK_BLOCK": return "bg-red-500/10 border-red-500/20 text-red-200";
            case "RISK_ASSESSMENT": return "bg-teal-500/10 border-teal-500/20 text-teal-200";
            case "ERROR": return "bg-red-900/10 border-red-900/20 text-red-400";
            default: return "bg-gray-800 border-gray-700 text-gray-300";
        }
    };

    const getBadgeStyle = (type: string) => {
        switch (type) {
            case "DATA_FETCH": return "bg-purple-500/10 text-purple-400 border-purple-500/50 hover:bg-purple-500/20";
            case "ANALYSIS": return "bg-blue-500/10 text-blue-400 border-blue-500/50 hover:bg-blue-500/20";
            case "DECISION": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/20";
            case "TRADE": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/20";
            case "RISK_BLOCK": return "bg-red-500/10 text-red-400 border-red-500/50 hover:bg-red-500/20";
            case "RISK_ASSESSMENT": return "bg-teal-500/10 text-teal-400 border-teal-500/50 hover:bg-teal-500/20";
            case "ERROR": return "bg-red-900/20 text-red-500 border-red-500/50 hover:bg-red-900/30";
            default: return "bg-gray-800 text-gray-400 border-gray-700";
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "DATA_FETCH": return "📡";
            case "ANALYSIS": return "🧠";
            case "DECISION": return "⚖️";
            case "TRADE": return "🚀";
            case "RISK_BLOCK": return "🛑";
            case "RISK_ASSESSMENT": return "🛡️";
            case "ERROR": return "⚠️";
            default: return "📝";
        }
    };

    if (isLoading) return <div className="text-xs text-gray-500">Loading activity...</div>;
    if (!logs?.length) return <div className="text-xs text-gray-500">No activity recorded yet.</div>;

    return (
        <ScrollArea className="h-[300px] w-full rounded-md border border-gray-800 p-4 bg-black/20">
            <div className="space-y-3">
                {logs.map((log: Log) => {
                    // Strip leading emojis to prevent double rendering (Legacy fix)
                    const cleanMessage = log.message.replace(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u, "");

                    // Check for reasoning in different metadata locations
                    const reasoning = log.metadata?.reason || log.metadata?.decision?.reason;

                    return (
                        <div
                            key={log.id}
                            className={`p-3 rounded-lg border text-sm ${getLogStyle(log.type)} transition-all cursor-pointer hover:opacity-90`}
                            onClick={() => {
                                // console.log('Log clicked:', log.id, 'Current expanded:', expandedLog);
                                setExpandedLog(expandedLog === log.id ? null : log.id);
                            }}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-mono text-[10px] opacity-60">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                </span>
                                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${getBadgeStyle(log.type)}`}>
                                    {log.type}
                                </Badge>
                            </div>

                            <div className="flex gap-2 items-start">
                                <span className="mt-0.5">{getIcon(log.type)}</span>
                                <p className="leading-snug">{cleanMessage}</p>
                            </div>

                            {expandedLog === log.id && (
                                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                    {/* Special handling for ANALYSIS logs */}
                                    {log.type === "ANALYSIS" && log.metadata?.signals && log.metadata.signals.length > 0 && (
                                        <div className="space-y-2 mb-3">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Detected Signals</p>
                                            {log.metadata.signals.map((signal: any, idx: number) => (
                                                <div key={idx} className="bg-black/40 p-2 rounded border border-white/5">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-blue-400">{signal.confidence}%</span>
                                                        <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${signal.direction === 'BULLISH' ? 'bg-green-500/20 text-green-400' :
                                                            signal.direction === 'BEARISH' ? 'bg-red-500/20 text-red-400' :
                                                                'bg-gray-500/20 text-gray-400'
                                                            }`}>{signal.direction}</span>
                                                        <span className="text-xs text-gray-300">{signal.topic}</span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-200 mb-1">{signal.headline}</p>
                                                    <p className="text-[10px] italic text-gray-400">"{signal.reasoning}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Show reasoning for DECISION logs */}
                                    {reasoning && log.type !== "ANALYSIS" && (
                                        <div className="bg-black/40 p-2 rounded border border-white/5">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">AI Reasoning</p>
                                            <p className="text-xs italic text-gray-300 leading-relaxed">"{reasoning}"</p>
                                        </div>
                                    )}

                                    {/* Raw metadata (collapsed by default for ANALYSIS) */}
                                    <details className={log.type === "ANALYSIS" ? "mt-2" : ""}>
                                        <summary className="text-[10px] text-gray-500 cursor-pointer hover:text-gray-400">Raw Metadata</summary>
                                        <pre className="text-[10px] font-mono bg-black/40 p-2 rounded overflow-x-auto text-gray-500 mt-1">
                                            {JSON.stringify(log.metadata, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
