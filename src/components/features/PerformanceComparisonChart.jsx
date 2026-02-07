import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const PerformanceComparisonChart = ({ userEquity, systemEquity }) => {

    const data = useMemo(() => {
        // Normalize lengths to percentage progress for comparison
        // Or if simple mock, just zip them if lengths align.
        // For this demo, we assume they align by "Trade Count" or "Time" roughly.
        // We'll create a merged dataset normalized by index (Trade #)

        if (!userEquity || !systemEquity) return [];

        const maxLength = Math.max(userEquity.length, systemEquity.length);
        const merged = [];

        for (let i = 0; i < maxLength; i++) {
            merged.push({
                index: i,
                user: userEquity[i] || null,
                system: systemEquity[i] || null // System usually has more history, so this might be mismatched scale-wise without complex alignment.
                // For MVP, we compare last N trades.
            });
        }

        // Alignment Hack: Align the start of User History to System History index 0, or align by Date if available.
        // Simplest for now: Compare the *growth shape*.
        return merged.slice(0, 50); // Show first 50 data points for clarity
    }, [userEquity, systemEquity]);

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorSystem" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="index" stroke="#94a3b8" fontSize={10} tickFormatter={(i) => `T${i}`} />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="system" stroke="#8884d8" fillOpacity={1} fill="url(#colorSystem)" name="Strategy Expected" />
                    <Area type="monotone" dataKey="user" stroke="#82ca9d" fillOpacity={1} fill="url(#colorUser)" name="My Performance" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PerformanceComparisonChart;
