import { useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PnLCardProps {
    data: {
        marketTitle: string;
        outcome: string;
        pnl: number;
        pnlPercent: number; // e.g. 1789.56
        bought: number;
        position: number;
        side?: string;
    };
}

export function PnLCard({ data }: PnLCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    const downloadImage = useCallback(async () => {
        if (!cardRef.current) return;
        try {
            // First attempt: try capturing everything including fonts
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
            triggerDownload(dataUrl);
        } catch (err) {
            console.error("Failed to generate image with fonts, retrying without...", err);
            try {
                // Second attempt: skip fonts if CORS/SecurityError occurs
                const dataUrl = await toPng(cardRef.current, {
                    cacheBust: true,
                    pixelRatio: 2,
                    skipFonts: true
                });
                triggerDownload(dataUrl);
            } catch (retryErr) {
                console.error("Failed to generate image fallback", retryErr);
                alert("Failed to generate image. Please checking your browser console.");
            }
        }
    }, [cardRef]);

    const triggerDownload = (dataUrl: string) => {
        const link = document.createElement("a");
        link.download = `athena-pnl-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    };

    const isProfit = data.pnl >= 0;
    const pnlSign = isProfit ? "+" : "";
    const pnlColor = isProfit ? "text-green-600" : "text-red-500";

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-400 hover:text-white hover:bg-blue-500/20">
                    <Share2 size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-transparent border-none text-white shadow-none max-w-4xl w-full p-0 sm:p-8 flex flex-col items-center">
                <DialogTitle className="sr-only">PnL Card</DialogTitle>
                <DialogDescription className="sr-only">
                    Shareable card showing your Profit and Loss for {data.marketTitle}
                </DialogDescription>
                {/* Visual Card Container - Ticket Style */}
                <div className="w-full overflow-x-auto flex justify-center pb-8 px-4 sm:px-0 scrollbar-hide">
                    <div
                        ref={cardRef}
                        className="relative w-full aspect-[1.91/1] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-gray-100 text-black flex font-sans shrink-0"
                    >
                        {/* Pattern Overlay */}
                        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] pointer-events-none"></div>

                        {/* Left Section (Market Info) */}
                        <div className="flex-1 p-3 sm:p-6 flex flex-col justify-between relative bg-transparent z-10">
                            {/* Perforation Dots (Right side of left panel) */}
                            <div className="absolute right-0 top-0 bottom-0 w-px border-r-2 border-dashed border-gray-300/50"></div>
                            {/* Semi-circles for cutoff effect */}
                            <div className="absolute -top-3 -right-3 w-6 h-6 bg-[#09090b] rounded-full z-20"></div>
                            <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-[#09090b] rounded-full z-20"></div>

                            {/* Top: Avatar/Icon */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-black flex items-center justify-center shrink-0 shadow-lg">
                                    <img src="/polyAgent.jpg" alt="Logo" className="w-full h-full object-cover opacity-90 rounded-lg sm:rounded-xl" />
                                </div>
                                <div className="px-2 sm:px-3 py-1 bg-sky-500/10 border border-black/5 rounded-full text-[8px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider backdrop-blur-sm">
                                    PolyAgents
                                </div>
                            </div>

                            {/* Middle: Market Title */}
                            <div className="mt-2 sm:mt-4">
                                <h2 className="text-sm sm:text-2xl font-extrabold leading-tight text-gray-900 line-clamp-3">
                                    {data.marketTitle}
                                </h2>
                            </div>

                            {/* Bottom: Branding */}
                            <div className="mt-auto pt-2 sm:pt-4 flex items-center gap-2 text-gray-400">
                                <div className="flex items-center gap-2 text-[10px] sm:text-xs">
                                </div>
                            </div>
                        </div>

                        {/* Right Section (Stats) */}
                        <div className="w-[35%] bg-black/5 p-3 sm:p-6 flex flex-col justify-center relative z-10">
                            {/* Outcome Header */}
                            <div className="mb-2 sm:mb-4">
                                <h3 className={`text-sm sm:text-xl font-bold ${data.outcome === "Yes" ? "text-green-600" : "text-red-500"}`}>
                                    Bought {data.outcome}
                                </h3>
                            </div>

                            {/* Stats Grid */}
                            <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-4">
                                <div className="flex justify-between items-center text-[10px] sm:text-xs font-medium">
                                    <span className="text-gray-500">Cost</span>
                                    <span className="text-gray-900 font-mono">${data.bought.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] sm:text-xs font-medium">
                                    <span className="text-gray-500">ROI</span>
                                    <span className={`font-mono ${pnlColor}`}>{pnlSign}{data.pnlPercent.toFixed(1)}%</span>
                                </div>
                                <div className="w-full h-px bg-gray-300/50 my-1 sm:my-2"></div>
                            </div>

                            {/* Big Number (Value/PnL) */}
                            <div>
                                <span className="text-[8px] sm:text-xs font-medium text-gray-400 block mb-0.5 sm:mb-1 uppercase tracking-wide">Current Value</span>
                                <div className="text-lg sm:text-3xl font-black tracking-tighter text-gray-900">
                                    ${data.position.toFixed(0)}
                                </div>
                                <div className={`text-[10px] sm:text-xs font-bold mt-0.5 sm:mt-1 ${isProfit ? "text-green-600" : "text-red-500"}`}>
                                    ({pnlSign}${data.pnl.toFixed(2)})
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-4">
                    <Button onClick={downloadImage} className="bg-blue-600 hover:bg-blue-500 text-white gap-2 rounded-full px-6 shadow-lg shadow-blue-500/20">
                        <Download size={18} /> Download Image
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
