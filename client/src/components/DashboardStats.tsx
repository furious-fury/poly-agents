import { useAgents, useProxyWallet } from "../lib/api";
import { Wallet, Activity, TrendingUp, Cpu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    subValue?: string;
    subColor?: string;
    loading?: boolean;
}

function StatCard({ title, value, icon: Icon, subValue, subColor = "text-emerald-600", loading }: StatCardProps) {
    return (
        <div className="bg-white border border-gray-100 shadow-card rounded-4xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
            {/* Soft decorative background gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-blue-50 to-transparent rounded-bl-[4rem] opacity-50 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-blue-50 rounded-2xl group-hover:scale-105 transition-transform">
                        <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    {subValue && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${subColor}`}>
                            {subValue}
                        </span>
                    )}
                </div>
                <div>
                    <h3 className="text-gray-500 text-sm font-medium mb-1 pl-1">{title}</h3>
                    {loading ? (
                        <Skeleton className="h-8 w-24 bg-gray-100 rounded-lg" />
                    ) : (
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DashboardStats({ userId }: { userId: string | null }) {
    const { data: agents, isLoading: agentsLoading } = useAgents(userId);
    const { data: proxyWallet, isLoading: balanceLoading } = useProxyWallet(userId || "");
    const balance = proxyWallet?.balance?.toFixed(2) || "0.00";

    // Derived Stats
    const totalAgents = agents?.length || 0;
    const runningJobs = agents?.filter((a: any) => a.isRunning).length || 0;

    const dailyPnL = "$0.00"; // Placeholder: user asked for PnL but backend calc is needed.

    if (!userId) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 bg-gray-100 rounded-2xl" />)}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard
                title="Cash Balance"
                value={`$${balance}`}
                icon={Wallet}
                loading={balanceLoading}
                subValue="USDC"
                subColor="text-blue-600 bg-blue-50"
            />
            <StatCard
                title="Active Agents"
                value={totalAgents}
                icon={Cpu}
                loading={agentsLoading}
            />
            <StatCard
                title="PnL (24h)"
                value={dailyPnL}
                icon={TrendingUp}
                loading={false}
                subValue="Coming Soon"
                subColor="text-gray-500 bg-gray-100"
            />
            <StatCard
                title="Running Jobs"
                value={runningJobs}
                icon={Activity}
                loading={agentsLoading}
                subColor="text-emerald-600 bg-emerald-50"
                subValue={runningJobs > 0 ? "Active" : "Idle"}
            />
        </div>
    );
}
