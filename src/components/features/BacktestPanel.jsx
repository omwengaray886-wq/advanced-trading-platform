import React, { useState } from 'react';
import { backtestService } from '../../services/backtestService';
import { optimizationService } from '../../services/optimizationService';
import { Play, TrendingUp, Filter, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

const BacktestPanel = ({ symbol, timeframe }) => {
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [mode, setMode] = useState('STANDARD'); // STANDARD | OPTIMIZE
    const [strategyFilter, setStrategyFilter] = useState('ALL');

    const handleRun = async () => {
        setRunning(true);
        setResults(null);

        try {
            if (mode === 'STANDARD') {
                const overrides = strategyFilter !== 'ALL' ? { strategyFilter } : {};
                const data = await backtestService.runBacktest(symbol, timeframe, 300, overrides);
                setResults(data);
            } else {
                // Optimization Mode
                const data = await optimizationService.optimize(symbol, timeframe);
                setResults(data.best); // Show best result
            }
        } catch (error) {
            console.error(error);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="card" style={{ padding: '16px', marginTop: '16px', background: '#0f172a' }}>
            <div className="flex-row justify-between items-center" style={{ marginBottom: '16px' }}>
                <div className="flex-row items-center gap-sm">
                    <BarChart2 size={18} color="#38bdf8" />
                    <h3 style={{ margin: 0, fontSize: '14px', color: '#fff' }}>Strategy Lab</h3>
                </div>

                <div className="flex-row gap-xs">
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '11px', padding: '4px' }}
                    >
                        <option value="STANDARD">Backtest</option>
                        <option value="OPTIMIZE">Optimize</option>
                    </select>

                    <select
                        value={strategyFilter}
                        onChange={(e) => setStrategyFilter(e.target.value)}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '11px', padding: '4px' }}
                    >
                        <option value="ALL">All Strategies</option>
                        <option value="SCALPER_ENGINE">Scalper Only</option>
                        <option value="Liquidity Sweep">Liquidity Sweeps</option>
                        <option value="Fair Value Gap">FVGs</option>
                    </select>

                    <button
                        onClick={handleRun}
                        disabled={running}
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        {running ? 'Running...' : <><Play size={10} /> Run</>}
                    </button>
                </div>
            </div>

            {/* Results Area */}
            {results && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="grid-cols-4 gap-md" style={{ marginBottom: '16px' }}>
                        <MetricBox label="Win Rate" value={`${results.stats.winRate}%`} color={results.stats.winRate > 50 ? '#10b981' : '#ef4444'} />
                        <MetricBox label="Profit Factor" value={results.stats.profitFactor} color="#38bdf8" />
                        <MetricBox label="Sharpe Ratio" value={results.stats.sharpe} color="#f59e0b" />
                        <MetricBox label="Total Return" value={`${results.stats.totalReturn}%`} color={results.stats.totalReturn > 0 ? '#10b981' : '#ef4444'} />
                    </div>

                    {/* Attribution */}
                    {results.alphaAttribution && (
                        <div style={{ marginTop: '12px' }}>
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px' }}>Strategy Attribution</div>
                            <div className="flex-row gap-xs">
                                {results.alphaAttribution.map(a => (
                                    <div key={a.factor} style={{ background: '#1e293b', padding: '6px', borderRadius: '4px', fontSize: '10px', flex: 1, textAlign: 'center' }}>
                                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{a.factor}</div>
                                        <div style={{ color: a.winRate > 50 ? '#10b981' : '#ef4444' }}>{a.winRate}% WR</div>
                                        <div style={{ color: '#64748b' }}>({a.impact} trades)</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Optimization Params Display */}
                    {mode === 'OPTIMIZE' && (
                        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '4px' }}>
                            <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>Optimal Parameters Found:</div>
                            <div style={{ fontSize: '11px', color: '#fff' }}>Stop Loss Multiplier: <b>{results.sl}x</b> | Take Profit Multiplier: <b>{results.tp}x</b></div>
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

const MetricBox = ({ label, value, color }) => (
    <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px' }}>
        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{label}</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: color }}>{value}</div>
    </div>
);

export default BacktestPanel;
