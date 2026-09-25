import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * SubscriptionWall — shown when user's trial/subscription has expired
 * Blocks access to protected content and directs user to payment page
 */
export default function SubscriptionWall() {
    const navigate = useNavigate();
    const { currentUser, subscriptionStatus, logout } = useAuth();

    const [timeLeft, setTimeLeft] = useState('');

    // Countdown timer if trial is still active (near expiry)
    useEffect(() => {
        if (!subscriptionStatus?.trialEndsAtMs) return;
        const update = () => {
            const ms = subscriptionStatus.trialEndsAtMs - Date.now();
            if (ms <= 0) { setTimeLeft('Expired'); return; }
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            setTimeLeft(`${h}h ${m}m ${s}s`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [subscriptionStatus]);

    const hasPending = subscriptionStatus?.hasPendingPayment;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 0%, #1a1a2e 0%, #0a0a0f 100%)',
            padding: '24px'
        }}>
            <div style={{ width: '100%', maxWidth: '560px' }}>
                {/* Icon */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '72px', height: '72px',
                        background: hasPending ? 'rgba(251, 191, 36, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        border: `2px solid ${hasPending ? '#fbbf24' : '#ef4444'}`,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        {hasPending
                            ? <Clock size={32} color="#fbbf24" />
                            : <Lock size={32} color="#ef4444" />
                        }
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                        {hasPending ? '⏳ Payment Under Review' : '🔒 Subscription Required'}
                    </h1>
                    <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                        {hasPending
                            ? 'Your payment has been submitted and is being verified. Access will be restored within 1 hour of confirmation.'
                            : `Hello ${currentUser?.name || 'Trader'} — your free trial has ended. Subscribe to continue using the platform.`
                        }
                    </p>
                </div>

                {/* Status Box */}
                {!hasPending && (
                    <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '24px'
                    }}>
                        <h3 style={{ color: '#fff', fontWeight: '600', marginBottom: '16px' }}>Pro Plan — $99/month</h3>
                        {[
                            'Full market analysis & AI signals',
                            'Real-time institutional order flow',
                            '29+ smart money trading strategies',
                            'Multi-timeframe analysis dashboard',
                            'Risk management & position sizing',
                            'Trading academy & education hub'
                        ].map(f => (
                            <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                <CheckCircle size={16} color="#22c55e" style={{ flexShrink: 0 }} />
                                <span style={{ color: '#cbd5e1', fontSize: '14px' }}>{f}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Action Buttons */}
                {hasPending ? (
                    <div style={{
                        background: 'rgba(251, 191, 36, 0.08)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center',
                        color: '#fbbf24',
                        fontSize: '14px'
                    }}>
                        <Clock size={16} style={{ display: 'inline', marginRight: '8px' }} />
                        Payment verification in progress — please check back soon
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/pricing')}
                        style={{
                            width: '100%', padding: '14px 24px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff', border: 'none', borderRadius: '8px',
                            fontSize: '16px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        Subscribe Now — $99/mo <ArrowRight size={18} />
                    </button>
                )}

                {/* Logout link */}
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}
