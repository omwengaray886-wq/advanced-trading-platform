import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Target, Shield, AlertTriangle, TrendingUp, Calendar, ArrowRight, Zap, Layers, Activity } from 'lucide-react';

const SetupDetailView = ({ setup, onClose }) => {
    if (!setup) return null;

    const isLong = setup.direction === 'LONG';
    const riskReward = Math.abs((setup.targets[0]?.price || setup.targets[0]) - setup.entryZone.optimal) / Math.abs(setup.entryZone.optimal - setup.stopLoss);

    // Scenario probabilities
    const primaryScenario = setup.scenarios?.find(s => s.type === 'PRIMARY') || setup.scenarios?.[0];
    const alternateScenario = setup.scenarios?.find(s => s.type === 'ALTERNATE') || setup.scenarios?.[1];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px'
                }}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="card glass-panel"
                    style={{
                        width: '100%',
                        maxWidth: '850px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: 0,
                        border: '1px solid var(--border-color)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '24px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        background: isLong ? 'linear-gradient(to right, rgba(16, 185, 129, 0.1), transparent)' : 'linear-gradient(to right, rgba(239, 68, 68, 0.1), transparent)'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>{setup.symbol}</h2>
                                <span className={`badge ${isLong ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '14px', padding: '4px 12px' }}>
                                    {setup.direction}
                                </span>
                                <span className="badge badge-neutral" style={{ fontSize: '12px' }}>{setup.timeframe}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={14} />
                                    {new Date(setup.timestamp || Date.now()).toLocaleString()}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <TrendingUp size={14} />
                                    R:R {riskReward.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <button onClick={onClose} className="btn btn-ghost" style={{ padding: '8px' }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ padding: '24px' }}>
                        {/* Key Metrics Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                            <div className="card" style={{ background: 'var(--color-bg-tertiary)', padding: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Target size={14} /> ENTRY ZONE
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                                    {setup.entryZone?.optimal?.toFixed(5) || 'N/A'}
                                </div>
                            </div>
                            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Shield size={14} /> STOP LOSS
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                                    {setup.stopLoss?.toFixed(5) || 'N/A'}
                                </div>
                            </div>
                            <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', padding: '16px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-success)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Target size={14} /> TARGET 1
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                                    {setup.targets?.[0]?.price?.toFixed(5) || setup.targets?.[0]?.toFixed(5) || 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Analysis Content */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '24px' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={18} /> Institutional Rationale
                                </h3>
                                <div style={{
                                    lineHeight: '1.6',
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '13px',
                                    whiteSpace: 'pre-line',
                                    background: 'var(--color-bg-secondary)',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    marginBottom: '24px'
                                }}>
                                    {setup.detailedRationale || setup.rationale || setup.thesis}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                                    {/* SMT Divergence Panel */}
                                    {setup.smtDivergence && (
                                        <div className="card" style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                                            <h4 style={{ fontSize: '12px', color: 'var(--color-text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Zap size={14} color="#6366f1" /> SMT DIVERGENCE
                                            </h4>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                                                vs {setup.smtDivergence.siblingSymbol}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                                {setup.smtDivergence.type} detected at {setup.smtDivergence.price?.toFixed(5)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Scenario Panel */}
                                    {(primaryScenario || alternateScenario) && (
                                        <div className="card" style={{ padding: '12px' }}>
                                            <h4 style={{ fontSize: '12px', color: 'var(--color-text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <TrendingUp size={14} /> SCENARIOS
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {primaryScenario && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                        <span style={{ color: 'var(--color-success)' }}>Primary</span>
                                                        <span style={{ fontWeight: 'bold' }}>{primaryScenario.probability}%</span>
                                                    </div>
                                                )}
                                                {alternateScenario && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                                        <span style={{ color: 'var(--color-warning)' }}>Alternate</span>
                                                        <span style={{ fontWeight: 'bold' }}>{alternateScenario.probability}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Liquidity Context */}
                                {setup.liquidityPools && setup.liquidityPools.length > 0 && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Layers size={16} /> Key Liquidity Clusters
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                                            {setup.liquidityPools.map((pool, idx) => (
                                                <div key={idx} style={{
                                                    padding: '8px 12px',
                                                    background: 'var(--color-bg-tertiary)',
                                                    borderRadius: '6px',
                                                    border: '1px solid var(--border-color)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div style={{ fontSize: '12px' }}>
                                                        <div style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>{pool.price.toFixed(5)}</div>
                                                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{pool.side}</div>
                                                    </div>
                                                    <div className={`badge ${pool.strength === 'High' ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '10px' }}>
                                                        {pool.strength}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--color-text-primary)' }}>Confluence Factors</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {setup.annotations?.map((anno, idx) => (
                                            setup.annotations.length > 0 && ['ORDER_BLOCK', 'LIQUIDITY_ZONE', 'FVG', 'STRUCTURE_BREAK'].includes(anno.type) && (
                                                <div key={idx} style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    background: 'var(--color-bg-tertiary)',
                                                    fontSize: '12px',
                                                    border: '1px solid var(--border-color)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-accent-primary)' }}></div>
                                                    {anno.type.replace(/_/g, ' ')}
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Risk Panel */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="card" style={{ padding: '16px' }}>
                                    <h4 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertTriangle size={16} /> Risk Analysis
                                    </h4>

                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>Quant Score</span>
                                            <span style={{ fontWeight: 'bold', color: setup.quantScore > 70 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                                {setup.quantScore}%
                                            </span>
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--color-bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ width: `${setup.quantScore}%`, height: '100%', background: setup.quantScore > 70 ? 'var(--color-success)' : 'var(--color-warning)' }}></div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--color-text-tertiary)' }}>R:R Ratio</span>
                                            <span style={{ fontWeight: 'bold' }}>1 : {riskReward.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div style={{ padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                        <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>Execution Note:</div>
                                        Wait for candle close confirmation on {setup.timeframe} timeframe before entry.
                                    </div>
                                </div>

                                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                    Execute Trade <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SetupDetailView;
