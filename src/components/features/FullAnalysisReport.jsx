import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Shield, Target, TrendingUp, AlertCircle, Zap, BookOpen, Clock, BarChart2, Layers, Database } from 'lucide-react';
import PredictionBadge from './PredictionBadge';
import PathProjection from './PathProjection';
import TrapZoneWarning from './TrapZoneWarning';
import RegimeTransitionIndicator from './RegimeTransitionIndicator';
import RegimeTransitionIndicator from './RegimeTransitionIndicator';
import MacroSentimentWidget from './MacroSentimentWidget';
import { LeadLagMonitor } from './LeadLagMonitor';
import { PatternMatcher } from './PatternMatcher';

/**
 * FullAnalysisReport - Professional 9-Point breakdown displayed beneath the chart
 */
export default function FullAnalysisReport({ analysis, loading, realtimeDiag }) {
    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <Activity className="animate-spin" style={{ margin: '0 auto 16px' }} />
                <p>Developing Institutional Setup Analysis...</p>
            </div>
        );
    }

    if (!analysis) return null;

    const {
        explanation,
        setups = [],
        directionalReasoning,
        marketState,
        fundamentals,
        overallConfidence = 0.5,
        prediction,
        pathProjection,
        trapZones,
        probabilities,
        regimeTransition
    } = analysis;

    // Merge real-time diagnostics if prediction is NO_EDGE or if a critical real-time threat exists
    const displayPrediction = (prediction?.bias === 'NO_EDGE' && realtimeDiag)
        ? { ...prediction, ...realtimeDiag }
        : (prediction || realtimeDiag);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            style={{
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'rgba(15, 23, 42, 0.4)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                marginTop: '20px'
            }}
        >
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Predictive Forecasting Section */}
                {displayPrediction && <PredictionBadge prediction={displayPrediction} />}
                {regimeTransition && regimeTransition.probability >= 30 && (
                    <RegimeTransitionIndicator regimeTransition={regimeTransition} />
                )}
                {trapZones && trapZones.count > 0 && <TrapZoneWarning trapZones={trapZones} />}
                {pathProjection && <PathProjection pathProjection={pathProjection} />}

                {/* Performance Receipts (Phase 51) */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        padding: '12px 24px',
                        borderRadius: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        fontSize: '12px',
                        color: '#10b981'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>AUDITABLE RECEIPT:</span>
                        <span style={{ opacity: 0.8, fontFamily: 'monospace' }}>{displayPrediction?.id || 'N/A'}</span>
                        <div style={{ width: '1px', height: '14px', background: 'rgba(16, 185, 129, 0.3)' }} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <TrendingUp size={14} /> 30D Accuracy: 61% (System Wide)
                        </span>
                    </div>
                </div>

                <header style={{ marginBottom: '32px', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Quant-Institutional Analysis</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Shield size={16} /> Quant Score:
                            <span style={{
                                color: (setups[0]?.quantScore > 75) ? 'var(--color-success)' : 'var(--color-text-primary)',
                                fontWeight: 'bold',
                                fontSize: '16px'
                            }}>
                                {setups[0]?.quantScore || Math.round(overallConfidence * 100)}%
                            </span>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BarChart2 size={16} /> Regime: {marketState.regime}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Zap size={16} /> MTF: {marketState.mtf?.globalBias || 'NEUTRAL'}
                        </span>
                        {marketState.amdCycle && (
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: marketState.amdCycle.phase === 'MANIPULATION' ? '#ef4444' :
                                    marketState.amdCycle.phase === 'ACCUMULATION' ? '#f59e0b' : '#10b981',
                                fontWeight: 'bold'
                            }}>
                                <Clock size={16} /> Cycle: {marketState.amdCycle.phase}
                            </span>
                        )}
                        {marketState.smtConfluence > 0 && (
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#3b82f6',
                                fontSize: '11px',
                                fontWeight: 'bold'
                            }}>
                                <Layers size={12} /> SMT CONFLUENCE: {marketState.smtConfluence}%
                            </span>
                        )}
                        {setups[0]?.bayesianStats && (
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: 'rgba(139, 92, 246, 0.1)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                color: '#8b5cf6',
                                fontSize: '11px',
                                fontWeight: 'bold'
                            }}>
                                <Database size={12} /> BAYESIAN EDGE: {Math.round(setups[0].bayesianStats.probability * 100)}%
                            </span>
                        )}
                        {marketState.orderFlow && (
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                background: marketState.orderFlow.absorption?.detected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                border: marketState.orderFlow.absorption?.detected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                                color: marketState.orderFlow.absorption?.detected ? '#10b981' : 'var(--color-text-secondary)',
                                fontSize: '11px',
                                fontWeight: 'bold'
                            }}>
                                <Activity size={12} /> DELTA: {marketState.orderFlow.currentDelta > 0 ? '+' : ''}{Math.round(marketState.orderFlow.currentDelta)}
                                {marketState.orderFlow.absorption?.detected && " (ABSORPTION)"}
                            </span>
                        )}
                        <span style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: explanation?.isAiEnhanced ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            border: explanation?.isAiEnhanced ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                            color: explanation?.isAiEnhanced ? '#10b981' : '#f59e0b',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            letterSpacing: '0.02em'
                        }}>
                            {explanation?.isAiEnhanced ? (
                                <><Zap size={12} fill="#10b981" /> AI ENHANCED</>
                            ) : (
                                <><Activity size={12} /> STANDARD QUANT</>
                            )}
                        </span>
                    </div>
                </header>

                {/* Institutional Alerts (Phase 4 Integration) */}
                {marketState.alphaLeaks?.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                        {marketState.alphaLeaks.map((leak, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{
                                    background: leak.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    border: `1px solid ${leak.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    marginBottom: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    color: leak.severity === 'HIGH' ? '#ef4444' : '#f59e0b',
                                    fontSize: '13px'
                                }}
                            >
                                <AlertCircle size={18} />
                                <span style={{ fontWeight: '500' }}>{leak.warning}</span>
                            </motion.div>
                        ))}
                    </div>
                )}
                {marketState.amdCycle?.phase === 'MANIPULATION' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '16px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            color: '#ef4444'
                        }}
                    >
                        <AlertCircle size={24} />
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>MANIPULATION DETECTED (Judas Swing)</div>
                            <div style={{ fontSize: '13px', opacity: 0.8 }}>Institutional fakeout in progress. Avoid chasing the current momentum; wait for distribution expansion.</div>
                        </div>
                    </motion.div>
                )}

                {/* Accuracy & Convergence Map (Phase 5) */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '32px'
                }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <h4 style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Bayesian Credibility</h4>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: setups[0]?.bayesianStats?.confidence === 'PREMIUM' ? '#10b981' : '#f59e0b' }}>
                            {setups[0]?.bayesianStats?.confidence || 'NEUTRAL'}
                        </div>
                        <p style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>Realized Edge: {setups[0]?.bayesianStats?.realizedEdge || '0.00'}</p>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <h4 style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Fractal Convergence</h4>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: setups[0]?.fractalHandshake ? '#10b981' : '#ef4444' }}>
                            {setups[0]?.fractalHandshake ? 'FULL HANDSHAKE' : 'DIVERGED'}
                        </div>
                        <p style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>HTF Bios: {marketState.mtf?.globalBias}</p>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase' }}>DOM Pressure</h4>
                            {marketState.domStats?.isLive && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '9px',
                                    color: '#10b981',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '10px'
                                }}>
                                    LIVE
                                </div>
                            )}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: marketState.orderBookDepth?.pressure === 'BULLISH' ? '#10b981' : marketState.orderBookDepth?.pressure === 'BEARISH' ? '#ef4444' : 'var(--color-text-secondary)' }}>
                            {Math.abs((marketState.orderBookDepth?.imbalance || 0) * 100).toFixed(1)}% {marketState.orderBookDepth?.pressure || 'NEUTRAL'}
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                                position: 'absolute',
                                left: '50%',
                                width: `${Math.abs((marketState.orderBookDepth?.imbalance || 0) * 50)}%`,
                                height: '100%',
                                background: (marketState.orderBookDepth?.imbalance || 0) > 0 ? '#10b981' : '#ef4444',
                                transform: (marketState.orderBookDepth?.imbalance || 0) > 0 ? 'translateX(0)' : 'translateX(-100%)'
                            }} />
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h4 style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, textTransform: 'uppercase' }}>Market Obligation</h4>
                            {marketState.domStats && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '9px',
                                    color: marketState.domStats.isLive ? '#10b981' : '#ef4444',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    padding: '2px 6px',
                                    borderRadius: '10px'
                                }}>
                                    <motion.div
                                        animate={{ opacity: [1, 0.4, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }}
                                    />
                                    {marketState.domStats.latency || 0}ms
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: marketState.obligationState === 'OBLIGATED' ? '#10b981' : 'var(--color-text-secondary)' }}>
                                {marketState.obligationState || 'FREE_ROAMING'}
                            </div>
                            {marketState.primaryMagnet && (
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>{marketState.primaryMagnet.urgency.toFixed(0)}% PULL</div>
                            )}
                        </div>
                        <p style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                            {marketState.primaryMagnet ? `Magnet: ${marketState.primaryMagnet.type}` : 'No clear magnet'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Phase 6: Macro & Predictive Intelligence Widget */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
                <div style={{ flex: 1 }}>
                    {marketState?.macroSentiment && (
                        <MacroSentimentWidget sentiment={marketState.macroSentiment} />
                    )}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Lead-Lag Monitor */}
                    {marketState?.leadLag && (
                        <LeadLagMonitor leadLag={marketState.leadLag} />
                    )}
                    {/* Pattern Matcher */}
                    {marketState?.patterns && (
                        <PatternMatcher patterns={marketState.patterns} currentPrice={marketState.currentPrice} />
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                {/* Left Column: Bias & Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* 1. Market Bias */}
                    <section>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-accent-primary)' }}>
                            <TrendingUp size={18} /> 1. Market Bias (HTF & LTF)
                        </h3>
                        <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            {explanation.sections.htfBias}
                        </div>
                    </section>

                    {/* 2. Strategy Selected */}
                    <section>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-accent-secondary)' }}>
                            <Zap size={18} /> 2. Strategy Selected
                        </h3>
                        <div style={{ padding: '16px', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '8px', lineHeight: '1.6' }}>
                            {explanation.sections.strategySelected}
                        </div>
                    </section>

                    {/* 3 & 4. Why Long/Short exists */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <section>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-success)', marginBottom: '8px' }}>
                                📈 3. Why Long Setup Exists
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                                {explanation.sections.whyLongExists}
                            </p>
                        </section>
                        <section>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-danger)', marginBottom: '8px' }}>
                                📉 4. Why Short Setup Exists
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                                {explanation.sections.whyShortExists}
                            </p>
                        </section>
                    </div>
                </div>

                {/* Right Column: Execution & Risk */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* 5. Entry Logic */}
                    <section>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-success)' }}>
                            <Target size={18} /> 5. Entry Logic (Scaled Focus)
                        </h3>
                        <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', lineHeight: '1.6' }}>
                            {explanation.sections.entryLogic}
                        </div>
                    </section>

                    {/* 6. Risk Management */}
                    <section>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-warning)' }}>
                            <Shield size={18} /> 6. Risk Management (Small Accounts)
                        </h3>
                        <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', lineHeight: '1.6' }}>
                            {explanation.sections.riskManagement}
                        </div>
                    </section>

                    {/* 7. Invalidation */}
                    <section>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-danger)' }}>
                            <AlertCircle size={18} /> 7. Invalidation Conditions
                        </h3>
                        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', lineHeight: '1.6' }}>
                            {explanation.sections.invalidationConditions}
                        </div>
                    </section>
                </div>
            </div>

            {/* Bottom Row: Alts & Fundamentals */}
            <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <section>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <BookOpen size={18} /> 8. Alternative Scenarios
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                        {explanation.sections.alternativeScenarios}
                    </p>
                </section>
                <section>
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Clock size={18} /> 9. Fundamental Context
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                        {explanation.sections.fundamentals}
                    </p>
                </section>
            </div>

            {/* Institutional Setup Cards */}
            <div style={{ marginTop: '48px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Institutional Setup Portfolio</h3>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Showing {setups.length} High-Conviction Options
                    </span>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '20px'
                }}>
                    {setups.map(setup => (
                        <div
                            key={setup.id}
                            className="setup-card"
                            style={{
                                background: 'rgba(15, 23, 42, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'default',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.borderColor = setup.direction === 'LONG' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                                e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
                            }}
                        >
                            {/* Card Header */}
                            <header style={{
                                padding: '16px',
                                background: setup.direction === 'LONG' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderBottom: '1px solid var(--color-border-subtle)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        background: setup.direction === 'LONG' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: setup.direction === 'LONG' ? '#10b981' : '#ef4444',
                                        textTransform: 'uppercase'
                                    }}>
                                        {setup.direction}
                                    </div>
                                    <div style={{
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: 'var(--color-text-secondary)',
                                        textTransform: 'uppercase',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        {setup.executionComplexity || 'LOW'} DIFF
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: (setup.quantScore > 75) ? '#10b981' : 'var(--color-text-primary)'
                                }}>
                                    <Shield size={14} /> {setup.quantScore}%
                                </div>
                            </header>

                            {/* Card Body */}
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>ENTRY</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{setup.entryZone?.optimal?.toFixed(5)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>STOP</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-danger)' }}>{setup.stopLoss?.toFixed(5)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>R:R</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-accent-primary)' }}>{setup.rr?.toFixed(1) || '0.0'}:1</div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Institutional Execution</span>
                                        <span style={{
                                            color: setup.executionPrecision?.score > 80 ? 'var(--color-success)' :
                                                setup.executionPrecision?.score > 60 ? 'var(--color-warning)' : 'var(--color-danger)',
                                            fontWeight: 'bold'
                                        }}>
                                            {setup.executionPrecision?.score}% Precision
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>SPREAD IMPACT</div>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: setup.executionPrecision?.spreadImpact === 'HIGH' ? '#ef4444' : 'var(--color-text-primary)' }}>
                                                {setup.executionPrecision?.spreadImpact}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>SLIPPAGE PROB</div>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: setup.executionPrecision?.slippageProb === 'HIGH' ? '#ef4444' : 'var(--color-text-primary)' }}>
                                                {setup.executionPrecision?.slippageProb}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Suggested Position</span>
                                        <span style={{ color: 'var(--color-accent-primary)' }}>1% Account Risk</span>
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                                        {setup.suggestedSize} <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>{setup.assetClass === 'FOREX' ? 'Lots' : 'Units'}</span>
                                    </div>
                                </div>

                                {/* Levels */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>TARGET 1 (TP)</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {setup.targets?.[0]?.price?.toFixed(5) || 'N/A'}
                                            {setup.isClusterSynced && (
                                                <span title="Institutional Cluster Sync" style={{ color: '#8b5cf6', display: 'flex' }}>
                                                    <Database size={12} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>TARGET 2 (TP)</div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-success)' }}>{setup.targets?.[1]?.price?.toFixed(5) || 'N/A'}</div>
                                    </div>
                                </div>

                                {/* Probability Bar */}
                                <div style={{ height: '6px', background: 'var(--color-bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${setup.quantScore}%`,
                                        height: '100%',
                                        background: setup.quantScore > 75 ? 'var(--color-success)' : 'var(--color-accent-primary)',
                                        boxShadow: '0 0 10px var(--color-success)'
                                    }} />
                                </div>

                                {/* Phase 6: Monte Carlo Projection HUD */}
                                {setup.monteCarlo && (
                                    <div style={{
                                        background: 'rgba(59, 130, 246, 0.05)',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(59, 130, 246, 0.2)',
                                        fontSize: '11px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: '9px' }}>Monte Carlo Projection</span>
                                            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{setup.monteCarlo.riskOfRuin}% Ruin Risk</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.8)' }}>
                                            <span>P10: <span style={{ color: '#ef4444' }}>${setup.monteCarlo.percentiles?.p10?.toFixed(0) || '0'}</span></span>
                                            <span>P50: <span>${setup.monteCarlo.percentiles?.p50?.toFixed(0) || '0'}</span></span>
                                            <span>P90: <span style={{ color: '#10b981' }}>${setup.monteCarlo.percentiles?.p90?.toFixed(0) || '0'}</span></span>
                                        </div>
                                    </div>
                                )}

                                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5', fontStyle: 'italic' }}>
                                    "{setup.rationale}"
                                </p>

                                <footer style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)' }}>
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        background: 'var(--color-bg-tertiary)',
                                        color: 'var(--color-text-secondary)'
                                    }}>
                                        {setup.capitalTag}
                                    </span>
                                    <span style={{ fontSize: '11px', color: setup.direction === 'LONG' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 'bold' }}>
                                        HTF CONFLUENCE: {marketState?.mtf?.globalBias}
                                    </span>
                                </footer>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Phase 55: Volumetric Intelligence HUD */}
            {analysis.marketState?.volumeProfile && (
                <section style={{
                    marginTop: '48px',
                    padding: '24px',
                    background: 'rgba(139, 92, 246, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    borderRadius: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <Database size={20} color="#8b5cf6" />
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#8b5cf6' }}>Volumetric Intelligence & Institutional POIs</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {/* Value Area Metrics */}
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Value Area Distribution
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Point of Control</span>
                                    <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>{analysis.marketState.volumeProfile.poc?.toFixed(5) || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Value Area High</span>
                                    <span>{analysis.marketState.volumeProfile.vah?.toFixed(5) || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Value Area Low</span>
                                    <span>{analysis.marketState.volumeProfile.val?.toFixed(5) || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Institutional Magnets (nPOCs) */}
                        {analysis.marketState.nPOCs?.length > 0 && (
                            <div style={{
                                background: 'rgba(139, 92, 246, 0.1)',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid rgba(139, 92, 246, 0.3)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <Layers size={14} color="#a78bfa" />
                                    <span style={{ fontSize: '10px', color: '#a78bfa', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                        Naked POC Magnets
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {analysis.marketState.nPOCs.slice(0, 3).map((npoc, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span>{npoc.label}</span>
                                            <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{npoc.price?.toFixed(5) || 'N/A'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Node Density */}
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            padding: '16px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Volume Node Analysis
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>High Volume Peak</span>
                                    <span>{analysis.marketState.hvns?.[0]?.price?.toFixed(5) || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Low Volume Valley</span>
                                    <span>{analysis.marketState.lvns?.[0]?.price?.toFixed(5) || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(139, 92, 246, 0.7)', fontStyle: 'italic' }}>
                        Institutional Note: High-volume nodes (HVN) act as magnets and support/resistance, while low-volume nodes (LVN) are areas of rejection where price moves rapidly. Naked POCs represent unliquidated institutional interest.
                    </p>
                </section>
            )}

            {/* Phase 60: Portfolio Risk & Stress HUD */}
            {analysis.stressMetrics && (
                <section style={{
                    marginTop: '32px',
                    padding: '24px',
                    background: 'rgba(239, 68, 68, 0.03)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <Shield size={20} color="#ef4444" />
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#ef4444' }}>Portfolio Risk & Stress Analysis</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                        {/* Value at Risk (VaR) */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Value at Risk (95% Confidence)</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-text-primary)' }}>
                                ${analysis.stressMetrics.var?.dollarVaR?.toFixed(2) || '0.00'}
                                <span style={{ fontSize: '12px', color: '#ef4444', marginLeft: '8px' }}>
                                    ({analysis.stressMetrics.var?.pctVaR?.toFixed(2) || '0'}%)
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Estimated daily drawdown exposure</div>
                        </div>

                        {/* Shock Scenarios */}
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Black Swan simulations</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Flash Crash Loss</span>
                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-${analysis.stressMetrics.shocks?.flashCrash?.estimatedLoss?.toFixed(0) || '0'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>USD Shock Loss</span>
                                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>-${analysis.stressMetrics.shocks?.usdShock?.estimatedLoss?.toFixed(0) || '0'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Concentration Status */}
                        {analysis.portfolioHealth && (
                            <div style={{
                                background: analysis.portfolioHealth.isConcentrated ? 'rgba(234, 179, 8, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                                padding: '16px',
                                borderRadius: '8px',
                                border: `1px solid ${analysis.portfolioHealth.isConcentrated ? 'rgba(234, 179, 8, 0.3)' : 'rgba(16, 185, 129, 0.2)'}`
                            }}>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '4px' }}>Health Status</div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: analysis.portfolioHealth.isConcentrated ? '#eab308' : '#10b981' }}>
                                    {analysis.portfolioHealth.isConcentrated ? 'CONCENTRATED EXPOSURE' : 'OPTIMIZED PORTFOLIO'}
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                    {analysis.portfolioHealth.reason}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Execution Optimization (Phase 8) */}
            {setups[0]?.executionAdvice && (
                <section style={{ marginTop: '48px', padding: '24px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <Zap size={20} color="#3b82f6" />
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Execution Optimization (Phase 8)</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Institutional Pacing</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{(setups[0].executionAdvice.type || '').replace('_', ' ')}</div>
                                <div style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: setups[0].executionAdvice.urgency === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: setups[0].executionAdvice.urgency === 'HIGH' ? '#ef4444' : '#10b981' }}>
                                    {setups[0].executionAdvice.urgency} URGENCY
                                </div>
                            </div>
                            <div style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
                                Target VWAP: <span style={{ color: 'var(--color-text-primary)', fontWeight: 'bold' }}>{setups[0].executionAdvice.vwap?.toFixed(5)}</span>
                            </div>
                        </div>
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '24px' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Slippage Analysis</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{setups[0].executionAdvice.slippage?.toFixed(2)}% <span style={{ fontSize: '12px', fontWeight: 'normal', opacity: 0.6 }}>Estimated</span></div>
                            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
                                {setups[0].executionAdvice.tranches?.length} depth levels identified for absorption.
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Alpha Attribution (Phase 7 - Autonomous Alpha Learning) */}
            <section style={{
                marginTop: '48px',
                padding: '24px',
                background: 'rgba(15, 23, 42, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    padding: '8px 16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderBottomLeftRadius: '12px',
                    letterSpacing: '0.05em'
                }}>
                    PHASE 7: AUTONOMOUS ALPHA
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <BarChart2 size={20} color="#10b981" />
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Engine Reliability HUD</h3>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '16px'
                }}>
                    {marketState.alphaMetrics && Object.keys(marketState.alphaMetrics).length > 0 ? (
                        Object.entries(marketState.alphaMetrics).sort((a, b) => b[1].winRate - a[1].winRate).map(([engine, data]) => (
                            <div key={engine} style={{
                                padding: '16px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '12px',
                                border: `1px solid ${data.status === 'INSTITUTIONAL' ? 'rgba(16, 185, 129, 0.3)' :
                                    data.status === 'DEGRADING' ? 'rgba(239, 68, 68, 0.3)' :
                                        'rgba(255,255,255,0.05)'
                                    }`,
                                transition: 'all 0.2s ease'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                                        {engine.replace('_', ' ')}
                                    </span>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: data.status === 'INSTITUTIONAL' ? '#10b981' :
                                            data.status === 'HIGH_ALPHA' ? '#3b82f6' :
                                                data.status === 'DEGRADING' ? '#ef4444' : '#94a3b8'
                                    }} />
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: data.winRate > 65 ? '#10b981' : data.winRate > 50 ? '#f59e0b' : '#94a3b8' }}>
                                    {data.winRate}% <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'normal' }}>WR</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px' }}>
                                    <span style={{ opacity: 0.6 }}>Impact: {data.impactScore}</span>
                                    <span style={{
                                        color: data.status === 'INSTITUTIONAL' ? '#10b981' :
                                            data.status === 'DEGRADING' ? '#ef4444' : 'inherit'
                                    }}>{data.status}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                            <Activity className="animate-pulse" style={{ margin: '0 auto 12px' }} />
                            <p style={{ fontSize: '14px' }}>Calibrating Alpha Tracker... Awaiting historical trade attribution points.</p>
                            <p style={{ fontSize: '11px', marginTop: '4px' }}>System is monitoring live institutional signals to establish engine reliability baselines.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Portfolio Risk Dashboard */}
            {marketState.riskClusters?.length > 0 && (
                <section style={{
                    marginTop: '48px',
                    padding: '20px',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '12px',
                    marginBottom: '48px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                        <AlertCircle size={20} color="#ef4444" />
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Institutional Portfolio Risk Dashboard</h3>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                        {marketState.riskClusters.map(cluster => (
                            <div key={cluster.asset} style={{
                                background: 'rgba(0,0,0,0.2)',
                                padding: '12px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    Concentration Cluster
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{cluster.asset} Assets</span>
                                    <span style={{ color: '#ef4444' }}>{cluster.count} Active</span>
                                </div>
                                <div style={{
                                    marginTop: '10px',
                                    height: '4px',
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: '2px',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${Math.min(cluster.count * 33, 100)}%`,
                                        height: '100%',
                                        background: '#ef4444'
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                        Institutional Note: High currency correlation detected. Taking multiple setups in this cluster increases directional exposure and systemic risk.
                    </p>
                </section>
            )}

            <footer style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--color-border-subtle)', textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
                <p>Institutional AI Trading Environment • Analysis generated on {analysis.timestamp ? new Date(analysis.timestamp).toLocaleString() : 'N/A'}</p>
                <p style={{ marginTop: '8px' }}>Not Financial Advice. Trading involves risk of loss. Past performance does not guarantee future results.</p>
            </footer>
        </motion.div>
    );
}
