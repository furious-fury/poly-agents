import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Copy, Check, BarChart3, Shield, Terminal, Zap, LineChart, Globe, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { FadeIn } from '../components/FadeIn';

// Reusing existing components for sections but with new wrapper classes if needed
import { TrustSection } from '../components/landing/TrustSection';
import { SolutionsSection } from '../components/landing/SolutionsSection';
import { FaqSection } from '../components/landing/FaqSection';

function LandingPage() {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText("EegYQPAgnNLvPLR9tsui3iY99578a5UkRuoaX6ecpump");
        toast.success("CA copied to clipboard!");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 overflow-x-hidden">
            {/* Navbar */}
            <nav className="fixed w-full z-50 top-0 start-0 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-7xl mx-auto flex items-center justify-between p-4 px-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Bot className="text-white w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-gray-900">PolyAgents</span>
                    </div>

                    <div>
                        <button
                            onClick={() => navigate('/trade')}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-md shadow-blue-600/20"
                        >
                            Launch App
                        </button>
                    </div>
                </div>
            </nav>

            {/* Containerized Hero Section */}
            <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto bg-blue-600 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-blue-900/20 min-h-[600px] flex items-center">
                    {/* Background Accents (Inside Blue Card) */}
                    <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-700/50 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

                    {/* Content Grid */}
                    <div className="relative z-10 w-full grid lg:grid-cols-2 gap-6 items-center p-8 md:p-16 lg:p-20">
                        {/* Text Content (Left) */}
                        <div className="text-left space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/30 border border-blue-400/30 text-white text-sm font-medium backdrop-blur-md">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                Live on Polymarket
                            </div>

                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                                Powerful Agents for <br />
                                <span className="">Smarter Trading.</span>
                            </h1>

                            <p className="text-lg md:text-xl text-blue-100 max-w-xl leading-relaxed">
                                Unlock the full potential of prediction markets with our feature-rich platform. Automate trades, analyze sentiment, and manage risk 24/7.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                                <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-full pl-6 pr-2 py-2 backdrop-blur-sm hover:bg-white/15 transition-all group">
                                    <code className="text-blue-100 font-mono text-sm tracking-wide">xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
                                    <button
                                        onClick={handleCopy}
                                        className="p-2.5 rounded-full bg-white text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                                        title="Copy Address"
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button
                                    onClick={() => navigate('/trade')}
                                    className="px-6 py-2.5 rounded-full bg-white text-blue-600 font-bold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap shrink-0"
                                >
                                    Launch App <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Trust Logos */}
                            <div className="pt-8 flex items-center gap-8 opacity-60">
                                <span className="text-white font-bold text-lg flex items-center gap-2"><Bot className="w-5 h-5" /> PolyAgents</span>
                                <span className="text-white font-bold text-lg flex items-center gap-2"><Globe className="w-5 h-5" /> Polymarket</span>
                                <span className="text-white font-bold text-lg flex items-center gap-2"><Shield className="w-5 h-5" /> Secure</span>
                            </div>
                        </div>

                        {/* Hero Image / Mockup (Right) */}
                        <div className="relative lg:h-[600px] flex items-center justify-center lg:justify-end">
                            {/* Main App Mockup Card */}
                            <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl shadow-blue-900/40 rotate-1 hover:rotate-0 transition-transform duration-500 ease-out">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-gray-900 font-bold text-lg">Welcome Back!</h3>
                                        <p className="text-gray-500 text-sm">Portfolio Balance</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-blue-600">PF</div>
                                </div>

                                {/* Balance */}
                                <div className="mb-8">
                                    <span className="text-4xl font-bold text-gray-900">$12,450.00</span>
                                    <span className="ml-3 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">+12.5%</span>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                                            <Zap className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <p className="text-gray-500 text-xs font-medium">Active Agents</p>
                                        <p className="text-gray-900 font-bold text-lg">4</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-3">
                                            <BarChart3 className="w-4 h-4 text-green-600" />
                                        </div>
                                        <p className="text-gray-500 text-xs font-medium">Win Rate</p>
                                        <p className="text-gray-900 font-bold text-lg">68%</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                                            <Terminal className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <p className="text-gray-500 text-xs font-medium">Trades Today</p>
                                        <p className="text-gray-900 font-bold text-lg">24</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mb-3">
                                            <Shield className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <p className="text-gray-500 text-xs font-medium">Risk Score</p>
                                        <p className="text-gray-900 font-bold text-lg">Low</p>
                                    </div>
                                </div>

                                {/* Active List */}
                                <div className="bg-blue-50 rounded-2xl p-4 flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                                            <Bot className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-gray-900 font-bold text-sm">Standard Agent</p>
                                            <p className="text-blue-600 text-xs font-medium">Running</p>
                                        </div>
                                    </div>
                                    <span className="text-green-600 font-bold text-sm">+$240</span>
                                </div>
                            </div>

                            {/* Floating Analytics Card (Background Layer) */}
                            {/* <div className="absolute top-[20%] -right-12 w-64 p-5 bg-white rounded-2xl shadow-xl shadow-blue-900/20 -rotate-6 z-0 hidden lg:block opacity-90">
                                <div className="space-y-3">
                                    <div className="h-2 w-1/2 bg-gray-100 rounded-full" />
                                    <div className="h-20 w-full bg-blue-50 rounded-lg flex items-end gap-1 p-2">
                                        {[40, 70, 50, 90, 60, 80].map((h, i) => (
                                            <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-blue-500 rounded-t-[2px]" />
                                        ))}
                                    </div>
                                </div>
                            </div> */}
                        </div>
                    </div>
                </div>
            </section>

            {/* Zig-Zag Features Section */}
            <section className="py-24 bg-white" id="features">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 tracking-tight">
                            Key Features of Our <br /> <span className="text-blue-600">Trading Platform</span>
                        </h2>
                    </div>

                    <div className="space-y-32">
                        {/* Feature 1: Real-Time Analytics (Text Left, Image Right) */}
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="order-2 lg:order-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                                    Analytics
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-6">Real-Time Market Analytics</h3>
                                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                                    Unlock immediate access to crucial financial data. Our advanced real-time analytics allow you to stay ahead of the curve, tracking odd shifts, volume spikes, and whale movements instantly.
                                </p>
                                <button className="px-6 py-3 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                                    Start Analyzing
                                </button>
                            </div>
                            <div className="order-1 lg:order-2 bg-gray-50 rounded-[2.5rem] p-12 flex items-center justify-center">
                                {/* Mockup */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 w-full max-w-sm">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                            <LineChart className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-gray-900 font-bold">Market Analysis</p>
                                            <p className="text-gray-500 text-sm">Updated 2m ago</p>
                                        </div>
                                    </div>
                                    <div className="h-48 w-full bg-gray-50 rounded-xl mb-4 relative overflow-hidden flex items-end px-4 gap-2">
                                        {[30, 45, 35, 60, 75, 55, 80, 95].map((h, i) => (
                                            <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-linear-to-t from-blue-600 to-blue-400 rounded-t-sm" />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Volume</span>
                                        <span className="text-gray-900 font-bold">$1.2M</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feature 2: Seamless Integration (Image Left, Text Right) */}
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="order-1 bg-gray-50 rounded-[2.5rem] p-12 flex items-center justify-center">
                                {/* Mockup */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-8 w-full max-w-sm relative">
                                    <div className="absolute -top-6 -right-6 w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                                        <Zap className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="space-y-6">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors cursor-default">
                                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-2 w-24 bg-gray-200 rounded-full" />
                                                    <div className="h-2 w-16 bg-gray-100 rounded-full" />
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-300" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="order-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                                    Integration
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-6">Seamless Execution</h3>
                                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                                    Our platform seamlessly integrates with your existing strategies. Whether you're using simple scripts or complex agents, our solution connects effortlessly, allowing you to execute trades with millisecond latency.
                                </p>
                                <ul className="space-y-4 mb-8">
                                    {['Zero-configuration setup', 'API-first architecture', 'Universal compatibility'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-gray-700">
                                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                                <Check className="w-3.5 h-3.5 text-green-600" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Feature 3: Portfolio Management (Text Left, Image Right) */}
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="order-2 lg:order-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                                    Management
                                </div>
                                <h3 className="text-3xl font-bold text-gray-900 mb-6">Comprehensive Portfolio Management</h3>
                                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                                    Track every position, PnL, and risk metric in one unified dashboard. Gain deep insights into your performance and optimize your capital allocation automatically.
                                </p>
                                <button className="px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-full font-medium hover:bg-gray-50 transition-colors">
                                    View Dashboard
                                </button>
                            </div>
                            <div className="order-1 lg:order-2 bg-gray-50 rounded-[2.5rem] p-12 flex items-center justify-center">
                                {/* Mockup */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 w-full max-w-sm">
                                    <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
                                        <h4 className="font-bold text-gray-900">Portfolio</h4>
                                        <div className="flex gap-2">
                                            <span className="w-2 h-2 rounded-full bg-red-400" />
                                            <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                            <span className="w-2 h-2 rounded-full bg-green-400" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Trump Win', val: '65.4%', up: true },
                                            { label: 'Fed Rates', val: '2.5%', up: false },
                                            { label: 'BTC > 100k', val: '12.1%', up: true }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-500">
                                                        {item.label[0]}
                                                    </div>
                                                    <span className="font-medium text-gray-900">{item.label}</span>
                                                </div>
                                                <span className={`font-bold ${item.up ? 'text-green-600' : 'text-red-500'}`}>{item.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* "Who is this for" Section - Professional Services Style */}
            <section className="py-32 bg-gray-50" id="solutions">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                            Target Audience
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 tracking-tight">Built for the <span className="text-blue-600">Modern Trader</span></h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Whether you're an individual trader or managing institutional capital, PolyAgents provides the infrastructure you need.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Card 1: Data-Driven Traders */}
                        <div className="bg-white rounded-4xl p-10 border border-gray-100 shadow-xl hover:shadow-2xl transition-all group">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-blue-600 transition-colors">
                                <LineChart className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Data-Driven Traders</h3>
                            <p className="text-gray-600 leading-relaxed mb-8">
                                For those who rely on news, sentiment, and volume data to make informed decisions. Stop staring at charts 24/7—let our agents monitor the pulse of the market for you.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <Check className="w-5 h-5 text-blue-600" /> Sentiment Analysis
                                </li>
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <Check className="w-5 h-5 text-blue-600" /> News Trading
                                </li>
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <Check className="w-5 h-5 text-blue-600" /> Whale Alerts
                                </li>
                            </ul>
                        </div>

                        {/* Card 2: Automation Enthusiasts */}
                        <div className="bg-white rounded-4xl p-10 border border-gray-100 shadow-xl hover:shadow-2xl transition-all group">
                            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-purple-600 transition-colors">
                                <Terminal className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Automation Enthusiasts</h3>
                            <p className="text-gray-600 leading-relaxed mb-8">
                                For developers and strategists who want to leverage the power of AI to automate their edge. Build, test, and deploy complex strategies without managing infrastructure.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <Check className="w-5 h-5 text-purple-600" /> Custom Scripts
                                </li>
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <Check className="w-5 h-5 text-purple-600" /> Webhooks & API
                                </li>
                                <li className="flex items-center gap-3 text-gray-700 font-medium">
                                    <Check className="w-5 h-5 text-purple-600" /> Strategy Backtesting
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Marquee - Styled to fit */}
            <section className="py-10 bg-blue-600 overflow-hidden">
                <div className="flex w-max animate-marquee-infinite items-center">
                    {/* First Loop */}
                    <div className="flex gap-16 items-center shrink-0 pr-16">
                        {["POLYMARKET", "SOLANA", "ETHEREUM", "AI AGENTS", "PREDICTION MARKETS"].map((item) => (
                            <span key={`1-${item}`} className="text-2xl font-bold text-blue-200/50">{item}</span>
                        ))}
                    </div>
                    {/* Second Loop (Duplicate) */}
                    <div className="flex gap-16 items-center shrink-0 pr-16">
                        {["POLYMARKET", "SOLANA", "ETHEREUM", "AI AGENTS", "PREDICTION MARKETS"].map((item) => (
                            <span key={`2-${item}`} className="text-2xl font-bold text-blue-200/50">{item}</span>
                        ))}
                    </div>
                </div>
            </section>

            <FadeIn>
                <TrustSection />
            </FadeIn>

            <FadeIn>
                <SolutionsSection />
            </FadeIn>

            <FadeIn>
                <FaqSection />
            </FadeIn>

            {/* Footer - Professional Layout (Blue Theme) */}
            <footer className="bg-blue-600 pt-20 pb-10 text-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-16">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/20">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold">PolyAgents</span>
                            </div>
                            <p className="text-blue-100 leading-relaxed mb-6">
                                The premier platform for autonomous prediction market trading. Built on Polymarket.
                            </p>
                            <div className="flex gap-4">
                                {/* Social Icons */}
                                <a href="https://x.com/Poly_Agents/" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-blue-600 transition-colors border border-white/20">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                                </a>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-6">Product</h4>
                            <ul className="space-y-4">
                                <li><a href="#features" className="text-blue-100 hover:text-white transition-colors">Features</a></li>
                                <li><a href="#solutions" className="text-blue-100 hover:text-white transition-colors">Solutions</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white mb-6">Resources</h4>
                            <ul className="space-y-4">
                                <li><a href="#" className="text-blue-100 hover:text-white transition-colors">API Reference</a></li>
                                <li><a href="#" className="text-blue-100 hover:text-white transition-colors">Community</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-blue-100 text-sm">
                            &copy; {new Date().getFullYear()} PolyAgents. All rights reserved.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-blue-100">
                            <div className="w-2 h-2 rounded-full bg-green-400 pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                            All systems operational
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;
