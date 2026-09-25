import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Brain, CheckCircle, AlertCircle, MessageSquare, Shield, Zap, Heart } from 'lucide-react';

export default function StrategyJournalModal({ trade, onClose, onSave }) {
    const [emotion, setEmotion] = useState('CALM');
    const [followedRules, setFollowedRules] = useState(true);
    const [confidence, setConfidence] = useState(3);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const emotions = [
        { id: 'CALM', icon: Heart, label: 'Focused/Calm', color: '#10b981' },
        { id: 'FOBO', icon: Zap, label: 'FOBO/Fear', color: '#f59e0b' },
        { id: 'REVENGE', icon: AlertCircle, label: 'Revenge', color: '#ef4444' },
        { id: 'FOMO', icon: Zap, label: 'FOMO', color: '#3b82f6' }
    ];

    // Load existing entry if available
    React.useEffect(() => {
        const loadEntry = async () => {
            const journalService = (await import('../../services/journalService')).journalService;
            const existing = await journalService.getEntry(trade.id);
            if (existing) {
                setEmotion(existing.emotion || 'CALM');
                setFollowedRules(existing.followedRules !== false);
                setConfidence(existing.confidence || 3);
                setNotes(existing.notes || '');
            }
        };
        loadEntry();
    }, [trade.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        // Simulate save delay
        await new Promise(r => setTimeout(r, 500));
        onSave({
            tradeId: trade.id,
            symbol: trade.symbol, // Save symbol for easier indexing
            emotion,
            followedRules,
            confidence,
            notes,
            timestamp: Date.now()
        });
        setIsSaving(false);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    background: '#0f172a',
                    border: '1px solid rgba(255,b255,255,0.1)',
                    borderRadius: '24px',
                    padding: '32px',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}
            >
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>

                <div className="flex-row items-center gap-sm" style={{ marginBottom: '24px' }}>
                    <Shield size={24} color="var(--color-accent-primary)" />
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900' }}>Post-Execution Review</h2>
                </div>

                <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,b255,255,0.05)', marginBottom: '24px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Auditing Trade</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{trade.symbol} • {trade.id}</div>
                </div>

                <form onSubmit={handleSubmit} className="flex-col gap-lg">
                    {/* Emotion Picker */}
                    <div className="flex-col gap-sm">
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>Current State of Mind</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {emotions.map(e => {
                                const Icon = e.icon;
                                return (
                                    <button
                                        key={e.id}
                                        type="button"
                                        onClick={() => setEmotion(e.id)}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: `1px solid ${emotion === e.id ? e.color : 'rgba(255,255,255,0.05)'}`,
                                            background: emotion === e.id ? `${e.color}10` : 'rgba(255,255,255,0.02)',
                                            color: emotion === e.id ? e.color : 'rgba(255,255,255,0.5)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <Icon size={16} />
                                        {e.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rule Adherence */}
                    <div className="flex-row justify-between items-center" style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex-col">
                            <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Institutional Discipline</span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Did you follow every candle rule?</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFollowedRules(!followedRules)}
                            style={{
                                width: '40px',
                                height: '20px',
                                borderRadius: '10px',
                                background: followedRules ? '#10b981' : 'rgba(255,255,255,0.1)',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative',
                                padding: '2px'
                            }}
                        >
                            <motion.div
                                animate={{ x: followedRules ? 20 : 0 }}
                                style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white' }}
                            />
                        </button>
                    </div>

                    {/* Rationale Notes */}
                    <div className="flex-col gap-sm">
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'rgba(255,255,255,0.6)' }}>Strategy Rationale</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Why did you take this trade? Any deviations or realizations?"
                            style={{
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '12px',
                                padding: '16px',
                                color: 'white',
                                fontSize: '13px',
                                minHeight: '100px',
                                resize: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '16px', borderRadius: '12px', fontWeight: 'bold' }}
                    >
                        {isSaving ? 'ARCHIVING...' : 'SAVE TO STRATEGY JOURNAL'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
