import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { alertOrchestrator } from '../services/AlertOrchestrator';
import { proactiveMonitor } from '../services/ProactiveMonitor';
import { Bell, Shield, Zap, Target, Activity, AlertTriangle, ArrowRight, Trash2, Clock, CheckCircle } from 'lucide-react';

/**
 * Institutional Alerts Page (Phase 4)
 * Real-time feed of background-detected signals.
 */
export default function Alerts() {
    const [alerts, setAlerts] = useState(alertOrchestrator.getAlerts());
    const [isMonitoring, setIsMonitoring] = useState(proactiveMonitor.isRunning);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = alertOrchestrator.onUpdate((newAlerts) => {
            setAlerts(newAlerts);
        });
        return unsubscribe;
    }, []);

    const toggleMonitoring = () => {
        if (isMonitoring) {
            proactiveMonitor.stop();
        } else {
            proactiveMonitor.start();
        }
        setIsMonitoring(!isMonitoring);
    };

    const handleAcknowledge = (id) => {
        alertOrchestrator.acknowledgeAlert(id);
    };

    const handleAnalyse = (symbol) => {
        navigate(`/markets?symbol=${symbol.replace('/', '')}`);
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', minHeight: '100vh', color: 'white' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Institutional Alerts</h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Real-time background scanning for "Smart Money" fingerprints.</p>
                </div>

                <button
                    onClick={toggleMonitoring}
                    style={{
                        padding: '12px 24px',
                        borderRadius: '12px',
                        background: isMonitoring ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${isMonitoring ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        color: isMonitoring ? '#ef4444' : '#10b981',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                    }}
                >
                    <Activity size={18} className={isMonitoring ? 'animate-pulse' : ''} />
                    {isMonitoring ? 'STOP SCANNER' : 'START MONITORING'}
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '40px' }}>
                {/* Main Alerts Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <AnimatePresence mode="popLayout">
                        {alerts.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{
                                    padding: '60px',
                                    textAlign: 'center',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}
                            >
                                <Bell size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
                                <h3 style={{ fontSize: '18px', color: 'rgba(255,255,255,0.3)' }}>No active signals detected.</h3>
                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '8px' }}>
                                    Enable background monitoring to detect institutional flows.
                                </p>
                            </motion.div>
                        ) : (
                            alerts.map(alert => (
                                <motion.div
                                    key={alert.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    style={{
                                        background: alert.status === 'ACKNOWLEDGED' ? 'rgba(255,255,255,0.02)' : 'rgba(30, 41, 59, 0.4)',
                                        border: `1px solid ${alert.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                                        borderRadius: '16px',
                                        padding: '20px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        opacity: alert.status === 'ACKNOWLEDGED' ? 0.6 : 1,
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            background: alert.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: alert.severity === 'HIGH' ? '#ef4444' : '#3b82f6'
                                        }}>
                                            {alert.type === 'INSTITUTIONAL_FAKE_OUT' ? <Zap size={24} /> :
                                                alert.type === 'LIQUIDITY_GRAB' ? <Target size={24} /> : <Activity size={24} />}
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{alert.symbol}</span>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    color: 'rgba(255,255,255,0.6)',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {alert.type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>{alert.message}</p>
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '10px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={12} /> {new Date(alert.timestamp).toLocaleTimeString()}
                                                </span>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    color: alert.iqScore >= 80 ? '#10b981' : '#f59e0b',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <Shield size={12} /> IQ SCORE: {alert.iqScore}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        {alert.status === 'ACTIVE' && (
                                            <button
                                                onClick={() => handleAcknowledge(alert.id)}
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    color: 'rgba(255,255,255,0.4)',
                                                    cursor: 'pointer'
                                                }}
                                                title="Acknowledge"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleAnalyse(alert.symbol)}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                background: 'var(--color-accent-primary)',
                                                border: 'none',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '12px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            ANALYSE <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Sidebar Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        padding: '24px',
                        borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '20px' }}>SYSTEM HEALTH</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Background Loop</span>
                                <span style={{ color: isMonitoring ? '#10b981' : '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>
                                    {isMonitoring ? 'ACTIVE' : 'IDLE'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Scan Frequency</span>
                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>1min</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>Active Watchlist</span>
                                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{proactiveMonitor.watchlist.length} Assets</span>
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.02) 100%)',
                        padding: '24px',
                        borderRadius: '24px',
                        border: '1px solid rgba(37, 99, 235, 0.2)'
                    }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '1px', marginBottom: '12px' }}>IQ THRESHOLD</h4>
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6' }}>
                            Currently ignoring signals below IQ 50. High-conviction alerts (IQ 80+) are automatically saved to Signal Lab.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
