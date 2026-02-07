import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, AlertTriangle, TrendingUp, ChevronRight, Bell } from 'lucide-react';
import { newsService } from '../../services/newsService';

export default function MacroCalendar() {
    const [events, setEvents] = useState([]);
    const [now, setNow] = useState(Math.floor(Date.now() / 1000));

    useEffect(() => {
        const fetchEvents = () => {
            const upcoming = newsService.getUpcomingShocks(48); // 48h outlook
            setEvents(upcoming.sort((a, b) => a.time - b.time));
        };

        fetchEvents();
        const timer = setInterval(() => {
            setNow(Math.floor(Date.now() / 1000));
            fetchEvents();
        }, 60000); // Update every minute

        return () => clearInterval(timer);
    }, []);

    const formatCountdown = (eventTime) => {
        const diff = eventTime - now;
        if (diff <= 0) return 'LIVE';

        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);

        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const getImpactColor = (impact) => {
        switch (impact) {
            case 'HIGH': return '#ef4444';
            case 'MEDIUM': return '#f59e0b';
            default: return '#3b82f6';
        }
    };

    return (
        <div className="card glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex-row justify-between items-center">
                <div className="flex-row items-center gap-sm">
                    <Calendar size={18} color="var(--color-accent-primary)" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Institutional Macro Desk</h3>
                </div>
                <div className="badge badge-outline" style={{ fontSize: '10px' }}>48H OUTLOOK</div>
            </div>

            <div className="flex-col gap-sm">
                {events.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
                        No high-impact events detected in the current window.
                    </div>
                ) : (
                    events.map((event, idx) => (
                        <motion.div
                            key={`${event.time}-${idx}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            style={{
                                padding: '12px',
                                borderRadius: '10px',
                                background: 'rgba(255,255,255,0.02)',
                                border: `1px solid ${now >= event.time ? getImpactColor(event.impact) : 'rgba(255,255,255,0.05)'}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div className="flex-row items-center gap-md">
                                <div style={{
                                    width: '4px',
                                    height: '24px',
                                    borderRadius: '2px',
                                    background: getImpactColor(event.impact)
                                }} />
                                <div className="flex-col">
                                    <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{event.event}</span>
                                    <div className="flex-row items-center gap-xs">
                                        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>{event.currency}</span>
                                        <span style={{ fontSize: '10px', opacity: 0.3 }}>•</span>
                                        <span style={{ fontSize: '10px', color: getImpactColor(event.impact), fontWeight: '900' }}>{event.impact} IMPACT</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-col items-end">
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: '900',
                                    fontFamily: 'monospace',
                                    color: event.time - now < 3600 ? '#ef4444' : 'white'
                                }}>
                                    {formatCountdown(event.time)}
                                </span>
                                <div className="flex-row items-center gap-xs" style={{ opacity: 0.4 }}>
                                    <Clock size={10} />
                                    <span style={{ fontSize: '10px' }}>
                                        {new Date(event.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            <div style={{ marginTop: '8px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', display: 'flex', gap: '12px' }}>
                <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: '1.4' }}>
                    <strong style={{ color: '#ef4444' }}>RISK WARNING:</strong> High-impact news causes significant slippage and spread widening. Reduce exposure 15m before event.
                </p>
            </div>
        </div>
    );
}
