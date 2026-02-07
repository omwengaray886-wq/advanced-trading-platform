import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, TrendingUp, TrendingDown, LayoutList, Zap } from 'lucide-react';
import { marketData } from '../services/marketData';
import { AnalysisOrchestrator } from '../services/analysisOrchestrator';
import Footer from '../components/layout/Footer';

const orchestrator = new AnalysisOrchestrator();

const SCAN_LIST = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
    'EURUSDT', 'GBPUSDT', 'XAUUSDT', 'XAGUSDT', 'JPYUSDT', 'AUDUSDT'
];

export default function MarketScanner() {
    const [scanResults, setScanResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        const runScan = async () => {
            setLoading(true);
            const batchResults = await Promise.all(SCAN_LIST.map(async (symbol) => {
                try {
                    const data = await marketData.fetchHistory(symbol, '1H', 100);
                    const analysis = await orchestrator.analyze(data, symbol, '1H');
                    const topSetup = analysis.setups[0] || null;

                    return {
                        symbol,
                        price: data[data.length - 1].close,
                        change: ((data[data.length - 1].close - data[0].close) / data[0].close) * 100,
                        setup: topSetup ? topSetup.logic : 'NONE',
                        direction: topSetup ? topSetup.direction : 'NEUTRAL',
                        score: topSetup ? topSetup.quantScore : 0
                    };
                } catch (e) {
                    return null;
                }
            }));

            setScanResults(batchResults.filter(Boolean));
            setLoading(false);
        };

        runScan();
    }, []);

    const filteredResults = scanResults.filter(res => {
        if (filter === 'ALL') return true;
        if (filter === 'SETUPS') return res.setup !== 'NONE';
        if (filter === 'BULLISH') return res.direction === 'LONG';
        if (filter === 'BEARISH') return res.direction === 'SHORT';
        return true;
    });

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <main style={{ flex: 1, padding: '40px 20px' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <header className="flex-row justify-between items-end" style={{ marginBottom: '32px' }}>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '8px' }}>Market Scanner</h1>
                            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Parallel pattern recognition across global markets.</p>
                        </div>
                        <div className="flex-row gap-sm">
                            <div className="flex-row gap-xs" style={{ background: 'var(--color-bg-tertiary)', padding: '4px', borderRadius: '8px' }}>
                                {['ALL', 'SETUPS', 'BULLISH', 'BEARISH'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`btn btn-xs ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-secondary)' }}>
                                    <th style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Symbol</th>
                                    <th style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Price</th>
                                    <th style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>24h Chg</th>
                                    <th style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Institutional Logic</th>
                                    <th style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Quant Score</th>
                                    <th style={{ padding: '16px', fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(8)].map((_, i) => (
                                        <tr key={i} className="animate-pulse" style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                            <td colSpan="6" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)' }}></td>
                                        </tr>
                                    ))
                                ) : (
                                    filteredResults.map((res, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border-subtle)', transition: 'background 0.2s' }} className="hover-row">
                                            <td style={{ padding: '16px', fontWeight: 'bold' }}>{res.symbol}</td>
                                            <td style={{ padding: '16px' }}>${res.price.toLocaleString()}</td>
                                            <td style={{ padding: '16px', color: res.change >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                {res.change >= 0 ? '+' : ''}{res.change.toFixed(2)}%
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {res.setup === 'NONE' ? (
                                                    <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Scanning...</span>
                                                ) : (
                                                    <span className={`badge ${res.direction === 'LONG' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                                                        {res.setup}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div className="flex-row items-center gap-sm">
                                                    <div style={{ flex: 1, height: '4px', background: 'rgba(255,b255,255,0.05)', borderRadius: '2px' }}>
                                                        <div style={{ width: `${res.score}%`, height: '100%', background: 'var(--color-accent-primary)', borderRadius: '2px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{res.score}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <button className="btn btn-xs btn-ghost" style={{ border: '1px solid var(--color-border-subtle)' }}>View Chart</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            <Footer />
            <style>{`
                .hover-row:hover { background: rgba(56, 189, 248, 0.03); }
            `}</style>
        </div>
    );
}
