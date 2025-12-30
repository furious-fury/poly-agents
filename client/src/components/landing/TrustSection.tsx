import { Shield, Newspaper } from 'lucide-react';
import { LargeCard } from './LargeCard';

export function TrustSection() {
    return (
        <section className="bg-white py-32 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Why Trust Us / Large Cards */}
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                        Trust & Security
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 tracking-tight">Why Trust <span className="text-blue-600">PolyAgents</span>?</h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Built for transparency, speed, and security. We prioritize your funds and data above all else.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
                    <LargeCard
                        title="News Driven Intelligence"
                        description="Our agents ingest data from 14+ premium sources including Bloomberg, CoinDesk, and TechCrunch. We use LLMs to extract high-confidence signals and instantly match them to prediction markets."
                        action="View Sources"
                        gradient="bg-white" // Clean white background
                        icon={<Newspaper className="w-12 h-12 text-blue-600 mb-6" />}
                        className="shadow-xl hover:shadow-2xl border border-gray-100 rounded-4xl p-10"
                    />
                    <LargeCard
                        title="Institutional Grade Security"
                        description="Non custodial architecture means your funds never leave your wallet until execution. Private keys are encrypted at rest using AES-256-GCM with HKDF key derivation."
                        action="Learn More"
                        gradient="bg-white" // Clean white background
                        icon={<Shield className="w-12 h-12 text-blue-600 mb-6" />}
                        className="shadow-xl hover:shadow-2xl border border-gray-100 rounded-4xl p-10"
                    />
                </div>
            </div>
        </section>
    );
}
