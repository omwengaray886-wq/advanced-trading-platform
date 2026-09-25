import React, { useState } from 'react';

/**
 * Help Overlay Component
 * In-app guide explaining confirmation requirements and how to interpret the platform
 */
export const HelpOverlay = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('confirmations');

    const tabs = {
        confirmations: {
            title: 'Entry Confirmations',
            icon: '✅',
            content: (
                <>
                    <h3>What confirmations should I wait for?</h3>
                    <div className="requirement">
                        <div className="req-badge required">REQUIRED</div>
                        <strong>Bayesian Edge ≥ 70%</strong>
                        <p>Historical win rate must be at least 70%. This is calculated from past performance.</p>
                    </div>
                    <div className="requirement">
                        <div className="req-badge optional">PLUS ONE OF:</div>
                        <ul>
                            <li><strong>HTF Alignment</strong> - Higher timeframe bias matches your direction</li>
                            <li><strong>Order Flow Alignment</strong> - Current order flow confirms direction</li>
                            <li><strong>Retest Detection</strong> - Price retested a key level</li>
                            <li><strong>Liquidity Sweep</strong> - Stops hunted before reversal</li>
                        </ul>
                    </div>
                </>
            )
        },
        arrows: {
            title: 'Prediction Arrows',
            icon: '➡️',
            content: (
                <>
                    <h3>Understanding Arrow Styles</h3>
                    <div className="arrow-guide">
                        <div className="arrow-item">
                            <div className="arrow-visual solid green"></div>
                            <div>
                                <strong>SOLID Arrow (Confirmed)</strong>
                                <p>All confirmations met. Safe to enter.</p>
                                <span className="badge success">High Conviction</span>
                            </div>
                        </div>
                        <div className="arrow-item">
                            <div className="arrow-visual dashed yellow"></div>
                            <div>
                                <strong>DASHED Arrow (Partial)</strong>
                                <p>Bayesian edge present but missing additional confirmation.</p>
                                <span className="badge warning">Medium Conviction</span>
                            </div>
                        </div>
                        <div className="arrow-item">
                            <div className="arrow-visual dotted gray"></div>
                            <div>
                                <strong>DOTTED Arrow (Waiting)</strong>
                                <p>Low confidence or waiting for news/catalyst.</p>
                                <span className="badge danger">DO NOT Enter</span>
                            </div>
                        </div>
                    </div>
                </>
            )
        },
        zones: {
            title: 'Zones & Levels',
            icon: '🗺️',
            content: (
                <>
                    <h3>Zone Types</h3>
                    <div className="zone-list">
                        <div className="zone-item"><div className="color-box ob-bull"></div><span>Bullish Order Block - Institutional buy zones</span></div>
                        <div className="zone-item"><div className="color-box ob-bear"></div><span>Bearish Order Block - Institutional sell zones</span></div>
                        <div className="zone-item"><div className="color-box fvg-bull"></div><span>Bullish FVG - Price imbalance, likely to fill</span></div>
                        <div className="zone-item"><div className="color-box fvg-bear"></div><span>Bearish FVG - Price imbalance, likely to fill</span></div>
                        <div className="zone-item"><div className="color-box discount"></div><span>Discount Zone - Below 50%, good for longs</span></div>
                        <div className="zone-item"><div className="color-box premium"></div><span>Premium Zone - Above 50%, good for shorts</span></div>
                    </div>
                </>
            )
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{
                background: '#0f172a',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                borderRadius: '12px',
                maxWidth: '700px',
                width: '100%',
                maxHeight: '80vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#e2e8f0'
                    }}>
                        📚 Platform Guide
                    </h2>
                    <button onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        lineHeight: 1
                    }}>×</button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '12px 20px 0',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.2)'
                }}>
                    {Object.entries(tabs).map(([key, tab]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                background: activeTab === key ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                border: 'none',
                                borderBottom: activeTab === key ? '2px solid #3b82f6' : '2px solid transparent',
                                color: activeTab === key ? '#3b82f6' : '#94a3b8',
                                padding: '8px 16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab.icon} {tab.title}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{
                    padding: '20px',
                    overflow: 'auto',
                    flex: 1,
                    color: '#cbd5e1',
                    fontSize: '14px',
                    lineHeight: '1.6'
                }}>
                    <style>{`
                        .requirement {
                            background: rgba(100, 116, 139, 0.1);
                            padding: 12px;
                            borderRadius: 8px;
                            marginBottom: 12px;
                            border-left: 3px solid #3b82f6;
                        }
                        .req-badge {
                            display: inline-block;
                            padding: 2px 8px;
                            borderRadius: 4px;
                            fontSize: 10px;
                            fontWeight: 700;
                            marginBottom: 8px;
                            textTransform: uppercase;
                        }
                        .req-badge.required {
                            background: rgba(239, 68, 68, 0.2);
                            color: #ef4444;
                        }
                        .req-badge.optional {
                            background: rgba(245, 158, 11, 0.2);
                            color: #f59e0b;
                        }
                        .arrow-guide {
                            display: flex;
                            flexDirection: column;
                            gap: 16px;
                        }
                        .arrow-item {
                            display: flex;
                            gap: 12px;
                            alignItems: flex-start;
                        }
                        .arrow-visual {
                            width: 40px;
                            height: 4px;
                            borderRadius: 2px;
                            flexShrink: 0;
                            marginTop: 8px;
                        }
                        .arrow-visual.solid { background: currentColor; }
                        .arrow-visual.dashed { background: repeating-linear-gradient(90deg, currentColor 0, currentColor 8px, transparent 8px, transparent 16px); }
                        .arrow-visual.dotted { background: repeating-linear-gradient(90deg, currentColor 0, currentColor 4px, transparent 4px, transparent 8px); }
                        .arrow-visual.green { color: #10b981; }
                        .arrow-visual.yellow { color: #f59e0b; }
                        .arrow-visual.gray { color: #64748b; }
                        .badge {
                            display: inline-block;
                            padding: 2px 8px;
                            borderRadius: 4px;
                            fontSize: 10px;
                            fontWeight: 700;
                            marginTop: 4px;
                        }
                        .badge.success { background: rgba(16, 185, 129, 0.2); color: #10b981; }
                        .badge.warning { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
                        .badge.danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
                        .zone-list {
                            display: flex;
                            flexDirection: column;
                            gap: 10px;
                        }
                        .zone-item {
                            display: flex;
                            gap: 12px;
                            alignItems: center;
                            padding: 8px;
                            background: rgba(100, 116, 139, 0.05);
                            borderRadius: 6px;
                        }
                        .color-box {
                            width: 24px;
                            height: 24px;
                            borderRadius: 4px;
                            border: 1px solid rgba(255,255,255,0.2);
                            flexShrink: 0;
                        }
                        .color-box.ob-bull { background: #0B8457; }
                        .color-box.ob-bear { background: #8B0000; }
                        .color-box.fvg-bull { background: #00C2FF; }
                        .color-box.fvg-bear { background: #FF9F1C; }
                        .color-box.discount { background: #C8E6C9; }
                        .color-box.premium { background: #FFCDD2; }
                        h3 { color: #e2e8f0; fontSize: 16px; marginTop: 0; marginBottom: 16px; }
                        p { margin: 8px 0; }
                        ul { margin: 8px 0; paddingLeft: 20px; }
                        li { marginBottom: 6px; }
                    `}</style>
                    {tabs[activeTab].content}
                </div>
            </div>
        </div>
    );
};

export default HelpOverlay;
