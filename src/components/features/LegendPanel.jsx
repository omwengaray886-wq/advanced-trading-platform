import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, Layers, Zap, Target, Eye, Shield } from 'lucide-react';

/**
 * LegendPanel - Explains the visual mapping system (Phase 21)
 */
export default function LegendPanel() {
    const [isOpen, setIsOpen] = useState(false);

    const categories = [
        {
            title: 'Zones & Roles',
            items: [
                { color: '#1DB954', icon: '⬆', label: 'Demand', desc: 'Institutional buy interest' },
                { color: '#E63946', icon: '⬇', label: 'Supply', desc: 'Institutional sell interest' },
                { color: '#0B8457', icon: '🧱⬆', label: 'Bullish OB', desc: 'Validated buy footprint' },
                { color: '#8B0000', icon: '🧱⬇', label: 'Bearish OB', desc: 'Validated sell footprint' },
                { color: '#00C2FF', icon: '⚡⬆', label: 'Bullish FVG', desc: 'Upward inefficiency' },
                { color: '#FF9F1C', icon: '⚡⬇', label: 'Bearish FVG', desc: 'Downward inefficiency' },
                { color: '#8E44AD', icon: '👁️', label: 'Liquidity', desc: 'Stop pools / Targets' },
            ]
        },
        {
            title: 'State & Quality',
            items: [
                { opacity: 0.8, label: 'Fresh / Untested', desc: 'High sensitivity area' },
                { opacity: 0.45, label: 'Tested Once', desc: 'Significant mitigation' },
                { opacity: 0.2, label: 'Weak / Invalid', desc: 'Low probability footprints' },
            ]
        },
        {
            title: 'Structure & Flow',
            items: [
                { icon: '🔓', label: 'BOS', desc: 'Structure continuation' },
                { icon: '🔄', label: 'CHoCH', desc: 'Trend reversal warning' },
                { icon: '⭐', label: 'Confluence', desc: 'High-probability overlap' },
            ]
        }
    ];

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 1000,
            width: isOpen ? '280px' : 'auto',
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            color: 'white',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isOpen ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Info size={16} color="var(--color-accent-primary)" />
                    <span style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        INSTITUTIONAL LEGEND
                    </span>
                </div>
                {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>

            {/* Content */}
            {isOpen && (
                <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                    {categories.map((cat, idx) => (
                        <div key={idx} style={{ marginBottom: '20px' }}>
                            <h4 style={{
                                fontSize: '11px',
                                color: 'var(--color-text-secondary)',
                                textTransform: 'uppercase',
                                marginBottom: '12px',
                                letterSpacing: '1px'
                            }}>
                                {cat.title}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {cat.items.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '14px',
                                            background: item.color ? `rgba(${parseInt(item.color.slice(1, 3), 16)}, ${parseInt(item.color.slice(3, 5), 16)}, ${parseInt(item.color.slice(5, 7), 16)}, ${item.opacity || 0.8})` : 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${item.color || 'rgba(255,255,255,0.1)'}`
                                        }}>
                                            {item.icon}
                                            {!item.icon && <div style={{ width: '12px', height: '12px', background: 'white', opacity: item.opacity }} />}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.label}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Timeframe Rules */}
                    <div style={{
                        marginTop: '16px',
                        padding: '10px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '6px',
                        border: '1px dashed rgba(59, 130, 246, 0.3)'
                    }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-accent-primary)', marginBottom: '4px' }}>
                            TF VISUAL RULES
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                            <li><b>HTF (H4+):</b> Double-line borders</li>
                            <li><b>LTF:</b> Thin / Solid borders</li>
                            <li><b>Pending:</b> Dashed outline</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
