import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, TrendingDown, Info } from 'lucide-react';

export default function SentimentGauge({ score = 75 }) {
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => setDisplayScore(score), 500);
        return () => clearTimeout(timer);
    }, [score]);

    const getSentimentLabel = (s) => {
        if (s > 80) return { text: 'EXTREME BULLISH', color: '#10b981' };
        if (s > 60) return { text: 'BULLISH', color: '#10b981' };
        if (s < 20) return { text: 'EXTREME BEARISH', color: '#ef4444' };
        if (s < 40) return { text: 'BEARISH', color: '#ef4444' };
        return { text: 'NEUTRAL', color: 'var(--color-text-secondary)' };
    };

    const label = getSentimentLabel(displayScore);

    return (
        <div className="card glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div className="flex-row justify-between items-center w-full" style={{ marginBottom: '8px' }}>
                <div className="flex-row items-center gap-sm">
                    <Zap size={16} color="var(--color-accent-primary)" />
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Smart Money Index</span>
                </div>
                <Info size={14} color="var(--color-text-tertiary)" className="cursor-pointer" />
            </div>

            <div style={{ position: 'relative', width: '180px', height: '90px', overflow: 'hidden' }}>
                {/* Gauge Background */}
                <div style={{
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    border: '14px solid rgba(255,255,255,0.05)',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }} />

                {/* Active Gauge Fill */}
                <motion.div
                    initial={{ rotate: -90 }}
                    animate={{ rotate: -90 + (displayScore * 1.8) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    style={{
                        width: '180px',
                        height: '180px',
                        borderRadius: '50%',
                        border: '14px solid transparent',
                        borderTopColor: label.color,
                        borderRightColor: displayScore > 50 ? label.color : 'transparent',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        transformOrigin: 'center',
                        zIndex: 1
                    }}
                />

                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    width: '100%',
                    textAlign: 'center',
                    zIndex: 2
                }}>
                    <div style={{ fontSize: '32px', fontWeight: '900', color: 'white' }}>{displayScore}</div>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: label.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {label.text}
                    </div>
                </div>
            </div>

            <div style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
                lineHeight: '1.4'
            }}>
                <div className="flex-row items-center gap-xs" style={{ marginBottom: '4px' }}>
                    {displayScore > 50 ? <TrendingUp size={12} color="#10b981" /> : <TrendingDown size={12} color="#ef4444" />}
                    <span style={{ fontWeight: 'bold', color: 'white' }}>Institutional Flow</span>
                </div>
                Retail exhaustion detected. Large blocks entering {displayScore > 50 ? 'Long' : 'Short'} positions across major liquidity pools.
            </div>
        </div>
    );
}
