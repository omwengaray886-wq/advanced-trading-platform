import React, { useState, useEffect } from 'react';
import { correlationService } from '../../services/correlationService';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Info, ShieldAlert, Zap, ArrowRightLeft } from 'lucide-react';

/**
 * SMC Multi-Asset Correlation Heatmap (Phase 22)
 * Provides institutional macro context by correlating key benchmark assets:
 * BTC, DXY (Dollar Index), GOLD, SPX, EUR, ETH.
 */
const BENCHMARKS = ['BTCUSDT', 'DXY', 'XAUUSD', 'SPX', 'EURUSD', 'ETHUSDT'];
const LABELS = {
    'BTCUSDT': 'BTC',
    'DXY': 'DXY',
    'XAUUSD': 'GOLD',
    'SPX': 'S&P500',
    'EURUSD': 'EUR',
    'ETHUSDT': 'ETH'
};

export default function CorrelationHeatmap() {
    const [matrix, setMatrix] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hoveredCell, setHoveredCell] = useState(null);

    useEffect(() => {
        const fetchMatrix = async () => {
            try {
                const data = await correlationService.getMatrix(BENCHMARKS);
                setMatrix(data);
            } catch (err) {
                console.error("Correlation Heatmap failed to load:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMatrix();
        const interval = setInterval(fetchMatrix, 600000); // Institutional 10m refresh
        return () => clearInterval(interval);
    }, []);

    const getAnalysis = (s1, s2, val) => {
        const abs = Math.abs(val);
        if (s1 === s2) return "Self-correlation (Baseline)";

        let sentiment = "";
        if (val > 0.8) sentiment = "Strong Positive: High Systemic Beta.";
        else if (val > 0.5) sentiment = "Moderate Positive: Assets moving in tandem.";
        else if (val < -0.8) sentiment = "Strong Inverse: Strategic Hedge Relationship.";
        else if (val < -0.5) sentiment = "Moderate Inverse: Divergent Price Action.";
        else sentiment = "Uncorrelated: Independent market drivers.";

        // Special SMC logic
        if ((s1 === 'DXY' || s2 === 'DXY') && val < -0.7) {
            return `${sentiment} Dollar strength usually pressures this asset. SMC logic: Watch DXY structural breaks for leading reversal signals.`;
        }
        return sentiment;
    };

    const getBgColor = (val) => {
        if (val > 0) return `rgba(29, 185, 84, ${Math.pow(val, 2) * 0.6 + 0.05})`; // Green for positive
        return `rgba(230, 57, 70, ${Math.pow(val, 2) * 0.6 + 0.05})`; // Red for inverse
    };

    if (loading) return (
        <div className="card glass-panel" style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="flex-col items-center gap-md">
                <Activity className="animate-pulse" color="var(--color-accent-primary)" />
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Calculating Institutional Correlations...</span>
            </div>
        </div>
    );

    return (
        <div className="card glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            {/* Background Grain/Glow */}
            <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)', zIndex: 0 }} />

            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowRightLeft size={18} color="#3b82f6" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#f8fafc' }}>SMC Macro Correlations</h3>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)' }}>Cross-asset footprint analysis</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="badge badge-neutral" style={{ fontSize: '10px' }}>Pearson Mode</div>
                    <div className="badge badge-success" style={{ fontSize: '10px' }}>1H Base</div>
                </div>
            </header>

            <div style={{ position: 'relative' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '6px' }}>
                    <thead>
                        <tr>
                            <th />
                            {BENCHMARKS.map(symbol => (
                                <th key={symbol} style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', padding: '6px', textAlign: 'center', fontWeight: '500' }}>
                                    {LABELS[symbol]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {matrix && BENCHMARKS.map(s1 => (
                            <tr key={s1}>
                                <td style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-text-secondary)', padding: '8px' }}>
                                    {LABELS[s1]}
                                </td>
                                {BENCHMARKS.map(s2 => {
                                    const val = matrix[s1] ? matrix[s1][s2] : 0;
                                    const isHovered = hoveredCell && hoveredCell.s1 === s1 && hoveredCell.s2 === s2;

                                    return (
                                        <motion.td
                                            key={s2}
                                            onMouseEnter={() => setHoveredCell({ s1, s2, val })}
                                            onMouseLeave={() => setHoveredCell(null)}
                                            animate={{
                                                scale: isHovered ? 1.05 : 1,
                                                borderColor: isHovered ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.05)'
                                            }}
                                            style={{
                                                background: getBgColor(val),
                                                borderRadius: '6px',
                                                padding: '12px 6px',
                                                textAlign: 'center',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                color: Math.abs(val) > 0.6 ? 'white' : 'var(--color-text-secondary)',
                                                border: '1px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'background 0.3s ease'
                                            }}
                                        >
                                            {val === 1 && s1 !== s2 ? '0.99' : val.toFixed(2)}
                                        </motion.td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Analysis Tooltip */}
                <AnimatePresence>
                    {hoveredCell && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            style={{
                                marginTop: '20px',
                                padding: '12px',
                                background: 'rgba(30, 41, 59, 0.8)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'flex-start'
                            }}
                        >
                            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)' }}>
                                <Zap size={14} color="#3b82f6" />
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                                    {LABELS[hoveredCell.s1]} ↔ {LABELS[hoveredCell.s2]} Relationships
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                                    {getAnalysis(hoveredCell.s1, hoveredCell.s2, hoveredCell.val)}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {!hoveredCell && (
                    <div style={{ marginTop: '20px', padding: '12px', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={14} color="var(--color-text-tertiary)" />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                            Hover over a cell for institutional relationship analysis.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
