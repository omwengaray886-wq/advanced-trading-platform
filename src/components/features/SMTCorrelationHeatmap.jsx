import React from 'react';
import { Activity, Radio, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * SMT Correlation Heatmap (Phase 37)
 * Visualizes the divergence/correlation status of sibling assets.
 */
export default function SMTCorrelationHeatmap({ divergences = [], symbol, activeTimeframe }) {
    // Mocking sibling statuses based on detected divergences
    // In a real scenario, this would be fueled by a subscription to multiple streams
    const siblings = {
        'BTCUSDT': ['ETHUSDT', 'SOLUSDT', 'TOTAL', 'FDAX'],
        'EURUSD': ['GBPUSD', 'AUDUSD', 'DXY', 'USDCHF'],
        'XAUUSD': ['DXY', 'SILVER', 'US10Y']
    };

    const cleanSymbol = symbol ? symbol.replace('/', '').toUpperCase() : 'BTCUSDT';
    const targetSiblings = siblings[cleanSymbol] || [];

    const getStatus = (sibling) => {
        const div = divergences.find(d => d.metadata.sibling === sibling);
        if (div) {
            return {
                label: 'DIVERGENCE',
                color: 'var(--color-danger)',
                icon: <AlertCircle size={14} />,
                strength: div.metadata.basketStrength || 'High'
            };
        }
        return {
            label: 'CORRELATED',
            color: 'var(--color-success)',
            icon: <CheckCircle2 size={14} />,
            strength: 'Confirmed'
        };
    };

    if (targetSiblings.length === 0) return null;

    return (
        <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div className="flex-row justify-between align-center mb-md">
                <div className="flex-row align-center gap-sm">
                    <Activity size={16} color="var(--color-accent-primary)" />
                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>SMT CORRELATION HEATMAP</span>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    {activeTimeframe}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                {targetSiblings.map(sibling => {
                    const status = getStatus(sibling);
                    return (
                        <div
                            key={sibling}
                            style={{
                                padding: '10px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '8px',
                                border: `1px solid ${status.color.replace(')', ', 0.2)')}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                            }}
                        >
                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{sibling}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: status.color }}>
                                {status.icon}
                                <span style={{ fontSize: '9px', fontWeight: 'bold', letterSpacing: '0.05em' }}>{status.label}</span>
                            </div>
                            <div style={{ height: '2px', width: '100%', background: 'rgba(255,255,255,0.05)', marginTop: '4px', borderRadius: '1px' }}>
                                <div style={{
                                    height: '100%',
                                    width: status.label === 'DIVERGENCE' ? '100%' : '100%',
                                    background: status.color,
                                    borderRadius: '1px'
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '12px', fontSize: '10px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Radio size={10} color="var(--color-accent-primary)" />
                <span>Inter-market verification: {divergences.length > 0 ? 'CRACKED (Institutional Pressure)' : 'STABLE (Standard Flow)'}</span>
            </div>
        </div>
    );
}
