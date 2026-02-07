import React from 'react';
import { motion } from 'framer-motion';

export default function EquityCurve({ data = [], height = 300 }) {
    if (!data || data.length === 0) return <div style={{ height, background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }} />;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = range * 0.1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - (min - padding)) / (range + padding * 2)) * 100;
        return `${x},${y}`;
    }).join(' ');

    const areaPath = `0,100 ${points} 100,100`;

    return (
        <div style={{ position: 'relative', width: '100%', height, background: 'var(--color-bg-tertiary)', borderRadius: '12px', padding: '20px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Strategy Equity Curve</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                    +${(data[data.length - 1] - data[0]).toFixed(2)}
                </span>
            </div>

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 'calc(100% - 30px)', overflow: 'visible' }}>
                <defs>
                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0" />
                    </linearGradient>
                </defs>

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

                {/* Grid Lines (Simple horizontal) */}
                <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            </svg>

            <div style={{ position: 'absolute', right: '10px', top: '40px', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                <span style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}>Max: ${max.toFixed(0)}</span>
                <span style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}>Min: ${min.toFixed(0)}</span>
            </div>
        </div>
    );
}
