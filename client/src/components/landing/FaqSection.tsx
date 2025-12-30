import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const items = [
    {
        question: "Is my fund safe?",
        answer: "Yes. PolyAgents is non custodial. We never hold your funds. You deposit directly into your own smart contract wallet that only you control."
    },
    {
        question: "How do the agents work?",
        answer: "Agents monitor news and market data 24/7. When they detect a high-confidence opportunity, they execute a trade within your set risk limits."
    },
    {
        question: "Can I customize the strategies?",
        answer: "Currently in Beta, you can select from predefined agent personas (Conservative, Aggressive, etc.) or create your semi custom agent. Full custom scripting is coming in Phase 2."
    },
    {
        question: "What markets are supported?",
        answer: "We currently support all prediction markets on Polymarket. Future updates will include other prediction platforms."
    }
];

export function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="py-32 bg-white" id="pricing">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 tracking-tight">Frequently Asked <span className="text-blue-600">Questions</span></h2>
                    <p className="text-xl text-gray-600">
                        Everything you need to know about getting started.
                    </p>
                </div>

                <div className="space-y-4">
                    {items.map((item, i) => (
                        <div key={i} className="group border border-gray-200 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300">
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full text-left px-8 py-6 flex items-center justify-between gap-4"
                            >
                                <span className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                                    {item.question}
                                </span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${openIndex === i ? 'bg-blue-600 border-blue-600 text-white rotate-180' : 'bg-white border-gray-200 text-gray-400 group-hover:border-blue-200 group-hover:text-blue-600'}`}>
                                    <ChevronDown className="w-5 h-5" />
                                </div>
                            </button>
                            <div
                                className={`px-8 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === i ? 'max-h-48 pb-8 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <p className="text-gray-600 leading-relaxed text-base border-t border-gray-100 pt-4">
                                    {item.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
