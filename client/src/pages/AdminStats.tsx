import { useState } from 'react';
import { Users, TrendingUp, Activity, Shield, AlertTriangle } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { Button } from "../components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../components/ui/dialog";
import { API_URL } from "../lib/api";

interface StatsData {
    users: { total: number };
    agents: { active: number; total: number };
    trading: { volume: number; count: number };
    recentActivity: Array<{
        id: string;
        user: { userName: string | null; walletAddress: string };
        agent: { name: string };
        side: string;
        outcome: string;
        amount: number;
        status: string;
        createdAt: string;
    }>;
    topAgents: Array<{ name: string; tradeCount: number }>;
}



export default function AdminStats() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<StatsData | null>(null);

    // Simple password check
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const adminPass = import.meta.env.VITE_ADMIN_PASSWORD;

        if (!adminPass) {
            setError("Admin password not configured in .env");
            return;
        }

        if (password === adminPass) {
            setIsAuthenticated(true);
            fetchStats();
        } else {
            setError("Invalid Access Code");
        }
    };

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_URL}/stats`);
            if (!res.ok) throw new Error("Failed to fetch");
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error(err);
            setError("API Error: Could not load stats");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-red-500/10 rounded-full ring-1 ring-red-500/30">
                            <Shield size={32} className="text-red-400" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-2">Restricted Area</h1>
                    <p className="text-gray-400 text-center mb-8">Enter admin access code to view platform analytics.</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Access Code"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                                <AlertTriangle size={16} />
                                {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Unlock Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (isLoading || !data) {
        return <LoadingScreen message="Loading Analytics..." />;
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans">
            <header className="max-w-7xl mx-auto mb-10 border-b border-white/10 pb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-purple-500">
                        Athena Analytics
                    </h1>
                    <p className="text-gray-400 mt-1">Platform Performance Overview</p>
                </div>
                <div className="flex gap-3">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="destructive" className="flex items-center gap-2 font-bold hover:bg-red-500/50 bg-red-500 shadow-xl">
                                <AlertTriangle size={16} />
                                STOP ALL AGENTS
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                            <DialogHeader>
                                <DialogTitle className="text-red-500 flex items-center gap-2">
                                    <AlertTriangle size={20} />
                                    EMERGENCY STOP
                                </DialogTitle>
                                <DialogDescription className="text-zinc-400 pt-2">
                                    Are you sure you want to stop all active agents immediately?
                                    <br /><br />
                                    This action will:
                                    <ul className="list-disc pl-4 mt-2 space-y-1">
                                        <li>Halt all running trading loops.</li>
                                        <li>Update database status to INACTIVE.</li>
                                        <li>Require manual restart of each agent to resume.</li>
                                    </ul>
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="ghost" className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-800/50">Cancel</Button>
                                <Button
                                    variant="destructive"
                                    className='hover:bg-red-500/50 bg-red-500 shadow-xl'
                                    onClick={async () => {
                                        try {
                                            await fetch(`${API_URL}/stats/stop-agents`, { method: "POST" });
                                            // Optional: Close dialog / Show success toast
                                            window.location.reload();
                                        } catch (e) {
                                            alert("Failed to stop agents");
                                        }
                                    }}
                                >
                                    CONFIRM SHUTDOWN
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <button
                        onClick={() => setIsAuthenticated(false)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors"
                    >
                        Lock Dashboard
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* KPI Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        label="Total Users"
                        value={data.users.total}
                        icon={<Users className="text-blue-400" />}
                        trend="+12%"
                    />
                    <StatsCard
                        label="Active Agents"
                        value={data.agents.active}
                        subValue={`/ ${data.agents.total} Total`}
                        icon={<Activity className="text-emerald-400" />}
                    />
                    <StatsCard
                        label="Total Volume"
                        value={`$${data.trading.volume.toLocaleString()}`}
                        icon={<TrendingUp className="text-purple-400" />}
                    />
                    <StatsCard
                        label="Total Trades"
                        value={data.trading.count}
                        icon={<TrendingUp className="text-orange-400" />}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Trades Table */}
                    <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Activity size={20} className="text-blue-400" />
                            Recent Activity
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-gray-500 text-sm border-b border-white/5">
                                        <th className="pb-3 pl-2">Time</th>
                                        <th className="pb-3">Agent</th>
                                        <th className="pb-3">Action</th>
                                        <th className="pb-3">Status</th>
                                        <th className="pb-3">Amount</th>
                                        <th className="pb-3">User</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {data.recentActivity.map((trade) => (
                                        <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 pl-2 text-gray-400">
                                                {new Date(trade.createdAt).toLocaleTimeString()}
                                            </td>
                                            <td className="py-3 font-medium text-white">{trade.agent.name}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${trade.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {trade.side} {trade.outcome}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${trade.status === 'FILLED' ? 'bg-blue-500/20 text-blue-400' :
                                                    trade.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {trade.status}
                                                </span>
                                            </td>
                                            <td className="py-3 text-gray-300">${trade.amount}</td>
                                            <td className="py-3 text-gray-500 font-mono text-xs">
                                                {trade.user.walletAddress.slice(0, 6)}...
                                            </td>
                                        </tr>
                                    ))}
                                    {data.recentActivity.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500">No recent trades found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Top Agents */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Users size={20} className="text-purple-400" />
                            Top Agents
                        </h2>
                        <div className="space-y-4">
                            {data.topAgents.map((agent, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                                            {agent.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="font-medium">{agent.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-white">{agent.tradeCount}</div>
                                        <div className="text-xs text-gray-500">trades</div>
                                    </div>
                                </div>
                            ))}
                            {data.topAgents.length === 0 && (
                                <p className="text-center text-gray-500 py-4">No agent activity yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Sub-component for KPI Cards
function StatsCard({ label, subValue, icon, trend, value }: any) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors group">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                    {icon}
                </div>
                {trend && (
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-full">
                        {trend}
                    </span>
                )}
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{label}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{value}</span>
                {subValue && <span className="text-sm text-gray-500">{subValue}</span>}
            </div>
        </div>
    );
}
