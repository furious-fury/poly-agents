import type { ReactNode } from 'react';

interface LargeCardProps {
    title: string;
    description: string;
    action?: string;
    gradient: string;
    icon: ReactNode;
    className?: string;
}

export function LargeCard({ title, description, gradient, icon, className = "" }: LargeCardProps) {
    return (
        <div className={`relative overflow-hidden group ${gradient} ${className}`}>
            <div className="relative z-10">
                {icon}
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{title}</h3>
                <p className="text-gray-600 mb-8 leading-relaxed max-w-md">
                    {description}
                </p>
            </div>
        </div>
    );
}
