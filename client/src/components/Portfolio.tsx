import { useMemo, useState } from 'react';
import Chart from './Chart'

import ActivePositions from './ActivePositions'
import { useProxyWallet, useUserPositions, usePortfolioHistory } from '../lib/api'

interface PortfolioProps {
    userId: string | null;
}

function Portfolio({ userId }: PortfolioProps) {
    const { data: proxyWallet, isLoading: walletLoading } = useProxyWallet(userId || "");
    const { data: positions, isLoading: positionsLoading } = useUserPositions(userId || "");
    const [timeRange, setTimeRange] = useState<'24h' | '1w' | '1m'>('24h');
    const { data: history } = usePortfolioHistory(userId || "", timeRange);

    const balanceNum = proxyWallet?.balance || 0;
    const balanceFormatted = balanceNum.toFixed(2);
    const proxyAddress = proxyWallet?.address;

    // Calculate Active Positions Value
    const { activeValueNum, activePositionsCount } = useMemo(() => {
        if (!positions || positions.length === 0) return { activeValueNum: 0, activePositionsCount: 0 };

        const totalValue = positions.reduce((acc: number, pos: any) => {
            return acc + (Number(pos.exposure) || 0);
        }, 0);

        return {
            activeValueNum: totalValue,
            activePositionsCount: positions.length
        };
    }, [positions]);

    const totalNetWorth = balanceNum + activeValueNum;
    const totalNetWorthFormatted = totalNetWorth.toFixed(2);

    // Prevent division by zero
    const cashPercent = totalNetWorth > 0 ? (balanceNum / totalNetWorth) * 100 : (balanceNum > 0 ? 100 : 0);
    const activePercent = totalNetWorth > 0 ? (activeValueNum / totalNetWorth) * 100 : 0;

    const isLoading = walletLoading || positionsLoading;

    return (

        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Net Worth Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Balance Card */}
                <div className="bg-linear-to-br from-blue-600 to-blue-700 p-8 rounded-4xl shadow-xl shadow-blue-500/20 relative overflow-hidden group border border-blue-500/50">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                    </div>

                    <h2 className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Total Net Worth
                    </h2>
                    <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-5xl font-bold text-white tracking-tight">
                            {isLoading ? "..." : `$${totalNetWorthFormatted}`}
                        </span>
                    </div>

                    <div className="mt-auto">
                        {proxyAddress ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-800/40 border border-blue-400/30 backdrop-blur-md">
                                <span className="text-xs text-blue-200 font-medium">Proxy:</span>
                                <span className="font-mono text-white text-xs tracking-wide">{proxyAddress.slice(0, 6)}...{proxyAddress.slice(-4)}</span>
                            </div>
                        ) : (
                            <div className="text-sm text-blue-200 italic">Initializing wallet...</div>
                        )}
                    </div>
                </div>

                {/* Secondary Stat Cards */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-card flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-3">Cash Balance</p>
                            <p className="text-4xl font-bold text-gray-900 tracking-tight">{walletLoading ? "..." : `$${balanceFormatted}`}</p>
                        </div>
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                                <span>Portfolio Allocation</span>
                                <span>{cashPercent.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${cashPercent}%` }} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-4xl border border-gray-100 shadow-card flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-3">Active Positions</p>
                            <p className="text-4xl font-bold text-gray-900 tracking-tight">${activeValueNum.toFixed(2)}</p>
                        </div>
                        <div className="mt-6">
                            <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                                <span>Exposure</span>
                                <span>{activePositionsCount} active bets</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${activePercent}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section - Takes up full width now */}
                <div className="lg:col-span-3 bg-white p-6 rounded-4xl shadow-card border border-gray-100">
                    <Chart
                        data={history || []}
                        className="h-[350px]"
                        timeRange={timeRange}
                        onTimeRangeChange={setTimeRange}
                    />
                </div>
            </div>

            {/* Active Positions Table */}
            <div>
                <ActivePositions userId={userId} className="h-[600px]" />
            </div>
        </div>
    )
}

function Wallet({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
        </svg>
    )
}

export default Portfolio