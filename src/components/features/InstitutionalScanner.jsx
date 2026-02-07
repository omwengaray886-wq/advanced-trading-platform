import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
    Shield,
    Target,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    Search
} from 'lucide-react';
import { scannerService } from '../../services/ScannerService';

const InstitutionalScanner = ({ onSelectSymbol }) => {
    const [results, setResults] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [globalBias, setGlobalBias] = useState({ bias: 'NEUTRAL', bullPercentage: 50 });
    const [filter, setFilter] = useState('');

    const runScan = async () => {
        setScanning(true);
        setProgress(0);

        const data = await scannerService.scanAll((prog) => {
            setProgress(prog);
        });

        setResults(data);
        setGlobalBias(scannerService.getGlobalBias());
        setScanning(false);
    };

    useEffect(() => {
        runScan();
        const interval = setInterval(runScan, 300000); // Auto-scan every 5 mins
        return () => clearInterval(interval);
    }, []);

    const filteredResults = results.filter(r =>
        r.symbol.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="card" style={{ padding: '0', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                        background: 'var(--color-primary-soft)',
                        padding: '8px',
                        borderRadius: '8px',
                        color: 'var(--color-primary)'
                    }}>
                        <Search size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Institutional SMC Scanner</h3>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            Monitoring {results.length} institutional benchmarks
                        </p>
                    </div>
                </div>

                <button
                    onClick={runScan}
                    disabled={scanning}
                    className="btn btn-ghost"
                    style={{ padding: '8px' }}
                >
                    <RefreshCw size={18} className={scanning ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Global Bias Meter */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                    <span>Global Market Bias</span>
                    <span style={{
                        color: globalBias.bias === 'BULLISH' ? 'var(--color-success)' :
                            globalBias.bias === 'BEARISH' ? 'var(--color-danger)' : 'var(--color-warning)',
                        fontWeight: 'bold'
                    }}>
                        {globalBias.bias} ({globalBias.bullPercentage}% Bullish)
                    </span>
                </div>
                <div style={{ height: '6px', background: 'var(--color-bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div
                        initial={{ width: '50%' }}
                        animate={{ width: `${globalBias.bullPercentage}%` }}
                        style={{
                            height: '100%',
                            background: globalBias.bias === 'BULLISH' ? 'var(--color-success)' :
                                globalBias.bias === 'BEARISH' ? 'var(--color-danger)' : 'var(--color-warning)'
                        }}
                    />
                </div>
            </div>

            {/* Progress Bar (Only during scan) */}
            {scanning && (
                <div style={{ height: '2px', background: 'var(--color-bg-tertiary)', width: '100%' }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        style={{ height: '100%', background: 'var(--color-primary)' }}
                    />
                </div>
            )}

            {/* Symbols Table */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-secondary)', zIndex: 1 }}>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Symbol</th>
                            <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Structure</th>
                            <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>SMT Div</th>
                            <th style={{ padding: '12px 16px', color: 'var(--color-text-secondary)', fontWeight: '500' }}>Conviction</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {filteredResults.map((res, i) => (
                                <motion.tr
                                    key={res.symbol}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => onSelectSymbol(res.symbol)}
                                    style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                    className="hover-highlight"
                                >
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: '600' }}>{res.symbol}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                            ${res.price.toLocaleString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {res.trend === 'BULLISH' ? (
                                                <TrendingUp size={14} color="var(--color-success)" />
                                            ) : (
                                                <TrendingDown size={14} color="var(--color-danger)" />
                                            )}
                                            <span style={{
                                                color: res.trend === 'BULLISH' ? 'var(--color-success)' : 'var(--color-danger)',
                                                fontWeight: '500'
                                            }}>
                                                {res.trend}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                            {res.structure.replace('_', ' ')}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {res.hasDivergence ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Zap size={14} color="#FFD700" />
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#FFD700' }}>SMT DETECTED</span>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-tertiary)', fontSize: '11px' }}>---</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                color: res.confidence > 0.8 ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                                            }}>
                                                {(res.confidence * 100).toFixed(0)}%
                                            </div>
                                            {res.hasSetup && (
                                                <div className="pulse-primary" style={{
                                                    padding: '4px 8px',
                                                    background: 'var(--color-primary)',
                                                    color: 'white',
                                                    borderRadius: '4px',
                                                    fontSize: '9px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    Setup
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>

                {filteredResults.length === 0 && !scanning && (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        No results found for your filter.
                    </div>
                )}
            </div>

            <style>{`
                .hover-highlight:hover {
                    background: rgba(255, 255, 255, 0.03);
                }
                .pulse-primary {
                    animation: scanner-pulse 2s infinite;
                }
                @keyframes scanner-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(41, 121, 255, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(41, 121, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(41, 121, 255, 0); }
                }
            `}</style>
        </div>
    );
};

export default InstitutionalScanner;
