
import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const EMPTY_DATA = [
    { time: '00:00', value: 0 },
    { time: '04:00', value: 0 },
    { time: '08:00', value: 0 },
    { time: '12:00', value: 0 },
    { time: '16:00', value: 0 },
    { time: '20:00', value: 0 },
    { time: '23:59', value: 0 },
];

interface ChartProps {
    data?: { time: string; value: number }[];
    className?: string;
    timeRange?: '24h' | '1w' | '1m';
    onTimeRangeChange?: (range: '24h' | '1w' | '1m') => void;
}

const Chart = ({ data, className, timeRange = '24h', onTimeRangeChange }: ChartProps) => {
    let rawData = data && data.length > 0 ? data : EMPTY_DATA;

    // Filter out zero/invalid values that might cause chart artifacts
    // and sort by time just in case
    let chartData = rawData
        .filter(d => d.value > 0.01)
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // Fix: Recharts needs >1 point to draw an Area. If only 1 point, duplicate it.
    if (chartData.length === 1) {
        chartData = [
            { time: chartData[0].time, value: chartData[0].value },
            { time: chartData[0].time, value: chartData[0].value }
        ];
    } else if (chartData.length === 0) {
        chartData = EMPTY_DATA;
    }

    const firstVal = chartData[0]?.value || 0;
    const lastVal = chartData[chartData.length - 1]?.value || 0;
    const isPositive = lastVal >= firstVal;

    // Calculate percentage change
    const diff = lastVal - firstVal;
    const percent = firstVal !== 0 ? (diff / firstVal) * 100 : 0;
    const change = (diff >= 0 ? "+" : "") + percent.toFixed(2) + "%";

    // Calculate Domain to avoid flat-line issues
    const values = chartData.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // If min == max (flat line), add explicit padding so the line appears in the middle
    const domainPadding = (maxVal - minVal) === 0 ? (maxVal * 0.05) || 1 : (maxVal - minVal) * 0.1;
    const yDomain = [minVal - domainPadding, maxVal + domainPadding];

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Stable gradient ID to prevent re-render flickers/disappearance
    const gradientId = useMemo(() => `colorValue-${Math.random().toString(36).substr(2, 9)}`, []);

    return (
        <div className={`w-full bg-white rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm flex flex-col ${className || 'h-[400px]'}`}>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-6 px-1 gap-4 md:gap-0">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 w-full md:w-auto">
                    <div className="flex justify-between items-center w-full md:w-auto">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Performance</h3>
                        {/* Mobile Badge */}
                        <span className={`md:hidden text-xs font-bold px-2.5 py-1 rounded-lg border ${isPositive
                            ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                            : 'text-red-500 bg-red-50 border-red-100'
                            }`}>
                            {change}
                        </span>
                    </div>
                    <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100 self-start md:self-auto">
                        {(['24h', '1w', '1m'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => onTimeRangeChange?.(r)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${timeRange === r
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {r.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Desktop Badge */}
                <span className={`hidden md:inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${isPositive
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                    : 'text-red-500 bg-red-50 border-red-100'
                    }`}>
                    {change}
                </span>
            </div>

            <div className="flex-1 w-full relative min-h-0">
                {mounted ? (
                    <div className="absolute inset-0 -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="time"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }}
                                    dy={10}
                                    tickFormatter={(str) => {
                                        try {
                                            const date = new Date(str);
                                            // If valid date, return HH:mm
                                            if (!isNaN(date.getTime())) {
                                                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            }
                                            return str;
                                        } catch (e) {
                                            return str;
                                        }
                                    }}
                                    interval="preserveStartEnd"
                                    minTickGap={30}
                                />
                                <YAxis
                                    hide={true}
                                    domain={yDomain}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        borderColor: '#f3f4f6',
                                        borderRadius: '12px',
                                        color: '#111827',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                        padding: '8px 12px',
                                    }}
                                    itemStyle={{ color: isPositive ? '#10b981' : '#ef4444', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#6b7280', marginBottom: '4px', fontSize: '10px', fontWeight: 600 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isPositive ? "#10b981" : "#ef4444"}
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill={`url(#${gradientId})`}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-pulse w-full h-full bg-gray-50 rounded-2xl" />
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chart;