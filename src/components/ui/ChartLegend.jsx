import React, { useState } from 'react';

/**
 * Chart Legend Component
 * Displays color codes and descriptions for all chart overlay elements
 */
export const ChartLegend = ({ position = 'bottom-left' }) => {
    const [isExpanded, setIsExpanded] = useState(false);

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

                    {/* Keyboard Shortcuts */}
                    <div style={{
                        marginTop: '12px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                        <div style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            color: '#94a3b8',
                            marginBottom: '6px'
                        }}>
                            Keyboard Shortcuts
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {[
                                { key: 'L', action: 'Toggle Legend' },
                                { key: 'V', action: 'Toggle Volume Profile' },
                                { key: 'E', action: 'Toggle Entry Zones' },
                                { key: '?', action: 'Show Help' }
                            ].map(({ key, action }) => (
                                <div key={key} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '9px'
                                }}>
                                    <kbd style={{
                                        background: 'rgba(100, 116, 139, 0.2)',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid rgba(148, 163, 184, 0.3)',
                                        color: '#e2e8f0',
                                        fontFamily: 'monospace',
                                        fontSize: '9px',
                                        fontWeight: '700',
                                        minWidth: '16px',
                                        textAlign: 'center'
                                    }}>
                                        {key}
                                    </kbd>
                                    <span style={{ color: '#94a3b8' }}>{action}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChartLegend;
