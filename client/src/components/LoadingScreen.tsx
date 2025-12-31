import { Bot } from "lucide-react";

interface LoadingScreenProps {
    message?: string;
    subMessage?: string;
    fullScreen?: boolean;
}

export function LoadingScreen({
    message = "Initializing PolyAgents...",
    subMessage = "Synchronizing agents and market data",
    fullScreen = true
}: LoadingScreenProps) {
    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-main backdrop-blur-xl"
        : "flex flex-col items-center justify-center h-[50vh] w-full";

    return (
        <div className={containerClasses}>
            {/* Pulsing Logo/Icon */}
            <div className="relative mb-8">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-24 h-24 bg-panel border-2 border-blue-500/30 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 animate-bounce-slow">
                    <Bot className="w-12 h-12 text-blue-400 animate-pulse" />
                </div>

                {/* Orbiting Ring */}
                <div className="absolute inset-[-10px] border border-blue-500/10 rounded-full w-[calc(100%+20px)] h-[calc(100%+20px)] animate-spin-slow border-t-blue-500/50" />
            </div>

            {/* Loading Bar */}
            <div className="w-64 h-1.5 bg-white/5 rounded-full overflow-hidden mb-6 relative">
                <div className="absolute inset-0 bg-blue-600/50 w-full h-full animate-progress-indeterminate origin-left" />
            </div>

            {/* Text */}
            <h3 className="text-xl font-bold text-white mb-2 animate-pulse">{message}</h3>
            <p className="text-sm text-gray-500">{subMessage}</p>
        </div>
    );
}
