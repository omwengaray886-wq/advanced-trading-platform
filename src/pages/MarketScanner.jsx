import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, TrendingUp, TrendingDown, LayoutList, Zap,
    Activity, Shield, Target, Binary, BarChart3, AlertCircle,
    ArrowUpRight, ArrowDownRight, Layers, Maximize2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { marketData } from '../services/marketData';
import { AnalysisOrchestrator } from '../services/analysisOrchestrator';
import Footer from '../components/layout/Footer';

const orchestrator = new AnalysisOrchestrator();

const SCAN_LIST = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT',
    'EURUSDT', 'GBPUSDT', 'AUDUSDT', 'XAUUSDT', 'XAGUSDT'
];

export default function MarketScanner() {
    const [scanResults, setScanResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const navigate = useNavigate();

    useEffect(() => {
        const runScan = async () => {
            setLoading(true);
            const batchResults = await Promise.all(SCAN_LIST.map(async (symbol) => {
                try {
                    // Fetch MTF Data for full logic matrix
                    const [h1, h4, d1] = await Promise.all([
                        marketData.fetchHistory(symbol, '1h', 100),
                        marketData.fetchHistory(symbol, '4h', 50),
                        marketData.fetchHistory(symbol, '1d', 30)
                    ]);

                    const analysis = await orchestrator.analyze(h1, symbol, '1h', null, { '4h': h4, '1d': d1 });
                    const topSetup = analysis.setups[0] || null;
                    const marketState = analysis.marketState;

                    return {
                        symbol,
                        price: h1[h1.length - 1].close,
                        change: ((h1[h1.length - 1].close - h1[0].close) / h1[0].close) * 100,
                        setup: topSetup ? topSetup.strategy : 'NEUTRAL',
                        direction: topSetup ? topSetup.direction : 'NEUTRAL',
                        score: topSetup ? topSetup.quantScore : marketState.smtConfluence || 0,
                        bias: marketState.mtf?.globalBias || 'NEUTRAL',
                        rs: marketState.relativeStrength || { status: 'NEUTRAL', score: 50 },
                        confluences: (topSetup?.annotations?.length || 0) + (marketState.hazards?.length || 0),
                        hasSweep: !!marketState.liquiditySweep,
                        hasSMT: !!marketState.smtDivergence,
                        volatility: marketState.volatility,
                        mtfMatrix: {
                            '1H': marketState.currentTrend,
                            '4H': marketState.mtf?.context?.trend?.direction || 'NEUTRAL',
                            '1D': marketState.mtf?.higherContext?.trend?.direction || 'NEUTRAL' // Fallback
                        }
                    };
                } catch (e) {
                    console.error(`Scan failed for ${symbol}:`, e);
                    return null;
                }
            }));

            setScanResults(batchResults.filter(Boolean).sort((a, b) => b.score - a.score));
            setLoading(false);
        };

        runScan();
    }, []);

    const filteredResults = scanResults.filter(res => {
        if (filter === 'ALL') return true;
        if (filter === 'SETUPS') return res.setup !== 'NEUTRAL';
        if (filter === 'BULLISH') return res.direction === 'LONG' || res.bias === 'BULLISH';
        if (filter === 'BEARISH') return res.direction === 'SHORT' || res.bias === 'BEARISH';
        if (filter === 'LEADERS') return res.rs.status === 'LEADER';
        return true;
    });

    const getBiasColor = (bias) => {
        if (bias === 'BULLISH' || bias === 'LONG') return 'var(--color-success)';
        if (bias === 'BEARISH' || bias === 'SHORT') return 'var(--color-danger)';
        return 'var(--color-text-tertiary)';
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#000' }}>
            <main style={{ flex: 1, padding: '32px 24px' }}>
                <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                    <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                            <div className="flex-row items-center gap-sm" style={{ marginBottom: '8px' }}>
                                <Shield size={16} color="var(--color-accent-primary)" />
                                <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-accent-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Institutional Flow</span>
                            </div>
                            <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-0.02em' }}>Command Center</h1>
                        </div>

                        <div className="flex-row gap-md">
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '2px' }}>
                                {['ALL', 'SETUPS', 'BULLISH', 'BEARISH', 'LEADERS'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            border: 'none',
                                            background: filter === f ? 'var(--color-accent-primary)' : 'transparent',
                                            color: filter === f ? 'white' : 'rgba(255,255,255,0.4)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    <div className="card glass-panel" style={{ padding: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th style={styles.th}>ASSET</th>
                                    <th style={styles.th}>PRICE / 24H</th>
                                    <th style={styles.th}>MTF BIAS MATRIX</th>
                                    <th style={styles.th}>INSTITUTIONAL EDGE</th>
                                    <th style={styles.th}>RS RANKING</th>
                                    <th style={styles.th}>ALERTS</th>
                                    <th style={styles.th}>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(10)].map((_, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td colSpan="7" style={{ padding: '24px' }}><div className="skeleton" style={{ height: '20px', width: '100%' }} /></td>
                                        </tr>
                                    ))
                                ) : (
                                    <AnimatePresence>
                                        {filteredResults.map((res, i) => (
                                            <motion.tr
                                                key={res.symbol}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                style={styles.tr}
                                                className="row-hover"
                                            >
                                                <td style={styles.td}>
                                                    <div className="flex-col">
                                                        <span style={{ fontSize: '15px', fontWeight: '900', color: 'white' }}>{res.symbol}</span>
                                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
                                                            {(typeof res.volatility === 'string' ? res.volatility : res.volatility?.volatilityState?.level) || 'NOMINAL'} VOL
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <div className="flex-col">
                                                        <span style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}>${res.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        <div className="flex-row items-center gap-xs">
                                                            {res.change >= 0 ? <ArrowUpRight size={12} color="var(--color-success)" /> : <ArrowDownRight size={12} color="var(--color-danger)" />}
                                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: res.change >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                                {res.change >= 0 ? '+' : ''}{res.change.toFixed(2)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <div className="flex-row gap-xs">
                                                        {['1H', '4H', '1D'].map(tf => (
                                                            <div key={tf} style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '6px',
                                                                background: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid rgba(255,255,255,0.05)',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '2px'
                                                            }}>
                                                                <span style={{ fontSize: '7px', fontWeight: 'bold', opacity: 0.4 }}>{tf}</span>
                                                                <div style={{
                                                                    width: '6px',
                                                                    height: '6px',
                                                                    borderRadius: '50%',
                                                                    background: getBiasColor(res.mtfMatrix[tf])
                                                                }} />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <div className="flex-col gap-xs">
                                                        <div className="flex-row items-center gap-sm">
                                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: getBiasColor(res.direction) }}>
                                                                {res.setup}
                                                            </span>
                                                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>SCORE</span>
                                                            <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--color-accent-primary)' }}>{res.score}</span>
                                                        </div>
                                                        <div style={{ width: '120px', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${res.score}%`, height: '100%', background: 'var(--color-accent-primary)' }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <div className="flex-row items-center gap-sm">
                                                        <div style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '10px',
                                                            fontWeight: '900',
                                                            background: res.rs.status === 'LEADER' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                            color: res.rs.status === 'LEADER' ? 'var(--color-success)' : 'var(--color-danger)',
                                                            border: `1px solid ${res.rs.status === 'LEADER' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                                        }}>
                                                            {res.rs.status}
                                                        </div>
                                                        <span style={{ fontSize: '12px', fontWeight: 'bold', opacity: 0.6 }}>{res.rs.score}%</span>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <div className="flex-row gap-sm">
                                                        {res.hasSweep && <Zap size={16} color="#facc15" title="Liquidity Sweep Detected" />}
                                                        {res.hasSMT && <Binary size={16} color="#c084fc" title="SMT Divergence Detected" />}
                                                        {res.confluences > 3 && <Layers size={16} color="var(--color-accent-primary)" title="High Confluence Setup" />}
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <button
                                                        onClick={() => navigate('/markets', { state: { pair: res.symbol } })}
                                                        style={styles.actionBtn}
                                                    >
                                                        <Maximize2 size={14} />
                                                        TERMINAL
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        <div className="card glass-panel" style={styles.infoCard}>
                            <Target size={20} color="var(--color-accent-primary)" />
                            <div className="flex-col">
                                <span style={styles.infoTitle}>Parallel Execution</span>
                                <p style={styles.infoDesc}>Analyzing {SCAN_LIST.length} assets concurrently across 3 timeframes and 48 sub-modules.</p>
                            </div>
                        </div>
                        <div className="card glass-panel" style={styles.infoCard}>
                            <Activity size={20} color="var(--color-success)" />
                            <div className="flex-col">
                                <span style={styles.infoTitle}>Alpha Discovery</span>
                                <p style={styles.infoDesc}>Institutional leadership and Relative Strength (RS) scoring updated in real-time.</p>
                            </div>
                        </div>
                        <div className="card glass-panel" style={styles.infoCard}>
                            <Shield size={20} color="#c084fc" />
                            <div className="flex-col">
                                <span style={styles.infoTitle}>MTF Guard</span>
                                <p style={styles.infoDesc}>Cross-timeframe structural validation for high-conviction directional bias.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
            <style>{`
                .row-hover:hover { background: rgba(56, 189, 248, 0.04) ! from #000; }
                .row-hover { border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.2s; }
                .skeleton { background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: loading 1.5s infinite; border-radius: 4px; }
                @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
            `}</style>
        </div>
    );
}

const styles = {
    th: {
        padding: '16px 24px',
        fontSize: '10px',
        fontWeight: '900',
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
    },
    td: {
        padding: '20px 24px',
        verticalAlign: 'middle'
    },
    tr: {
        cursor: 'pointer'
    },
    actionBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: 'white',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    infoCard: {
        padding: '24px',
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
        alignItems: 'flex-start',
        background: 'rgba(15, 23, 42, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)'
    },
    infoTitle: {
        fontSize: '14px',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '4px'
    },
    infoDesc: {
        fontSize: '12px',
        color: 'rgba(255,255,255,0.5)',
        lineHeight: '1.5'
    }
};
