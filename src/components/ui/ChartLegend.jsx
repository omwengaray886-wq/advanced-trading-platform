import React, { useState } from 'react';
import { getSymbolMetadata } from '../../services/marketData';

/**
 * Chart Legend Component
 * Displays color codes and descriptions for all chart overlay elements
 */
export const ChartLegend = ({ position = 'bottom-left', symbol }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const meta = getSymbolMetadata(symbol);

    const legendItems = {
        'Prediction Arrows': [
            { color: '#10b981', symbol: '━', label: 'Confirmed (SOLID) - All criteria met', style: 'solid' },
            { color: '#f59e0b', symbol: '╌', label: 'Partial (DASHED) - Bayesian present', style: 'dashed' },
            { color: '#64748b', symbol: '┄', label: 'Waiting (DOTTED) - Low confidence', style: 'dotted' }
        ],
        'Zones & Blocks': [
            { color: '#0B8457', label: 'Bullish Order Block' },
            { color: '#8B0000', label: 'Bearish Order Block' },
            { color: '#00C2FF', label: 'Bullish FVG (Fair Value Gap)' },
            { color: '#FF9F1C', label: 'Bearish FVG' },
            { color: '#C8E6C9', label: 'Discount Zone (< 50%)' },
            { color: '#FFCDD2', label: 'Premium Zone (> 50%)' },
            { color: '#FFD700', label: 'Confluence Zone' }
        ],
        'Volume Profile': [
            { color: '#ef4444', label: 'POC (Point of Control)' },
            { color: '#3b82f6', label: 'VAH/VAL (Value Area)' },
            { color: 'rgba(34, 197, 94, 0.3)', label: 'Buy Volume' },
            { color: 'rgba(239, 68, 68, 0.3)', label: 'Sell Volume' }
        ]
    };

    const positions = {
        'bottom-left': { bottom: '12px', left: '12px' },
        'bottom-right': { bottom: '12px', right: '12px' },
        'top-left': { top: '12px', left: '12px' },
        'top-right': { top: '12px', right: '12px' }
    };

    return (
        <div style={{
            position: 'absolute',
            ...positions[position],
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '8px',
            padding: isExpanded ? '12px' : '8px 12px',
            maxHeight: isExpanded ? '400px' : 'auto',
            minWidth: '200px',
            zIndex: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backdropFilter: 'blur(10px)',
            overflow: isExpanded ? 'auto' : 'hidden',
            transition: 'all 0.3s ease'
        }}>
            {/* Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            >
                <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    📊 Legend
                </span>
                <span style={{
                    fontSize: '12px',
                    color: '#64748b',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease'
                }}>
                    ▼
                </span>
            </div>

            {/* Legend Content */}
            {isExpanded && (
                <div style={{ marginTop: '12px' }}>
                    {Object.entries(legendItems).map(([category, items]) => (
                        <div key={category} style={{ marginBottom: '12px' }}>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: '600',
                                color: '#94a3b8',
                                marginBottom: '6px',
                                paddingBottom: '4px',
                                borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
                            }}>
                                {category}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {items.map((item, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '10px'
                                    }}>
                                        {item.symbol ? (
                                            <span style={{
                                                color: item.color,
                                                fontSize: '16px',
                                                fontWeight: '900',
                                                width: '20px',
                                                textAlign: 'center'
                                            }}>
                                                {item.symbol}
                                            </span>
                                        ) : (
                                            <div style={{
                                                width: '12px',
                                                height: '12px',
                                                background: item.color,
                                                borderRadius: '2px',
                                                border: '1px solid rgba(255,255,255,0.2)'
                                            }} />
                                        )}
                                        <span style={{ color: '#cbd5e1', fontSize: '10px' }}>
                                            {item.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Data Source Transparency */}
                    <div style={{
                        marginTop: '12px',
                        padding: '8px',
                        background: meta.isProxy ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${meta.isProxy ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        borderRadius: '6px',
                        fontSize: '9px'
                    }}>
                        <div style={{ fontWeight: 'bold', color: meta.isProxy ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                            {meta.isProxy ? '⚠️ PROXY DATA' : '✅ NATIVE DATA'}
                        </div>
                        <div style={{ color: '#94a3b8' }}>Source: {meta.source}</div>
                        {meta.note && <div style={{ color: '#cbd5e1', fontStyle: 'italic', marginTop: '2px' }}>{meta.note}</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChartLegend;
