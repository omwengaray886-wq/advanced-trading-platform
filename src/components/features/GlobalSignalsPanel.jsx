import React from 'react';
import { Star, TrendingUp, TrendingDown, Target, Shield, Clock } from 'lucide-react';

export default function GlobalSignalsPanel({ signals, onSelectSignal }) {
    if (!signals || signals.length === 0) {
        return (
            <div style={{
                padding: '20px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)'
            }}>
                <Shield size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>No institutional signals</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Scanning global markets...</p>
            </div>
        );
    }

    const getTimeAgo = (timestamp) => {
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                padding: '12px 16px',
                background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.1), transparent)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={16} style={{ color: '#3b82f6' }} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'white' }}>
                        GLOBAL SIGNALS
                    </span>
                    <span style={{
                        fontSize: '10px',
                        background: '#3b82f6',
                        color: 'white',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        fontWeight: 'bold'
                    }}>
                        {signals.length}
                    </span>
                </div>
            </div>

            <div style={{
                overflowY: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1
            }}>
                {signals.map((signal) => (
                    <div
                        key={signal.id}
                        onClick={() => onSelectSignal && onSelectSignal(signal)}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            padding: '12px',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.2s',
                            ':hover': {
                                background: 'rgba(255,255,255,0.05)',
                                borderColor: 'rgba(255,255,255,0.2)'
                            }
                        }}
                    >
                        {/* Institutional Badge */}
                        {signal.confluenceScore >= 80 && (
                            <div style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                fontSize: '8px',
                                fontWeight: 'bold',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px'
                            }}>
                                <Shield size={8} fill="currentColor" /> INSTITUTIONAL
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>
                                    {signal.symbol.replace('USDT', '')}
                                </span>
                                <div style={{
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: signal.direction === 'LONG' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${signal.direction === 'LONG' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    color: signal.direction === 'LONG' ? '#10b981' : '#f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    {signal.direction === 'LONG' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    {signal.direction}
                                </div>
                            </div>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                                {getTimeAgo(signal.publishedAt)}
                            </span>
                        </div>

                        {/* Professional News Directional Advice (Phase 5) */}
                        {signal.fundamentals?.impact?.newsAdvice && (
                            <div style={{
                                marginBottom: '10px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: signal.fundamentals.impact.newsAdvice === 'BUY' ? 'rgba(16, 185, 129, 0.1)' :
                                    signal.fundamentals.impact.newsAdvice === 'SELL' ? 'rgba(239, 68, 68, 0.1)' :
                                        'rgba(255,255,255,0.05)',
                                borderLeft: `3px solid ${signal.fundamentals.impact.newsAdvice === 'BUY' ? '#10b981' :
                                    signal.fundamentals.impact.newsAdvice === 'SELL' ? '#ef4444' :
                                        'rgba(255,255,255,0.2)'
                                    }`,
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: signal.fundamentals.impact.newsAdvice === 'BUY' ? '#10b981' :
                                    signal.fundamentals.impact.newsAdvice === 'SELL' ? '#ef4444' :
                                        'rgba(255,255,255,0.6)'
                            }}>
                                {signal.fundamentals.impact.newsAdvice === 'BUY' ? '🚀' :
                                    signal.fundamentals.impact.newsAdvice === 'SELL' ? '⚠️' : 'ℹ️'} ADVICE: {signal.fundamentals.impact.newsAdvice} {signal.fundamentals.impact.newsAdvice !== 'NORMAL' ? '(NEWS SUPPORTED)' : '(TECH ONLY)'}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#facc15' }}>
                                {signal.confluenceScore}%
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>Target</div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>
                                    {signal.targets?.[0] || '---'}
                                </div>
                            </div>
                        </div>

                        {/* Professional News Intel (Tiered) */}
                        {signal.fundamentals?.proximityAnalysis?.event && (
                            <div style={{
                                marginTop: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                flexWrap: 'wrap'
                            }}>
                                <span style={{
                                    fontSize: '8px',
                                    fontWeight: 'bold',
                                    background: signal.fundamentals.proximityAnalysis.event.tier === 'TIER 1' ? '#ef4444' : '#3b82f6',
                                    color: 'white',
                                    padding: '1px 5px',
                                    borderRadius: '3px'
                                }}>
                                    {signal.fundamentals.proximityAnalysis.event.tier}
                                </span>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>
                                    {signal.fundamentals.proximityAnalysis.event.type?.split(' ')[0]}
                                </span>
                                {signal.fundamentals.proximityAnalysis.event.actual && (
                                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', marginLeft: 'auto' }}>
                                        {signal.fundamentals.proximityAnalysis.event.actual} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>({signal.fundamentals.proximityAnalysis.event.forecast || 'N/A'})</span>
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Tactical News Sweep Status (Phase 5) */}
                        {signal.tacticalSetup && (
                            <div style={{
                                marginTop: '4px',
                                padding: '6px',
                                borderRadius: '4px',
                                background: 'rgba(250, 204, 21, 0.1)',
                                border: '1px solid rgba(250, 204, 21, 0.3)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        fontSize: '8px',
                                        fontWeight: 'bold',
                                        background: '#facc15',
                                        color: '#000',
                                        padding: '1px 4px',
                                        borderRadius: '2px'
                                    }}>
                                        TACTICAL SWEEP
                                    </span>
                                    <span style={{ fontSize: '9px', color: '#facc15', fontWeight: 'bold' }}>
                                        {signal.tacticalSetup.status === 'SWEEP_CONFIRMED' ? 'REJECTION DETECTED' : 'PENDING GRAB'}
                                    </span>
                                </div>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>
                                    {signal.tacticalSetup.message}
                                </span>
                            </div>
                        )}

                        {/* Validated Timeframes */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {signal.confirmedTimeframes?.map(tf => (
                                <span key={tf} style={{
                                    fontSize: '9px',
                                    padding: '2px 5px',
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '3px',
                                    color: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {tf}
                                </span>
                            ))}
                        </div>

                        {/* SIGNAL MANAGEMENT UPGRADES (Phase 13) */}
                        {signal.status === 'ACTIVE' && (
                            <div style={{
                                marginTop: '10px',
                                padding: '8px',
                                background: 'rgba(16, 185, 129, 0.05)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: '6px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold' }}>LIVE MANAGEMENT</span>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: '#10b981',
                                        boxShadow: '0 0 8px #10b981',
                                        animation: 'pulse 2s infinite'
                                    }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>PnL:</span>
                                    <span style={{ color: signal.pnl >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                                        {signal.pnl >= 0 ? '+' : ''}{signal.pnl?.toFixed(2)}
                                    </span>
                                </div>
                                {signal.updates && signal.updates.length > 0 && (
                                    <div style={{ marginTop: '4px', fontSize: '9px', color: '#9ca3af', fontStyle: 'italic' }}>
                                        <Clock size={8} style={{ display: 'inline', marginRight: '4px' }} />
                                        {signal.updates[signal.updates.length - 1].msg}
                                    </div>
                                )}
                            </div>
                        )}

                        {signal.trailingStop && (
                            <div style={{
                                marginTop: '8px',
                                padding: '4px 8px',
                                background: 'rgba(59, 130, 246, 0.1)',
                                borderLeft: '2px solid #3b82f6',
                                borderRadius: '4px',
                                fontSize: '10px'
                            }}>
                                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Active Trail: </span>
                                <span style={{ color: 'white' }}>{signal.trailingStop.toFixed(4)}</span>
                            </div>
                        )}

                        {/* Position Sizing Intelligence (Phase 68) */}
                        {signal.riskPercentage && (
                            <div style={{
                                marginTop: '6px',
                                padding: '4px 8px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderLeft: '2px solid #10b981',
                                borderRadius: '4px',
                                fontSize: '10px'
                            }}>
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>Risk: </span>
                                <span style={{ color: 'white' }}>{signal.riskPercentage}%</span>
                            </div>
                        )}

                        {signal.sizingWarning && (
                            <div style={{ marginTop: '4px', fontSize: '9px', color: '#f59e0b', fontStyle: 'italic' }}>
                                ⚠️ {signal.sizingWarning}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
