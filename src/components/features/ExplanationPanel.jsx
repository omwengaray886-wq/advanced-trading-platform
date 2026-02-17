import React from 'react';
import { Activity, Layers, AlertCircle, TrendingUp, Target, Shield, Zap, Sparkles, Clock } from 'lucide-react';
import { ScenarioEngine } from '../../services/scenarioEngine';

/**
 * ExplanationPanel - Displays structured AI analysis explanations
 */
export default function ExplanationPanel({ analysis, loading, realtimeDiag, onGenerateNew }) {
    const scrollRef = React.useRef(null);

    // Auto-scroll to bottom when analysis changes
    React.useEffect(() => {
        if (analysis && scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [analysis]);

    if (!analysis) {
        return (
            <div className="card" style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <Activity size={48} color="var(--color-text-tertiary)" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Click "Generate Analysis" to see AI insights
                    </p>
                </div>
            </div>
        );
    }

    const { explanation, selectedStrategy, marketState, riskParameters, confidence, fundamentals } = analysis;

    const fundamentalBias = fundamentals?.impact?.direction || 'NEUTRAL';

    return (
        <div className="card" style={{ width: '360px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>

            {/* Strategy Badge */}
            <div style={{
                background: 'linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-secondary) 100%)',
                padding: '12px',
                borderRadius: '8px',
                color: 'white'
            }}>
                <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '4px' }}>SELECTED STRATEGY</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedStrategy.name}</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                    {Math.round((selectedStrategy.suitability || 0) * 100)}% Market Fit
                </div>
                {/* Phase 52: Bayesian Reliability Display */}
                {analysis.prediction?.strategy === selectedStrategy.name && (
                    <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.2)',
                        fontSize: '10px',
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
                        <span>Bayesian Reliability:</span>
                        <span style={{ fontWeight: 'bold', color: '#fff' }}>
                            {analysis.prediction.confidenceBreakdown?.positives?.find(p => p.includes('Reliability'))?.match(/\d+%/)?.[0] || 'N/A'}
                        </span>
                    </div>
                )}
            </div>

            {/* Executive AI Narrative [Phase 68] */}
            {explanation.sections.executiveNarrative && (
                <div style={{
                    padding: '14px',
                    background: 'var(--color-bg-tertiary)',
                    borderRadius: '8px',
                    borderLeft: '4px solid var(--color-accent-primary)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        opacity: 0.1
                    }}>
                        <Layers size={24} />
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-accent-primary)', marginBottom: '8px', letterSpacing: '0.05em' }}>
                        INSTITUTIONAL TRUTH SUMMARY
                    </div>
                    <p style={{
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: 'var(--color-text-primary)',
                        margin: 0,
                        fontStyle: 'italic',
                        fontWeight: '500'
                    }}>
                        {explanation.sections.executiveNarrative}
                    </p>
                </div>
            )}

            {/* Market Overview */}
            <div>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Activity size={16} color="var(--color-accent-primary)" />
                    Market Overview
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ background: 'var(--color-bg-tertiary)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>TREND</div>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: marketState.trend.direction === 'BULLISH' ? 'var(--color-success)' :
                                marketState.trend.direction === 'BEARISH' ? 'var(--color-danger)' :
                                    'var(--color-text-primary)'
                        }}>
                            {marketState.trend.direction}
                        </div>
                    </div>
                    <div style={{ background: 'var(--color-bg-tertiary)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>REGIME</div>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>{marketState.regime}</div>
                    </div>
                    <div style={{ background: 'var(--color-bg-tertiary)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>VOLATILITY</div>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>
                            {typeof marketState.volatility === 'string'
                                ? marketState.volatility
                                : marketState.volatility?.volatilityState?.level || 'MODERATE'}
                        </div>
                    </div>
                    <div style={{ background: 'var(--color-bg-tertiary)', padding: '10px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>STRENGTH</div>
                        <div style={{ fontSize: '13px', fontWeight: '600' }}>
                            {Math.round((marketState.trend.strength || 0) * 100)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Institutional Elite Accuracy [Phase 6] */}
            {(marketState.gsrMatch || marketState.liquidityVoids || marketState.mtfEquilibrium) && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.1)'
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#a78bfa', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} /> INSTITUTIONAL ELITE ACCURACY
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* GSR DNA Match */}
                        {marketState.gsrMatch && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Genetic DNA Match</span>
                                    <span style={{
                                        fontWeight: 'bold',
                                        color: marketState.gsrMatch.rating === 'ELITE_MATCH' ? 'var(--color-success)' : '#a78bfa'
                                    }}>
                                        {marketState.gsrMatch.rating} ({(marketState.gsrMatch.closeness * 100).toFixed(0)}%)
                                    </span>
                                </div>
                                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${(marketState.gsrMatch.closeness * 100)}%`,
                                        height: '100%',
                                        background: '#a78bfa',
                                        boxShadow: '0 0 8px #a78bfa'
                                    }} />
                                </div>
                            </div>
                        )}

                        {/* Liquidity Voids (Price Vacuums) */}
                        {marketState.liquidityVoids && marketState.liquidityVoids.length > 0 && (
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>LIQUIDITY VOIDS DETECTED</span>
                                    <span style={{ color: '#f87171' }}>PRICE VACUUM ACTIVE</span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--color-text-primary)' }}>
                                    {marketState.liquidityVoids.length} zones of institutional imbalance detected.
                                    Strong magnet effect toward <b>{marketState.liquidityVoids[0].low.toFixed(2)}</b>.
                                </div>
                            </div>
                        )}

                        {/* MTF Equilibrium */}
                        {marketState.mtfEquilibrium && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Market Equilibrium</span>
                                <span style={{
                                    fontWeight: 'bold',
                                    color: marketState.mtfEquilibrium.state === 'DISCOUNT' ? 'var(--color-success)' :
                                        marketState.mtfEquilibrium.state === 'PREMIUM' ? 'var(--color-danger)' : 'var(--color-accent-primary)'
                                }}>
                                    {marketState.mtfEquilibrium.state} ZONE
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Institutional Cycle Management [Phase 7] */}
            {(marketState.amdCycle || marketState.wyckoffPhase) && (
                <div style={{
                    background: 'var(--color-bg-secondary)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border-primary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-accent-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} /> INSTITUTIONAL CYCLE MANAGEMENT
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {/* AMD Cycle Status */}
                        {marketState.amdCycle && marketState.amdCycle.phase !== 'UNKNOWN' && (
                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>AMD PHASE</div>
                                <div style={{
                                    fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', color:
                                        marketState.amdCycle.phase === 'DISTRIBUTION' ? 'var(--color-success)' :
                                            (marketState.amdCycle.phase === 'MANIPULATION' ? '#f87171' : 'var(--color-accent-primary)')
                                }}>
                                    {marketState.amdCycle.phase}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                    {marketState.amdCycle.behavior}
                                </div>
                            </div>
                        )}

                        {/* Wyckoff Phase Status */}
                        {marketState.wyckoffPhase && marketState.wyckoffPhase.phase !== 'UNKNOWN' && (
                            <div style={{ background: 'var(--color-bg-tertiary)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>WYCKOFF PHASE</div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#8b5cf6' }}>
                                    {marketState.wyckoffPhase.phase}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '4px', fontWeight: '500' }}>
                                    {marketState.wyckoffPhase.type}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Cycle Alerts and Timing windows */}
                    {(marketState.amdCycle?.phase === 'MANIPULATION' || marketState.wyckoffPhase?.type === 'SPRING' || marketState.wyckoffPhase?.type === 'UPTHRUST') && (
                        <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            background: marketState.amdCycle?.phase === 'MANIPULATION' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '6px',
                            borderLeft: `3px solid ${marketState.amdCycle?.phase === 'MANIPULATION' ? '#ef4444' : 'var(--color-success)'}`,
                            fontSize: '11px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: marketState.amdCycle?.phase === 'MANIPULATION' ? '#ef4444' : 'var(--color-success)',
                                fontWeight: 'bold',
                                marginBottom: '4px'
                            }}>
                                <AlertCircle size={14} /> {marketState.amdCycle?.phase === 'MANIPULATION' ? 'JUDAS TRAP WARNING' : 'INSTITUTIONAL ENTRY WINDOW'}
                            </div>
                            <div style={{ color: 'var(--color-text-primary)', lineHeight: '1.4' }}>
                                {marketState.amdCycle?.phase === 'MANIPULATION'
                                    ? `Judas Swing detected near ${marketState.session?.killzone}. Price currently faking HTF direction to build liquidity.`
                                    : `Wyckoff ${marketState.wyckoffPhase.type} identified. Smart money test completed. High probability for Phase ${marketState.wyckoffPhase.phase === 'PHASE_C' ? 'D Expansion' : 'E Markup'}.`
                                }
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MTF Alignment Overview [NEW] */}
            {marketState.mtf && (
                <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Layers size={14} color="var(--color-accent-secondary)" />
                        MTF Synchronization
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Global Bias (4H/1D)</span>
                            <span style={{
                                fontWeight: 'bold',
                                color: marketState.mtf.globalBias === 'BULLISH' ? 'var(--color-success)' :
                                    marketState.mtf.globalBias === 'BEARISH' ? 'var(--color-danger)' : 'var(--color-text-primary)'
                            }}>
                                {marketState.mtf.globalBias}
                            </span>
                        </div>
                        {marketState.mtfAlignments && marketState.mtfAlignments.length > 0 && (
                            <div style={{
                                marginTop: '4px',
                                padding: '8px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '4px',
                                border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-accent-primary)', marginBottom: '4px' }}>
                                    INSTITUTIONAL ALIGNMENT
                                </div>
                                <p style={{ fontSize: '10px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.4' }}>
                                    Nested within **{marketState.mtfAlignments[0].tf} {marketState.mtfAlignments[0].htfZone.type.replace('_ZONE', '').replace('_', ' ')}**.
                                    High-probability institutional refinement detected.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SMT Divergence Analysis (Phase 25) */}
            {marketState.divergences && marketState.divergences.length > 0 && (
                <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Activity size={14} color="#E63946" />
                        Inter-Market SMT
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Signal</span>
                            <span style={{
                                fontWeight: 'bold',
                                color: marketState.divergences[0].metadata.direction === 'BULLISH' ? 'var(--color-success)' : 'var(--color-danger)'
                            }}>
                                {marketState.divergences[0].metadata.direction} DIVERGENCE
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Diverged With</span>
                            <span style={{ fontWeight: '500' }}>{marketState.divergences[0].metadata.sibling}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Basket Confluence</span>
                            <span style={{ fontWeight: '500', color: 'var(--color-accent-primary)' }}>{marketState.smtConfluence}%</span>
                        </div>
                        <p style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                            {marketState.divergences[0].metadata.direction === 'BULLISH'
                                ? 'Asset failed to make Lower Low while correlated asset did. Institutional accumulation detected.'
                                : 'Asset failed to make Higher High while correlated asset did. Institutional distribution detected.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Volume Profile Context [NEW] */}
            {marketState.volProfile && (
                <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Zap size={14} color="#FFD700" />
                        Volume Context (Institutional Hubs)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Point of Control (POC)</span>
                            <span style={{ fontWeight: 'bold' }}>{marketState.volProfile?.poc?.toFixed(2) || '---'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: 'var(--color-text-tertiary)' }}>Value Area Low</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{marketState.volProfile?.val?.toFixed(2) || '---'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                            <span style={{ color: 'var(--color-text-tertiary)' }}>Value Area High</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>{marketState.volProfile?.vah?.toFixed(2) || '---'}</span>
                        </div>

                        {/* Position relative to value */}
                        <div style={{
                            marginTop: '4px',
                            padding: '8px',
                            background: marketState.currentPrice > marketState.volProfile.vah ? 'rgba(239, 68, 68, 0.1)' :
                                marketState.currentPrice < marketState.volProfile.val ? 'rgba(34, 197, 94, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            fontSize: '10px'
                        }}>
                            {marketState.currentPrice > marketState.volProfile.vah ? (
                                <span>⚠️ Price in <b>Premium</b> (Above Value). Watch for mean reversion to POC.</span>
                            ) : marketState.currentPrice < marketState.volProfile.val ? (
                                <span>✅ Price in <b>Discount</b> (Below Value). Institutional accumulation zone.</span>
                            ) : (
                                <span>⚖️ Price in <b>Fair Value</b>. Balanced market conditions.</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tape Reading / Order Flow Context [NEW] */}
            {marketState.heatmap && (
                <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Zap size={14} color="#00FFFF" />
                        Tape Reading (Institutional Flow)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {marketState.heatmap.walls.map((wall, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>{wall.type.replace('_', ' ')}</span>
                                <span style={{
                                    fontWeight: 'bold',
                                    color: wall.type === 'BUY_WALL' ? 'var(--color-success)' : 'var(--color-danger)'
                                }}>
                                    {wall.price?.toFixed(5) || 'N/A'} ({(wall.intensity * 100)?.toFixed(0) || '0'}% Stacked)
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Macro & Portfolio Intelligence [NEW - Phase 70] */}
            {(explanation.sections.macroContext || explanation.sections.portfolioImpact || explanation.sections.bayesianNarrative) && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(55, 65, 81, 0.4) 0%, rgba(17, 24, 39, 0.6) 100%)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-accent-secondary)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--color-accent-secondary)' }} />
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <Shield size={14} color="var(--color-accent-secondary)" />
                        Institutional Intelligence Hub
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {explanation.sections.macroContext && (
                            <div>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Macro Context</div>
                                <p style={{ fontSize: '11px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.4' }}>
                                    {explanation.sections.macroContext}
                                </p>
                            </div>
                        )}

                        {explanation.sections.bayesianNarrative && (
                            <div>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Strategy Reliability</div>
                                <p style={{ fontSize: '11px', color: 'var(--color-text-primary)', margin: 0, lineHeight: '1.4' }}>
                                    {explanation.sections.bayesianNarrative}
                                </p>
                            </div>
                        )}

                        {explanation.sections.portfolioImpact && (
                            <div style={{
                                marginTop: '4px',
                                padding: '8px',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '4px'
                            }}>
                                <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--color-warning)', marginBottom: '4px', textTransform: 'uppercase' }}>Portfolio Stress Impact</div>
                                <p style={{ fontSize: '11px', color: 'white', margin: 0, lineHeight: '1.4', fontStyle: 'italic' }}>
                                    {explanation.sections.portfolioImpact}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Predictive Intelligence Layer [UPGRADED - Phase 51] */}
            {(() => {
                const displayPrediction = (analysis.prediction?.bias === 'NO_EDGE' && realtimeDiag)
                    ? { ...analysis.prediction, ...realtimeDiag }
                    : (analysis.prediction || (realtimeDiag?.show ? realtimeDiag : null));

                if (!displayPrediction) return null;

                return (
                    <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-accent-primary)', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={14} color="var(--color-accent-primary)" />
                                Trust-Grade Intelligence v2
                            </h3>
                            <span style={{ fontSize: '9px', opacity: 0.6, fontFamily: 'monospace' }}>ID: {displayPrediction.id || 'REALTIME'}</span>
                        </div>

                        {/* Edge Score Badge */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            marginBottom: '10px'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                border: `2px solid ${displayPrediction.edgeScore >= 7 ? 'var(--color-success)' : 'var(--color-accent-primary)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '14px'
                            }}>
                                {displayPrediction.edgeScore || (displayPrediction.bias === 'NO_EDGE' ? 0 : 5)}
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em' }}>{displayPrediction.edgeLabel || (displayPrediction.bias === 'NO_EDGE' ? 'NO EDGE' : 'ALGO SCAN')}</div>
                                <div style={{ fontSize: '9px', opacity: 0.6 }}>Normalized Edge Quality</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Reason for NO_EDGE */}
                            {displayPrediction.bias === 'NO_EDGE' && (
                                <div style={{
                                    padding: '8px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    color: '#ef4444'
                                }}>
                                    <strong>DIAGNOSTIC:</strong> {displayPrediction.reason}
                                </div>
                            )}

                            {/* Horizons */}
                            {displayPrediction.horizons && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', marginBottom: '4px' }}>
                                    {Object.entries(analysis.prediction.horizons).map(([k, v]) => (
                                        <div key={k} style={{ background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '4px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '7px', opacity: 0.5, textTransform: 'uppercase' }}>{k}</div>
                                            <div style={{ fontSize: '8px', fontWeight: 'bold' }}>{v}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Continuation vs Reversal */}
                            {analysis.probabilities && (
                                <div style={{ position: 'relative', height: '12px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                                    <div style={{
                                        width: `${analysis.probabilities.continuation}%`,
                                        height: '100%',
                                        background: 'var(--color-success)',
                                        transition: 'width 1s ease-out'
                                    }} />
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: '8px', fontWeight: 'bold', alignItems: 'center', color: 'white' }}>
                                        <span>CONTINUE {analysis.probabilities.continuation}%</span>
                                        <span>REVERSE {analysis.probabilities.reversal}%</span>
                                    </div>
                                </div>
                            )}

                            {/* Risk Breakdown */}
                            {analysis.prediction.confidenceBreakdown && (
                                <div style={{ fontSize: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {analysis.prediction.confidenceBreakdown.positives.slice(0, 1).map((p, i) => (
                                        <div key={i} style={{ color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Shield size={10} /> {p}
                                        </div>
                                    ))}
                                    {analysis.prediction.confidenceBreakdown.risks.slice(0, 1).map((r, i) => (
                                        <div key={i} style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <AlertCircle size={10} /> {r}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Regime Transition */}
                            {analysis.regimeTransition && (
                                <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Regime Stability</span>
                                    <span style={{ fontWeight: 'bold', color: analysis.regimeTransition.probability < 30 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                        {((100 - (analysis.regimeTransition.probability || 0)))?.toFixed(0) || '0'}% Stable
                                    </span>
                                </div>
                            )}

                            {/* Liquidity Run */}
                            {analysis.probabilities.liquidityRun && analysis.probabilities.liquidityRun.probability > 30 && (
                                <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--color-text-secondary)' }}>Liquidity Draw</span>
                                    <span style={{ fontWeight: 'bold', color: '#a78bfa' }}>
                                        {analysis.probabilities.liquidityRun.label} ({analysis.probabilities.liquidityRun.probability}%)
                                    </span>
                                </div>
                            )}

                            {/* Trap Hazard Warning */}
                            {analysis.trapZones && analysis.trapZones.warning && (
                                <div style={{
                                    marginTop: '4px',
                                    padding: '8px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    fontSize: '10px',
                                    color: '#f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <AlertCircle size={12} />
                                    <span><b>TRAP HAZARD:</b> {analysis.trapZones.warning}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Fundamental Analysis */}
            {fundamentals && fundamentals.events && fundamentals.events.length > 0 && (
                <div style={{
                    background: fundamentalBias === 'BULLISH' ? 'rgba(16, 185, 129, 0.1)' :
                        fundamentalBias === 'BEARISH' ? 'rgba(239, 68, 68, 0.1)' :
                            'rgba(156, 163, 175, 0.1)',
                    border: `1px solid ${fundamentalBias === 'BULLISH' ? 'rgba(16, 185, 129, 0.3)' :
                        fundamentalBias === 'BEARISH' ? 'rgba(239, 68, 68, 0.3)' :
                            'rgba(156, 163, 175, 0.3)'}`,
                    borderRadius: '6px',
                    padding: '12px'
                }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        📰 Fundamental Context
                    </h4>
                    <p style={{ fontSize: '11px', lineHeight: '1.5', margin: 0, marginBottom: '8px' }}>
                        {fundamentals.summary}
                    </p>
                    {!analysis.fundamentalAlignment && (
                        <div style={{
                            fontSize: '10px',
                            padding: '4px 8px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '4px',
                            color: 'var(--color-danger)',
                            fontWeight: '600'
                        }}>
                            ⚠️ TECHNICAL-FUNDAMENTAL DIVERGENCE
                        </div>
                    )}
                </div>
            )}

            {/* 7-Step Professional Zone Mapping Flow (Phase 20) */}
            {explanation && (
                <>
                    {/* 1. Market Context */}
                    <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: '6px', padding: '12px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <TrendingUp size={14} /> 1. Market Context
                        </h4>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0, color: 'var(--color-text-secondary)' }}>
                            {explanation.sections.htfBias}
                        </p>
                    </div>

                    {/* 2. Institutional Intent */}
                    <div style={{ background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '6px', padding: '12px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#b8860b', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            ⚜️ 2. Institutional Intent
                        </h4>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                            {explanation.sections.strategicIntent}
                        </p>
                    </div>

                    {/* 3. Active Roadmap */}
                    <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: '6px', padding: '12px', border: '1px solid var(--color-accent-secondary)' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-accent-secondary)', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            🗺️ 3. Active Roadmap
                        </h4>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                            {explanation.sections.activeRoadmap}
                        </p>
                    </div>

                    {/* 4. Entry Confirmation Logic */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', padding: '12px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-success)', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Target size={14} /> 4. Entry Confirmation
                        </h4>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                            {explanation.sections.entryLogic}
                        </p>
                    </div>

                    {/* 5. Invalidation Level */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '12px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-danger)', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Shield size={14} /> 5. Invalidation
                        </h4>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                            {explanation.sections.invalidationConditions}
                        </p>
                    </div>

                    {/* 6. Target Objectives */}
                    <div style={{ background: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.2)', borderRadius: '6px', padding: '12px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-accent-primary)', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            🏁 6. Target Objectives
                        </h4>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0 }}>
                            {explanation.sections.targets}
                        </p>
                    </div>

                    {/* 7. Professional Truth */}
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px dashed var(--color-success)', borderRadius: '6px', padding: '12px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-success)', marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            🧠 7. Professional Truth
                        </h4>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0, fontStyle: 'italic' }}>
                            {explanation.sections.professionalTruth}
                        </p>
                    </div>

                    {/* 8. Risk & Sizing [NEW] */}
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '12px' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            ⚖️ 8. Risk & Sizing
                        </h4>
                        <p style={{ fontSize: '12px', lineHeight: '1.5', margin: 0, color: 'var(--color-text-secondary)' }}>
                            {explanation.sections.riskManagement}
                        </p>
                    </div>
                </>
            )}

            {/* Risk Parameters */}
            {riskParameters && (
                <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Layers size={16} color="var(--color-warning)" />
                        Risk Parameters
                    </h3>
                    <div style={{ fontSize: '12px' }}>
                        {riskParameters.entry && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--color-text-secondary)' }}>Entry Zone</span>
                                <span style={{ fontWeight: '500', fontFamily: 'monospace' }}>
                                    {riskParameters.entry.optimal?.toFixed(5) || 'N/A'}
                                </span>
                            </div>
                        )}
                        {riskParameters.stopLoss && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--color-danger)' }}>Stop Loss</span>
                                <span style={{ fontWeight: '500', fontFamily: 'monospace', color: 'var(--color-danger)' }}>
                                    {riskParameters.stopLoss?.toFixed(5) || 'N/A'}
                                </span>
                            </div>
                        )}
                        {riskParameters.targets && riskParameters.targets.map((target, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ color: 'var(--color-success)' }}>
                                    Target {target.level} {target.riskReward && `(${target.riskReward}R)`}
                                </span>
                                <span style={{ fontWeight: '500', fontFamily: 'monospace', color: 'var(--color-success)' }}>
                                    {target.price?.toFixed(5) || 'N/A'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Confidence & Actions */}
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Overall Confidence</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '60px',
                            height: '6px',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${confidence * 100}%`,
                                height: '100%',
                                background: confidence > 0.7 ? 'var(--color-success)' : confidence > 0.5 ? 'var(--color-warning)' : 'var(--color-danger)',
                                borderRadius: '3px'
                            }} />
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>
                            {Math.round((confidence || 0) * 100)}%
                        </span>
                    </div>
                </div>

                <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={onGenerateNew}
                    disabled={loading}
                >
                    {loading ? 'Analyzing...' : 'Generate New Analysis'}
                </button>

                <p style={{ fontSize: '10px', textAlign: 'center', color: 'var(--color-text-tertiary)', marginTop: '8px', marginBottom: 0 }}>
                    Analysis updates every 15 minutes
                </p>
                {/* Scroll Target */}
                <div ref={scrollRef} style={{ height: '1px' }} />
            </div>
        </div>
    );
}
