import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Share2, Rocket } from "lucide-react";

export default function OnboardingModal() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem("hasSeenOnboarding");
        if (!hasSeen) {
            // Small delay for better UX
            const timer = setTimeout(() => setOpen(true), 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setOpen(false);
        localStorage.setItem("hasSeenOnboarding", "true");
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-[#0f1115] border border-white/10 text-white max-w-2xl shadow-2xl p-0 overflow-hidden">
                {/* Hero Section */}
                <div className="relative h-32 bg-linear-to-r from-blue-900 via-purple-900 to-black flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20"></div>
                    <DialogHeader className="z-10 text-center sm:text-center space-y-0">
                        <DialogTitle className="text-3xl font-black font-orbitron tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-white to-blue-200">
                            WELCOME TO POLYAGENTS
                        </DialogTitle>
                        <DialogDescription className="text-blue-200/60 text-sm tracking-widest uppercase mt-1">
                            Next-Gen Autonomous Trading
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-8 space-y-8">
                    <div className="space-y-6">
                        {/* Feature 1: Multi-Brain */}
                        <div className="flex gap-4 items-start group">
                            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                <BrainCircuit className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Deepmind Architecture</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    PolyAgents now supports multiple AI brains. Choose between <span className="text-white font-bold">OpenAI</span>, <span className="text-white font-bold">Claude (Anthropic)</span>, and <span className="text-white font-bold">Gemini</span> to power your agents. Each offers unique reasoning capabilities for different market conditions.
                                </p>
                            </div>
                        </div>

                        {/* Feature 2: PnL Cards */}
                        <div className="flex gap-4 items-start group">
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 group-hover:bg-green-500/20 transition-colors">
                                <Share2 className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Visual PnL Sharing</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Flex your wins with style. Generate beautiful, shareable <span className="text-white font-bold">PnL Cards</span> directly from your active positions. Perfect for sharing your alpha on X (formerly Twitter).
                                </p>
                            </div>
                        </div>

                        {/* Feature 3: Smart Routing (Implicit) */}
                        <div className="flex gap-4 items-start group">
                            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                                <Rocket className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">Enhanced Autonomy</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">
                                    Agents now feature improved risk controls and smarter default strategies. Deploy a "Risk Taker" or "Conservative" agent in seconds and let PolyAgents handle the execution.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={handleClose}
                            className="w-full bg-white text-black hover:bg-gray-200 font-bold py-6 text-lg tracking-wide rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all hover:scale-[1.02]"
                        >
                            Let's Go
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
