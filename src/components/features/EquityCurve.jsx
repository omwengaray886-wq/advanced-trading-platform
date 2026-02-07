import React from 'react';
import { motion } from 'framer-motion';

export default function EquityCurve({ data = [], height = 300 }) {
    if (!data || data.length === 0) return <div style={{ height, background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }} />;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = range * 0.1;

    // Calculate Drawdown Curve
    let peak = -Infinity;
    const drawdownData = data.map(v => {
        if (v > peak) peak = v;
        return ((v - peak) / peak) * 100; // Percentage drawdown
    });

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - (min - padding)) / (range + padding * 2)) * 100;
        return `${x},${y}`;
    }).join(' ');

    const ddPoints = drawdownData.map((val, i) => {
        const x = (i / (drawdownData.length - 1)) * 100;
        const y = 100 + (val * 2); // Scale DD for visual (e.g., -5% becomes 10 units down)
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `0,100 ${points} 100,100`;
    const ddAreaPath = `0,100 ${ddPoints} 100,100`;

    return (
        <div style={{ position: 'relative', width: '100%', height, background: 'var(--color-bg-tertiary)', borderRadius: '12px', padding: '20px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div className="flex-col">
                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Institutional Equity Audit</span>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--color-success)' }}>
                        +${(data[data.length - 1] - data[0]).toFixed(2)}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 'bold' }}>MAX DD: {Math.min(...drawdownData).toFixed(2)}%</span>
                </div>
            </div>

            <svg viewBox="0 0 100 120" preserveAspectRatio="none" style={{ width: '100%', height: 'calc(100% - 40px)', overflow: 'visible' }}>
                <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="ddGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Drawdown Area (Secondary) */}
                <motion.polygon
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    points={ddAreaPath}
                    fill="url(#ddGradient)"
                />
                <polyline points={ddPoints} fill="none" stroke="#ef4444" strokeWidth="0.5" strokeOpacity="0.4" />

                {/* Area under the curve */}
                <motion.polygon
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    points={areaPath}
                    fill="url(#equityGradient)"
                    style={{ transformOrigin: 'bottom' }}
                />

                {/* The Line */}
                <motion.polyline
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    points={points}
                    fill="none"
                    stroke="var(--color-accent-primary)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Grid Lines */}
                <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,b255,255,0.2)" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            </svg>

            <div style={{ position: 'absolute', right: '10px', bottom: '40px', display: 'flex', gap: '8px', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                <span>PEAK: ${max.toFixed(0)}</span>
                <span>LOW: ${min.toFixed(0)}</span>
            </div>
        </div>
    );
}
