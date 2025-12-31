
import '../App.css'

import Layout from '../components/Layout';
import Portfolio from '../components/Portfolio';
import AgentControl from '../components/AgentControl';
import MarketExplorer from '../components/MarketExplorer';
import UserSettings from '../components/UserSettings';
import { WalletWatch } from '../components/WalletWatch';
// import OnboardingModal from '../components/OnboardingModal';

import { Toaster } from "sonner";

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import GlobalActivityFeed from '../components/GlobalActivityFeed';
import DashboardStats from '../components/DashboardStats';
import { useUserSettings, useLoginUser } from '../lib/api';
// import { AlertTriangle } from 'lucide-react';
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingScreen } from '../components/LoadingScreen';

function Dashboard() {
    const { publicKey, connected } = useWallet();

    // App Navigation State - Init from URL or Default
    const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'markets' | 'wallet' | 'settings' | 'tracker'>(() => {
        const params = new URLSearchParams(window.location.search);
        return (params.get('tab') as any) || 'dashboard';
    });

    // Unified Loading State
    // We consider it "loading" if the wallet is connected but we haven't determined the user ID yet
    // OR if we are waiting for the initial user sync
    const [isInitialLoad, setIsInitialLoad] = useState(false);

    // Sync URL with activeTab
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') !== activeTab) {
            params.set('tab', activeTab);
            window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
        }
    }, [activeTab]);

    const [dbUserId, setDbUserId] = useState<string | null>(null);

    // Fetch User Settings at top level to share proxyAddress
    const { data: settings, isLoading: isSettingsLoading } = useUserSettings(dbUserId || '');
    const proxyAddress = (settings as any)?.proxyAddress;

    useEffect(() => {
        if (connected && publicKey) {
            setIsInitialLoad(true); // Start loading when connection detected
            // console.log("App: Logging in user", publicKey.to258());
            loginUser(publicKey.toBase58()).finally(() => {
                // Keep loading slightly longer for smoother transition or until settings fetch begins
                // But the main blocker is getting the DB ID
            });
        } else {
            setDbUserId(null);
            setIsInitialLoad(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey]);

    // React Query Mutation
    const loginMutation = useLoginUser();

    const loginUser = async (walletAddress: string) => {
        try {
            // console.log("App: Logging in with address:", walletAddress);
            const data = await loginMutation.mutateAsync(walletAddress);
            if (data.success) {
                // console.log("App: Logged in, DB ID:", data.user.id);
                setDbUserId(data.user.id);
            }
        } catch (err) {
            console.error("Failed to login user", err);
        } finally {
            // We can turn off the "login" phase loading, but we might still be fetching settings
            // We'll let the render logic handle the smooth transition or use a timeout if needed
            // For now, we rely on dbUserId being set to unblock the view
            setIsInitialLoad(false);
        }
    }

    // Render content based on active tab
    const renderContent = () => {
        // 1. Unified Loading State
        // If connected and (logging in OR (logged in but fetching initial settings))
        if (connected && (isInitialLoad || (dbUserId && isSettingsLoading))) {
            return (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <LoadingScreen fullScreen={false} message="Loading Dashboard..." subMessage="Syncing your agents and portfolio" />
                </div>
            );
        }

        if (!connected) {
            return (
                <div className="flex flex-col items-center justify-center h-[60vh] space-y-6 animate-in fade-in zoom-in duration-500">
                    <div className="p-6 bg-blue-50 rounded-full ring-1 ring-blue-100 shadow-[0_0_50px_-10px_rgba(37,99,235,0.2)]">
                        <div className="p-4 bg-blue-100/50 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-gray-900">Connect Your Wallet</h2>
                        <p className="text-gray-600 max-w-md">
                            Access your autonomous trading agents, view real-time stats, and manage your portfolio.
                        </p>
                    </div>
                    <div className="px-6 py-3 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600 flex items-center gap-2">
                        <span>Please click</span>
                        <div className="scale-75 origin-center">
                            <button className="wallet-adapter-button wallet-adapter-button-trigger" type="button">Connect Wallet</button>
                        </div>
                        <span>in the top right</span>
                    </div>
                </div>
            );
        }

        // HARD GATE: If user is logged in but has no proxy credential, FORCE Settings (Onboarding)
        if (connected && dbUserId && !proxyAddress && activeTab !== 'settings') {
            return (
                <div className="max-w-4xl mx-auto pt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-8 text-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 animate-pulse">
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Setup</h2>
                        <p className="text-gray-500">Import your Polymarket Credentials to enable autonomous trading.</p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 py-2 px-4 rounded-full border border-emerald-500/20 max-w-fit mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            <span className="text-sm font-medium">End-to-End Encrypted & Secure Storage</span>
                        </div>
                    </div>
                    <UserSettings dbUserId={dbUserId} />
                </div>
            );
        }

        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="animate-in fade-in duration-500">
                        {/* Status Alert */}
                        {/* <Alert variant="warning" className="mb-6 border-yellow-500/50 bg-yellow-500/10 text-yellow-500">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Polymarket Service Update</AlertTitle>
                            <AlertDescription>
                                We’re currently experiencing a delay in positions appearing due to an issue with Goldsky. Your funds are safe and all trades are processing normally. Please avoid submitting duplicate orders.
                            </AlertDescription>
                        </Alert> */}

                        {/* Stats Overview */}
                        <div className="mb-5">
                            <h3 className="text-xl font-bold mb-4">Stats Overview</h3>
                            <DashboardStats userId={dbUserId} />
                        </div>

                        {/* Wallet Control (Deposit/Withdraw) removed as requested */}

                        {/* Bento Grid Layout (50/50 Split) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-start">
                            {/* Left Column: Agents List (1/2 width) */}
                            <div className="space-y-8">
                                <div>
                                    <div className="flex items-center justify-between mb-6 pl-1">
                                        <h3 className="text-xl font-bold text-gray-900">Deployed Agents</h3>
                                        <button
                                            onClick={() => setActiveTab('agents')}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors flex items-center gap-1"
                                        >
                                            View All &rarr;
                                        </button>
                                    </div>
                                    <AgentControl dbUserId={dbUserId} variant="compact" layout="list" />
                                </div>
                            </div>

                            {/* Right Column: Activity Feed (1/2 width) */}
                            <div>
                                <h3 className="text-xl font-bold mb-6 pl-1 text-gray-900">Live Activity</h3>
                                <div className="sticky top-24">
                                    <GlobalActivityFeed userId={dbUserId} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'agents':
                return <AgentControl dbUserId={dbUserId} />;
            case 'markets':
                return <MarketExplorer />;
            case 'wallet':
                return <Portfolio userId={dbUserId} />;
            case 'tracker':
                return <WalletWatch userId={dbUserId || ''} />;
            case 'settings':
                return <UserSettings dbUserId={dbUserId || ''} />;
            default:
                return <div>Not found</div>;
        }
    };

    return (
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
            <Toaster position="top-right" theme="dark" toastOptions={{ duration: 5000 }} />
            {/* <OnboardingModal /> */}
            {renderContent()}
        </Layout>
    )
}

export default Dashboard
