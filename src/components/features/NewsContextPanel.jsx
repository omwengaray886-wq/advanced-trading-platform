import React from 'react';
import { Clock, AlertTriangle, TrendingUp } from 'lucide-react';

/**
 * News & Context Panel for fullscreen chart
 */
export default function NewsContextPanel({ newsEvents, correlations, session }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Session Info */}
            <div style={{
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px'
            }}>
                <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: '12px'
                }}>
                    SESSION INFO
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px'
                }}>
                    <Clock size={14} color="#3b82f6" />
                    <span style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>
                        {session?.active || 'LONDON'}
                    </span>
                    <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(251, 191, 36, 0.2)',
                        color: '#fbbf24'
                    }}>
                        {session?.killzone ? 'KILLZONE' : 'ACTIVE'}
                    </span>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>
                    High volatility expected during this session
                </div>
            </div>

            {/* News Events */}
            <div style={{
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px'
            }}>
                <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    HIGH IMPACT NEWS
                </div>
                {newsEvents && newsEvents.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {newsEvents.slice(0, 3).map((event, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '6px',
                                padding: '8px',
                                borderLeft: `3px solid ${event.impact === 'HIGH' ? '#ef4444' : '#f59e0b'}`
                            }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                                    {event.event || 'Economic Event'}
                                </div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                                    {new Date(event.time * 1000).toLocaleTimeString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '12px 0' }}>
                        No high-impact events scheduled
                    </div>
                )}
            </div>

            {/* Correlation Matrix */}
            <div style={{
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px'
            }}>
                <div style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    color: 'rgba(255,255,255,0.7)',
                    marginBottom: '12px'
                }}>
                    CORRELATIONS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                        { asset: 'DXY', correlation: -0.85, change: -0.3 },
                        { asset: 'SPX', correlation: 0.72, change: 0.8 },
                        { asset: 'GOLD', correlation: 0.45, change: 0.2 }
                    ].map((item, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '8px',
                            borderRadius: '6px'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>
                                {item.asset}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{
                                    fontSize: '11px',
                                    color: Math.abs(item.correlation) > 0.7 ? '#fbbf24' : 'rgba(255,255,255,0.5)'
                                }}>
                                    {item.correlation > 0 ? '+' : ''}{item.correlation.toFixed(2)}
                                </span>
                                <span style={{
                                    fontSize: '10px',
                                    color: item.change > 0 ? '#10b981' : '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                }}>
                                    {item.change > 0 ? <TrendingUp size={10} /> : <TrendingUp size={10} style={{ transform: 'rotate(180deg)' }} />}
                                    {Math.abs(item.change).toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
