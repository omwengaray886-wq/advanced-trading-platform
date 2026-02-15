import React from 'react';

export const LeadLagMonitor = ({ leadLag }) => {
    if (!leadLag || !leadLag.detected) return null;

    const isBearish = leadLag.implication === 'BEARISH';
    const color = isBearish ? '#FF4560' : '#00E396';

    return (
        <div className="lead-lag-monitor" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: `rgba(${isBearish ? '255, 69, 96' : '0, 227, 150'}, 0.1)`,
            border: `1px solid ${color}`,
            borderRadius: '4px',
            marginTop: '8px',
            fontSize: '12px'
        }}>
            <span style={{ fontSize: '16px' }}>{isBearish ? '⚠️' : '🚀'}</span>
            <div>
                <div style={{ fontWeight: 'bold', color: color }}>
                    {leadLag.leader} Leading ({leadLag.lag}m)
                </div>
                <div style={{ color: '#aaa', fontSize: '10px' }}>
                    Signal: {leadLag.implication} | Corr: {leadLag.correlation.toFixed(2)}
                </div>
            </div>
        </div>
    );
};
