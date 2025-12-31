
import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-3xl opacity-60" />
                <div className="absolute bottom-[0%] right-[0%] w-[40%] h-[40%] bg-purple-100/50 rounded-full blur-3xl opacity-60" />
            </div>

            <div className="relative z-10 max-w-lg w-full">
                <div className="mb-8 relative flex justify-center">
                    <div className="w-24 h-24 bg-white rounded-3xl shadow-xl shadow-blue-900/5 flex items-center justify-center border border-gray-100 animate-in zoom-in duration-500">
                        <AlertTriangle className="w-10 h-10 text-orange-500" />
                    </div>
                    <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl animate-pulse" />
                </div>

                <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                    Page Not Found
                </h1>

                <p className="text-gray-500 text-lg mb-10 leading-relaxed">
                    The autonomous agent you are looking for has gone rogue or does not exist in this dimension.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 hover:-translate-y-0.5"
                    >
                        <Home size={18} />
                        Return Home
                    </button>
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center justify-center gap-2 px-8 py-3.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl font-bold transition-all hover:border-gray-300"
                    >
                        Go Back
                    </button>
                </div>
            </div>

            <div className="absolute bottom-8 text-xs font-bold text-gray-400 uppercase tracking-widest opacity-50">
                PolyAgents Platform
            </div>
        </div>
    );
}

export default NotFound;
