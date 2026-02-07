import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Zap, Activity, Info, ChevronDown, ChevronUp, Wind } from 'lucide-react';
import { PortfolioStressService } from '../../services/PortfolioStressService';

export default function GlobalRiskHUD({ setups = [], accountSize = 10000 }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeScenario, setActiveScenario] = useState(null);

    // 1. Calculate Core Risk Metrics
    const metrics = useMemo(() => {
        const vaR = PortfolioStressService.calculateVaR(setups, accountSize);
        const correlations = PortfolioStressService.analyzeCorrelations(setups);
        const totalOpenRisk = setups.reduce((sum, s) => sum + (s.riskAmount || 0), 0);

        return {
            vaR,
            correlations,
            totalOpenRisk,
            riskPct: (totalOpenRisk / accountSize) * 100
        };
    }, [setups, accountSize]);

    // 2. Scenario Handler
    const handleStressTest = (type) => {
        const result = PortfolioStressService.simulateShock(setups, type);
        setActiveScenario(result);
        setTimeout(() => setActiveScenario(null), 10000); // Clear after 10s
    };

    return (
        <div className="flex-col gap-sm" style={{ width: '100%', marginBottom: '24px' }}>
            {/* Main HUD Strip */}
            <div className="card glass-panel flex-row justify-between items-center" style={{ padding: '12px 20px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.6)' }}>
                <div className="flex-row items-center gap-md">
                    <div className={`badge ${metrics.riskPct > 3 ? 'badge-danger' : 'badge-success'}`} style={{ padding: '4px 8px', fontSize: '9px', fontWeight: '900' }}>
                        RISK: {metrics.riskPct.toFixed(1)}%
                    </div>
                    <div className="flex-col">
                        <span style={{ fontSize: '10px', opacity: 0.4, fontWeight: 'bold' }}>EXPOSURE HUD</span>
                        <div className="flex-row items-center gap-xs">
                            <span style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>${metrics.totalOpenRisk.toFixed(2)} AT RISK</span>
                        </div>
                    </div>
                </div>

                <div className="flex-row gap-lg">
                    <div className="flex-col items-end">
                        <span style={{ fontSize: '10px', opacity: 0.4, fontWeight: 'bold' }}>VaR (95%)</span>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b' }}>-${metrics.vaR.dollarVaR.toFixed(1)}</span>
                    </div>
                    {metrics.correlations.length > 0 && (
                        <div className="flex-col items-end">
                            <span style={{ fontSize: '10px', opacity: 0.4, fontWeight: 'bold' }}>CLUSTERS</span>
                            <div className="flex-row gap-xs">
                                {metrics.correlations.map(c => (
                                    <span key={c.factor} style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold' }}>{c.factor} ({c.count})</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {/* Expandable Stress Testing Lab */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="card glass-panel"
                        style={{ padding: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)' }}
                    >
                        <div className="flex-row justify-between items-center" style={{ marginBottom: '20px' }}>
                            <div className="flex-row items-center gap-xs">
                                <Zap size={16} color="#f59e0b" />
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>STRESS TEST LAB</h3>
                            </div>
                            <span style={{ fontSize: '10px', opacity: 0.4 }}>SIMULATE "BLACK SWAN" SCENARIOS</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            {[
                                { id: 'FLASH_CRASH', label: 'Flash Crash (-10%)', icon: Wind, color: '#ef4444' },
                                { id: 'USD_SHOCK', label: 'USD Shock (+3%)', icon: Activity, color: '#3b82f6' },
                                { id: 'VOL_SPIKE', label: 'Volatility Spike', icon: AlertTriangle, color: '#f59e0b' }
                            ].map(test => (
                                <button
                                    key={test.id}
                                    onClick={() => handleStressTest(test.id)}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                >
                                    <test.icon size={18} color={test.color} />
                                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{test.label}</span>
                                </button>
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                            {activeScenario ? (
                                <motion.div
                                    key={activeScenario.scenario}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '12px',
                                        background: activeScenario.liquidationRisk === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                                        border: `1px solid ${activeScenario.liquidationRisk === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)'}`
                                    }}
                                >
                                    <div className="flex-row justify-between items-center" style={{ marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{activeScenario.scenario.replace('_', ' ')} IMPACT</span>
                                        <div className="badge badge-danger" style={{ fontSize: '10px' }}>LIQ. RISK: {activeScenario.liquidationRisk}</div>
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444', marginBottom: '8px' }}>
                                        EST. LOSS: -${activeScenario.estimatedLoss.toFixed(2)}
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '1.4' }}>
                                        {activeScenario.message}
                                    </p>
                                </motion.div>
                            ) : (
                                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <span style={{ fontSize: '11px', opacity: 0.3 }}>Wait for scenario trigger...</span>
                                </div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
