import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, PieChart } from 'lucide-react';
import { portfolioRiskService } from '../../services/portfolioRiskService';

/**
 * Portfolio Risk Dashboard (Phase 40)
 * Visualizes portfolio-wide metrics and drawdown protection status.
 */
export default function PortfolioRiskDashboard() {
    const riskMultiplier = portfolioRiskService.getRiskMultiplier();
    const isDefensive = riskMultiplier < 1.0;
    const netBias = portfolioRiskService.calculateNetDirectionalBias();

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} color={isDefensive ? 'var(--color-danger)' : 'var(--color-success)'} />
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>PORTFOLIO HEALTH</span>
                </div>
                <div style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: isDefensive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    color: isDefensive ? 'var(--color-danger)' : 'var(--color-success)',
                    border: `1px solid ${isDefensive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                }}>
                    {isDefensive ? 'DEFENSIVE MODE' : 'STABLE'}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>RISK CAPACITY</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{(riskMultiplier * 100)?.toFixed(0) || '0'}%</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>PORTFOLIO BETA</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: netBias > 0 ? 'var(--color-success)' : netBias < 0 ? 'var(--color-danger)' : 'white' }}>
                        {netBias > 0 ? `+${netBias}` : netBias}
                    </div>
                </div>
            </div>

            {isDefensive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px' }}>
                    <AlertTriangle size={14} color="var(--color-danger)" />
                    <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>Dynamic sizing enabled due to drawdown.</span>
                </div>
            )}
        </div>
    );
}
