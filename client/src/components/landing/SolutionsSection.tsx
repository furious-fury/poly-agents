import { Bot, Zap, Lock, TrendingUp, BarChart2, Cpu } from 'lucide-react';
import { SolutionCard } from './SolutionCard';

export function SolutionsSection() {
    return (
        <section className="py-32 bg-gray-50 relative" id="features">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                        Complete Suite
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 tracking-tight">Everything You Need to <span className="text-blue-600">Win</span></h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        From automated execution to risk management, we have you covered.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <SolutionCard icon={<Bot className='text-blue-600' />} title="Autonomous Agents" desc="Deploy agents that run 24/7 with auto maintenance modes." />
                    <SolutionCard icon={<Zap className='text-blue-600' />} title="Fast Execution" desc="On-chain trades via high speed proxies to bypass congestion." />
                    <SolutionCard icon={<Lock className='text-blue-600' />} title="Secure Enclave" desc="Per-user key isolation with AES-256 encryption." />
                    <SolutionCard icon={<TrendingUp className='text-blue-600' />} title="Risk Controls" desc="Automated Stop Loss, Take Profit, and Exposure Limits." />
                    <SolutionCard icon={<BarChart2 className='text-blue-600' />} title="Live Analytics" desc="Real time performance tracking and decision logging." />
                    <SolutionCard icon={<Cpu className='text-blue-600' />} title="LLM Analysis" desc="Custom LLM models trained for complex market reasoning." />
                </div>
            </div>
        </section>
    );
}
