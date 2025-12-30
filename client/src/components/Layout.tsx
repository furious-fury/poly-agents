import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "./Header";
import {
    LayoutDashboard,
    Bot,
    CandlestickChart,
    Wallet,
    Settings,
    Menu,
    X,
    Twitter,
    ScanEye
} from "lucide-react";

interface LayoutProps {
    children: React.ReactNode;
    activeTab?: string;
    setActiveTab?: (tab: 'dashboard' | 'agents' | 'markets' | 'wallet' | 'settings' | 'tracker') => void;
}

function Layout({ children, activeTab = 'dashboard', setActiveTab }: LayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'agents', label: 'Agents', icon: Bot },
        { id: 'markets', label: 'Markets', icon: CandlestickChart },
        { id: 'wallet', label: 'Wallet', icon: Wallet },
        { id: 'tracker', label: 'Watcher', icon: ScanEye },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const handleTabClick = (id: string) => {
        setActiveTab?.(id as any);
        setIsMobileMenuOpen(false); // Close menu on selection
    };

    return (
        <div className="flex h-screen bg-blue-600 text-gray-900 font-sans overflow-hidden p-4 gap-4">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - Mobile: Floating Blue Card | Desktop: Transparent/Blended */}
            <aside className={`
                fixed inset-y-4 left-4 z-30 w-64 flex flex-col transition-transform duration-300 ease-in-out bg-blue-600 rounded-3xl shadow-xl border border-blue-500/20
                md:relative md:inset-auto md:translate-x-0 md:flex md:bg-transparent md:shadow-none md:border-none md:rounded-none
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-[110%] md:translate-x-0'}
            `}>
                <div className="p-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <Bot className="text-blue-600 w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white">Poly Agents<span className="text-blue-200">.</span></span>
                    </Link>
                    {/* Close button for mobile */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden text-blue-200 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="px-4 py-2">
                    <div className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-4 px-2">Navigation</div>
                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleTabClick(item.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${isActive
                                        ? 'bg-white text-blue-600 shadow-lg shadow-blue-900/10'
                                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-blue-200 group-hover:text-white'}`} />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-auto p-4">
                    <div className="bg-blue-700/50 rounded-2xl p-4 border border-blue-500/30 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/50 flex items-center justify-center border border-blue-400/30">
                                <Twitter className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">Community</div>
                                <div className="text-xs text-blue-200">Join 25k+ traders</div>
                            </div>
                        </div>
                        <a
                            href="https://x.com/Poly_Agents/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-600 text-xs font-bold transition-colors shadow-sm"
                        >
                            Follow Updates
                        </a>
                    </div>
                </div>
            </aside>

            {/* Main Content - Floating Card Style */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gray-50 rounded-3xl shadow-xl border border-gray-100">
                {/* Top Header */}
                <header className="px-8 py-6 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 border-b border-gray-200/50">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Menu size={24} />
                        </button>

                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 capitalize tracking-tight">
                                {activeTab === 'tracker' ? 'Wallet Watcher' : activeTab}
                            </h2>
                            <p className="text-gray-500 text-sm hidden md:block">Overview of your {activeTab} performance</p>
                        </div>
                    </div>
                    <div>
                        <Header /> {/* Reuse existing Header component for Wallet Button */}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth w-full bg-gray-50/50">
                    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 md:pb-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Layout;