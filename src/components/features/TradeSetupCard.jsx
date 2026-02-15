import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Target, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { normalizeDirection } from '../../utils/normalization.js';
import { useToast } from '../../context/ToastContext';

const TradeSetupCard = ({ setup, index = 0, onClick }) => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const isBullish = normalizeDirection(setup.direction) === 'BULLISH';

    const handleViewChart = () => {
        addToast(`Opening chart for ${setup.symbol}...`, 'info');
        navigate('/app/markets');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', transition: 'border-color 0.2s' }}
        >
            <div className="card-header" style={{ marginBottom: 0 }}>
                <div className="flex-col">
                    <div className="flex-row items-center gap-sm">
                        <h3 className="card-title">{setup.symbol}</h3>
                        {/* Scalp Badge */}
                        {(setup.timeframe === '1m' || setup.timeframe === '5m' || setup.strategy === 'SCALPER_ENGINE') && (
                            <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 6px' }}>
                                <Zap size={10} fill="currentColor" />
                                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>SCALP</span>
                            </span>
                        )}
                        <span className={`badge ${isBullish ? 'badge-success' : 'badge-danger'}`}>
                            {setup.direction}
                        </span>
                        {setup.smtConfluence > 0 && (
                            <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '10px' }}>
                                SMT {setup.smtConfluence}%
                            </span>
                        )}
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>{setup.bias}</span>
                        {setup.marketState?.amdCycle && (
                            <span className={`badge ${setup.marketState.amdCycle.phase === 'MANIPULATION' ? 'badge-danger' : 'badge-neutral'}`} style={{ fontSize: '10px' }}>
                                {setup.marketState.amdCycle.phase}
                            </span>
                        )}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        {new Date(setup.timestamp).toLocaleString()}
                    </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: (setup.quantScore || setup.confidence) > 75 ? 'var(--color-success)' : 'var(--color-accent-primary)' }}>
                        {setup.quantScore || setup.confidence}%
                    </span>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Quant Score</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', background: 'var(--color-bg-primary)', padding: '12px', borderRadius: '6px' }}>
                <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>ENTRY ZONE</span>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {Array.isArray(setup.entryZone) && setup.entryZone.length > 0 && typeof setup.entryZone[0] === 'number'
                            ? `${setup.entryZone[0]?.toFixed(5) || 'N/A'} - ${setup.entryZone[1]?.toFixed(5) || 'N/A'}`
                            : setup.entryZone?.optimal?.toFixed(5) || 'PENDING'}
                    </div>
                </div>
                <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>STOP LOSS</span>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-danger)' }}>
                        {typeof setup.stopLoss === 'number' ? setup.stopLoss.toFixed(5) : setup.stopLoss}
                    </div>
                </div>
                <div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>TARGETS</span>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--color-success)' }}>
                        {Array.isArray(setup.targets)
                            ? setup.targets.map(t => typeof t === 'object' && t.price ? t.price?.toFixed(5) : (typeof t === 'number' ? t.toFixed(5) : t)).join(', ')
                            : 'N/A'}
                    </div>
                </div>
            </div>

            {/* Institutional Factors Section [NEW] */}
            {setup.annotations && setup.annotations.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {Array.from(new Set(setup.annotations.map(a => a.type)))
                        .filter(type => ['ORDER_BLOCK', 'LIQUIDITY_ZONE', 'CONFLUENCE_ZONE', 'FAIR_VALUE_GAP', 'LIQUIDITY_SWEEP_ZONE'].includes(type))
                        .map(type => (
                            <span key={type} style={{
                                fontSize: '9px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: type === 'CONFLUENCE_ZONE' ? 'rgba(255, 215, 0, 0.2)' : 'var(--color-bg-tertiary)',
                                color: type === 'CONFLUENCE_ZONE' ? '#b8860b' : 'var(--color-text-secondary)',
                                border: `1px solid ${type === 'CONFLUENCE_ZONE' ? 'rgba(255, 215, 0, 0.4)' : 'transparent'}`,
                                fontWeight: '600'
                            }}>
                                {type.replace('_ZONE', '').replace('_', ' ')}
                            </span>
                        ))
                    }
                </div>
            )}

            <div>
                <h4 style={{ fontSize: '14px', margin: '0 0 8px 0', color: 'var(--color-text-primary)' }}>Analysis Thesis</h4>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    {setup.thesis}
                </p>
            </div>

            {setup.marketState?.performanceWeights && (
                <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px' }}>
                    Strategy Performance Weight: <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{setup.marketState.performanceWeights[setup.strategy]?.toFixed(2) || '1.00'}x</span>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                <span className="badge badge-neutral">R:R {setup.rrRatio}</span>
                <button onClick={() => onClick(setup)} className="btn btn-outline" style={{ fontSize: '12px', padding: '6px 12px' }}>
                    View Details <ArrowRight size={14} />
                </button>
            </div>
        </motion.div>
    );
};

export default TradeSetupCard;
