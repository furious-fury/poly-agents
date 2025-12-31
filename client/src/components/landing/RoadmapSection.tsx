import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { RoadmapCard } from './RoadmapCard';

export function RoadmapSection() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    // Transform scroll progress to line progress (adjust range as needed)
    const scaleX = useTransform(scrollYProgress, [0.2, 0.6], [0, 1]);

    return (
        <section className="py-24 relative overflow-hidden" ref={containerRef}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-900/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                        Roadmap
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">The Future of PolyAgents</h2>
                    <p className="text-gray-400 max-w-xl mx-auto">We're just getting started. Here's what's coming next.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connecting Line (Desktop) - Scrubbable Animation */}
                    <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5 z-0 rounded-full overflow-hidden bg-white/5">
                        <motion.div
                            style={{ scaleX, transformOrigin: "left" }}
                            className="w-full h-full bg-linear-to-r from-blue-500 to-purple-500"
                        />
                    </div>

                    <div className="relative z-10 h-full">
                        <RoadmapCard
                            phase="Phase 1"
                            time="Current"
                            title="Beta Launch"
                            status="active"
                            items={["Core Agent Engine", "Polymarket Integration", "Real time News Analysis", "Risk Controls", "Token Launch"]}
                        />
                    </div>
                    <div className="relative z-10 h-full">
                        <RoadmapCard
                            phase="Phase 2"
                            time="Q1 2026"
                            title="Expansion"
                            status="upcoming"
                            items={["Mobile App (iOS/Android)", "Social Trading & Leaderboards", "Advanced Portfolio Analytics", "Fully Custom Agent", "Customizable PnL", "Revenue share for users.", "Premium Version"]}
                        />
                    </div>
                    <div className="relative z-10 h-full">
                        <RoadmapCard
                            phase="Phase 3"
                            time="Q2 2026"
                            title="Decentralization"
                            status="upcoming"
                            items={["DAO Governance", "Decentralized Agent Network", "Cross Chain Support"]}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
