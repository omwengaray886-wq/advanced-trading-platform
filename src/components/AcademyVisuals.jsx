import React from 'react';
import { motion } from 'framer-motion';
import { User, Landmark, Building2, Briefcase, ChevronRight, Clock, MapPin } from 'lucide-react';

// 1. Tug of War (Currency Pairs)
export const TugOfWar = () => (
    <div style={{ padding: '24px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', margin: '20px 0', border: '1px solid var(--color-border-primary)' }}>
        <h4 style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: 'var(--color-text-tertiary)' }}>THE CURRENCY TUG-OF-WAR</h4>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <motion.div
                animate={{ x: [0, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                style={{ textAlign: 'center', flex: 1 }}
            >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-accent-primary)' }}>EUR</div>
                <div style={{ fontSize: '10px', opacity: 0.6 }}>Base Currency</div>
            </motion.div>

            <div style={{ flex: 2, height: '4px', background: 'var(--color-border-primary)', position: 'relative', margin: '0 20px' }}>
                <motion.div
                    animate={{ x: ['-40%', '40%'] }}
                    transition={{ repeat: Infinity, duration: 2, repeatType: 'reverse' }}
                    style={{ position: 'absolute', top: '-8px', left: '50%', width: '16px', height: '16px', background: 'var(--color-accent-primary)', borderRadius: '50%', border: '4px solid #fff' }}
                />
            </div>

            <motion.div
                animate={{ x: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                style={{ textAlign: 'center', flex: 1 }}
            >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-text-secondary)' }}>USD</div>
                <div style={{ fontSize: '10px', opacity: 0.6 }}>Quote Currency</div>
            </motion.div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '11px', mt: '12px', opacity: 0.7 }}>The exchange rate is the result of who's winning the rope pull!</p>
    </div>
);

// 2. FX Ladder (Hierarchy)
export const FXLadder = () => (
    <div style={{ margin: '24px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
            { label: 'INTERBANK MARKET', icon: Landmark, color: '#f59e0b', desc: 'The Super Banks (UBS, Barclays, etc)' },
            { label: 'HEDGE FUNDS & LARGE CORPS', icon: Building2, color: '#3b82f6', desc: 'Apple, Toyota, Multi-billion funds' },
            { label: 'RETAIL BROKERS', icon: Briefcase, color: '#10b981', desc: 'Market Makers and ECNs' },
            { label: 'RETAIL TRADERS', icon: User, color: '#a855f7', desc: 'You and me (The "Little Guys")' }
        ].map((level, i) => (
            <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${level.color}`
                }}
            >
                <level.icon size={20} style={{ color: level.color }} />
                <div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{level.label}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{level.desc}</div>
                </div>
            </motion.div>
        ))}
    </div>
);

// 3. Session Overlap (Timeline)
export const SessionOverlap = () => {
    const sessions = [
        { name: 'SYDNEY', range: [18, 3], color: '#6366f1' },
        { name: 'TOKYO', range: [19, 4], color: '#ec4899' },
        { name: 'LONDON', range: [3, 12], color: '#f59e0b' },
        { name: 'NEW YORK', range: [8, 17], color: '#0ea5e9' }
    ];

    return (
        <div style={{ margin: '24px 0', padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '10px', opacity: 0.5 }}>
                <span>6PM (EST)</span>
                <span>12AM</span>
                <span>6AM</span>
                <span>12PM</span>
                <span>5PM</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sessions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '70px', fontSize: '10px', fontWeight: 'bold' }}>{s.name}</div>
                        <div style={{ flex: 1, height: '14px', background: 'rgba(255,255,255,0.05)', borderRadius: '7px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute',
                                left: `${(s.range[0] < 18 ? s.range[0] + 6 : s.range[0] - 18) * 4.16}%`,
                                width: `${((s.range[1] < s.range[0] ? s.range[1] + 24 - s.range[0] : s.range[1] - s.range[0])) * 4.16}%`,
                                height: '100%',
                                background: s.color,
                                opacity: 0.7
                            }} />
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: '16px', background: 'rgba(0, 210, 255, 0.1)', padding: '8px', borderRadius: '4px', fontSize: '11px', textAlign: 'center' }}>
                ⚡ <strong>HOT ZONE:</strong> 8am - 12pm EST (London & NY Overlap)
            </div>
        </div>
    );
};

// 4. Candle Anatomy
export const CandleAnatomy = () => (
    <div style={{ display: 'flex', gap: '40px', alignItems: 'center', justifyContent: 'center', padding: '32px', background: 'var(--color-bg-secondary)', borderRadius: '12px', margin: '24px 0' }}>
        <div style={{ position: 'relative', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '2px', height: '100%', background: 'var(--color-success)', position: 'absolute' }} />
            <div style={{ width: '40px', height: '100px', background: 'var(--color-success)', borderRadius: '2px', zIndex: 1, marginTop: '40px' }} />

            {/* Labels */}
            <div style={{ position: 'absolute', top: 0, right: '-60px', fontSize: '11px' }}>High</div>
            <div style={{ position: 'absolute', top: '40px', left: '-80px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-success)' }}>Close</div>
            <div style={{ position: 'absolute', top: '140px', left: '-80px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-success)' }}>Open</div>
            <div style={{ position: 'absolute', bottom: 0, right: '-60px', fontSize: '11px' }}>Low</div>

            <div style={{ position: 'absolute', top: '90px', right: '-120px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>BULLISH CANDLE</div>
                <div style={{ fontSize: '9px', opacity: 0.5 }}>Price went UP</div>
            </div>
        </div>
    </div>
);

// 5. Support & Resistance Bounce
export const SRBounce = () => (
    <div style={{ height: '180px', position: 'relative', margin: '24px 0', padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, height: '1px', background: 'var(--color-danger)', borderBottom: '1px dashed var(--color-danger)', opacity: 0.5 }}>
            <span style={{ position: 'absolute', right: '10px', top: '-18px', fontSize: '10px', color: 'var(--color-danger)' }}>RESISTANCE (CEILING)</span>
        </div>
        <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, height: '1px', background: 'var(--color-success)', borderBottom: '1px dashed var(--color-success)', opacity: 0.5 }}>
            <span style={{ position: 'absolute', right: '10px', bottom: '-18px', fontSize: '10px', color: 'var(--color-success)' }}>SUPPORT (FLOOR)</span>
        </div>

        <motion.div
            animate={{
                y: [0, 140, 0, 140, 70],
                x: [0, 100, 200, 300, 400]
            }}
            transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
            style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                width: '12px',
                height: '12px',
                background: 'var(--color-accent-primary)',
                borderRadius: '50%',
                boxShadow: '0 0 10px var(--color-accent-primary)'
            }}
        />
    </div>
);
