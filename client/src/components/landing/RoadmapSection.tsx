import { motion } from "framer-motion";
import { Zap, Rocket } from "lucide-react";

const roadmapItems = [
    {
        phase: "Phase 1",
        title: "Launch",
        date: "Jan 2026",
        status: "current",
        description: "Initial release of the core platform, featuring fully autonomous trading agents and real-time execution on Polymarket.",
        icon: Rocket,
        items: ["AI Trading Agents (Trend & Mean Reversion)", "Real-time Polymarket Integration", "Risk Management Dashboard", "Multi-LLM Support (GPT-4, Claude)"]
    },
    {
        phase: "Phase 2",
        title: "Expansion",
        date: "Feb 2026",
        status: "upcoming",
        description: "Scaling the ecosystem with advanced tools for strategy creation, mobile accessibility, and social features.",
        icon: Zap,
        items: ["No-Code Strategy Builder", "iOS & Android Mobile Apps", "Social Trading & Leaderboards", "Advanced Backtesting Engine"]
    },

];

export const RoadmapSection = () => {
    return (
        <section className="py-24 bg-white relative overflow-hidden">
            {/* Minimal Background Accents */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50/50 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6"
                    >
                        Strategic Vision
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 tracking-tight"
                    >
                        Project <span className="text-blue-600">Roadmap</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-gray-600 max-w-2xl mx-auto"
                    >
                        Our journey to revolutionize prediction market trading with autonomous AI agents.
                    </motion.p>
                </div>

                <div className="relative">
                    {/* Center Line (Desktop) */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2 hidden md:block" />

                    <div className="space-y-12 md:space-y-24">
                        {roadmapItems.map((item, index) => {
                            const isEven = index % 2 === 0;
                            const isCurrent = item.status === "current";
                            const isCompleted = item.status === "completed";

                            return (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ duration: 0.7, delay: index * 0.1 }}
                                    className={`relative flex flex-col md:flex-row gap-8 md:gap-0 items-center ${isEven ? 'md:flex-row-reverse' : ''}`}
                                >
                                    {/* Content Card */}
                                    <div className="flex-1 w-full md:w-1/2">
                                        <div className={`relative p-8 rounded-4xl border transition-all duration-300 group ${isCurrent ? 'bg-white border-blue-200 shadow-xl shadow-blue-900/5' : 'bg-gray-50 border-gray-100 hover:shadow-lg'} ${isEven ? 'md:mr-16' : 'md:ml-16'}`}>

                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${isCurrent ? 'bg-blue-100 text-blue-700' : isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                    {item.status === 'current' ? 'Current Stage' : item.status === 'completed' ? 'Completed' : 'Upcoming'}
                                                </div>
                                                <span className={`font-mono text-sm font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>{item.date}</span>
                                            </div>

                                            <div className="flex items-center gap-4 mb-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCurrent ? 'bg-blue-50 text-blue-600' : 'bg-white border border-gray-100 text-gray-400'}`}>
                                                    <item.icon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                                                    <p className="text-gray-500 text-sm font-medium">{item.phase}</p>
                                                </div>
                                            </div>

                                            <p className="text-gray-600 mb-6 leading-relaxed">
                                                {item.description}
                                            </p>

                                            <ul className="space-y-3">
                                                {item.items.map((subItem, i) => (
                                                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-blue-500' : isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        {subItem}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Center Point */}
                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 hidden md:flex items-center justify-center z-10">
                                        <div className={`w-full h-full rounded-full border-4 flex items-center justify-center ${isCurrent ? 'bg-white border-blue-600 shadow-lg' : isCompleted ? 'bg-white border-green-500' : 'bg-white border-gray-200'}`}>
                                            <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? 'bg-blue-600 animate-pulse' : isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        </div>
                                    </div>

                                    {/* Empty Space for alignment */}
                                    <div className="flex-1 w-full md:w-1/2 hidden md:block" />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};
