import type { ReactNode } from 'react';

interface SolutionCardProps {
    icon: ReactNode;
    title: string;
    desc: string;
}

export function SolutionCard({ icon, title, desc }: SolutionCardProps) {
    return (
        <div className="p-8 rounded-2xl bg-white border border-gray-100 hover:border-blue-100 hover:shadow-lg transition-all group">
            <div className="mb-4 bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}
