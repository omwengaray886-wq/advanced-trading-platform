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
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                    </div>
                ))}
            </div>
        </div>
    );
}
