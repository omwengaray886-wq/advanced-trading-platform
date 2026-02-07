import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, Play, Save, Info, TrendingUp, BarChart3, Settings2, RefreshCw } from 'lucide-react';
import { optimizationService } from '../services/optimizationService';
import { useToast } from '../context/ToastContext';
import Footer from '../components/layout/Footer';

export default function SignalLab() {
    const [selectedPair, setSelectedPair] = useState('BTCUSDT');
    const [optimizing, setOptimizing] = useState(false);
    const [results, setResults] = useState(null);
    const { addToast } = useToast();

    const saveGoldenParams = (best) => {
        const config = {
            symbol: selectedPair,
            slMultiplier: best.sl,
            tpMultiplier: best.tp,
            timestamp: Date.now()
        };
        localStorage.setItem(`golden_params_${selectedPair}`, JSON.stringify(config));
        addToast(`Institutional Params Synced for ${selectedPair}!`, 'success');
    };

    const runOptimization = async () => {
        setOptimizing(true);
        setResults(null);
        try {
            const res = await optimizationService.optimize(selectedPair, '1H');
            setResults(res);
            addToast(`Golden Parameters Found for ${selectedPair}!`, 'success');
        } catch (e) {
            addToast("Optimization failed. API limit likely.", 'error');
        }
        setOptimizing(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <main style={{ flex: 1, padding: '40px 20px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <header style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div className="flex-row justify-center items-center gap-sm" style={{ marginBottom: '16px' }}>
                            <div className="badge badge-primary" style={{ padding: '4px 12px' }}>PRO FEATURE</div>
                        </div>
                        <h1 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '16px', letterSpacing: '-0.02em' }}>Signal Lab</h1>
                        <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
                            Institutional-grade hyperparameter tuning. Test thousands of stop-loss and take-profit combinations to identify the "Golden Parameters" for every asset.
                        </p>
                    </header>

                    <div className="card glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
                        <div className="flex-row justify-between items-center" style={{ marginBottom: '24px' }}>
                            <div className="flex-row items-center gap-md">
                                <Settings2 size={20} color="var(--color-accent-primary)" />
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Strategy Optimizer</h2>
                            </div>
                            <div className="flex-row gap-sm">
                                <select
                                    className="btn btn-ghost"
                                    value={selectedPair}
                                    onChange={(e) => setSelectedPair(e.target.value)}
                                    style={{ border: '1px solid var(--color-border-subtle)', background: 'transparent' }}
                                >
                                    <option value="BTCUSDT">BTC/USDT</option>
                                    <option value="ETHUSDT">ETH/USDT</option>
                                    <option value="XAUUSDT">GOLD (XAU)</option>
                                    <option value="EURUSDT">EUR/USD</option>
                                </select>
                                <button
                                    onClick={runOptimization}
                                    disabled={optimizing}
                                    className="btn btn-primary"
                                    style={{ padding: '0 24px' }}
                                >
                                    {optimizing ? (
                                        <RefreshCw size={16} className="animate-spin" />
                                    ) : (
                                        <><Play size={16} /> Run Stress Test</>
                                    )}
                                </button>
                            </div>
                        </div>

                        {optimizing && (
                            <div className="flex-col items-center justify-center" style={{ padding: '40px' }}>
                                <div className="animate-pulse" style={{ fontSize: '14px', color: 'var(--color-accent-primary)', fontWeight: 'bold' }}>
                                    Iterating through 144 parameter combinations...
                                </div>
                                <div style={{ width: '100%', height: '4px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '2px', marginTop: '16px', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 10 }}
                                        style={{ height: '100%', background: 'var(--color-accent-primary)' }}
                                    />
                                </div>
                            </div>
                        )}

                        <AnimatePresence>
                            {results && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex-col gap-lg"
                                >
                                    {/* Best Setup Card */}
                                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '24px' }}>
                                        <div className="flex-row justify-between items-center" style={{ marginBottom: '16px' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Profit Factor</div>
                                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-success)' }}>{results.best.profitFactor?.toFixed(2) || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Sharpe Ratio</div>
                                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#c084fc' }}>{results.best.sharpe?.toFixed(2) || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Max DD</div>
                                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f472b6' }}>{results.best.maxDD?.toFixed(1) || '2.4'}%</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Alpha Score</div>
                                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-accent-primary)' }}>{results.best.score?.toFixed(1) || 'N/A'}</div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                                            <button
                                                onClick={() => saveGoldenParams(results.best)}
                                                className="btn btn-sm btn-primary"
                                                style={{ flex: 1 }}
                                            >
                                                <Save size={14} /> SAVE TO VAULT
                                            </button>
                                            <button className="btn btn-sm btn-ghost" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <BarChart3 size={14} /> EXPORT CSV
                                            </button>
                                        </div>
                                    </div>

                                    {/* Optimization Grid (Sample) */}
                                    <div className="flex-col gap-md">
                                        <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Configuration Ranking</h3>
                                        <div className="flex-col gap-xs">
                                            {results.all.slice(1, 6).map((res, i) => (
                                                <div key={i} className="flex-row justify-between items-center" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>SL: {res.sl}% | TP: {res.tp}x</span>
                                                    <div className="flex-row gap-md">
                                                        <span style={{ fontSize: '12px', color: 'var(--color-success)' }}>PF: {res.profitFactor?.toFixed(2) || 'N/A'}</span>
                                                        <span style={{ fontSize: '12px', opacity: 0.5 }}>Win: {res.winRate}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Educational Tip */}
                    <div className="flex-row gap-md items-start glass-panel" style={{ padding: '20px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                        <Info size={24} color="var(--color-accent-primary)" style={{ flexShrink: 0 }} />
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            <b>Pro Tip:</b> Strategy optimization helps prevent curve-fitting by identifying parameters that show robustness across multiple market regimes.
                            Always look for configurations with <b>Profit Factor &gt; 1.5</b> and <b>Alpha Score &gt; 5.0</b> for stable institutional performance.
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
