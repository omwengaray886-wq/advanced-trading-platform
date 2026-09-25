import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Copy, ArrowRight, Clock, TrendingUp, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import axios from 'axios';

// ============================================================
// ⚠️ REPLACE THE VALUE BELOW WITH YOUR ACTUAL TRC20 WALLET ADDRESS
// ============================================================
const USDT_TRC20_WALLET = 'TBxbXDq4Uf6K1rR7PeUrd3EWdAAV17qVU6';
// ============================================================

const PRICE_USD = 99;

export default function Pricing() {
    const navigate = useNavigate();
    const { currentUser, subscriptionStatus, refreshSubscription } = useAuth();
    const { addToast } = useToast();

    const [step, setStep] = useState(1); // 1=overview, 2=payment, 3=submitted
    const [txHash, setTxHash] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const features = [
        'Full AI-driven market analysis',
        'Real-time institutional signals (29+ strategies)',
        'Multi-timeframe dashboard (1m–1W)',
        'Live order flow & liquidity heatmaps',
        'SMC/ICT order blocks, FVG detection',
        'Risk calculator & position sizing',
        'Trading academy & education hub',
        'Market scanner across all pairs',
        'Wyckoff, AMD & SMT Divergence engines',
        'Alerts & notifications system'
    ];

    const copyWallet = async () => {
        try {
            await navigator.clipboard.writeText(USDT_TRC20_WALLET);
            setCopied(true);
            addToast('Wallet address copied!', 'success');
            setTimeout(() => setCopied(false), 3000);
        } catch {
            addToast('Please copy the address manually', 'warning');
        }
    };

    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        setError('');
        if (!txHash.trim() || txHash.trim().length < 20) {
            setError('Please enter a valid TRC20 transaction hash (TXID).');
            return;
        }

        if (!currentUser) {
            addToast('Please sign in first', 'warning');
            navigate('/login');
            return;
        }

        try {
            setSubmitting(true);
            const token = localStorage.getItem('access_token');
            await axios.post('/api/payment/submit', { txHash: txHash.trim(), amount: PRICE_USD }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStep(3);
            await refreshSubscription();
            addToast('Payment submitted! We will verify and activate your account.', 'success');
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to submit payment. Please try again.';
            setError(msg);
            addToast(msg, 'error');
        }
        setSubmitting(false);
    };

    // If already subscribed, show status
    const isActive = subscriptionStatus?.isSubscriptionActive;
    const isTrial = subscriptionStatus?.isTrialActive;
    const isPending = subscriptionStatus?.hasPendingPayment;

    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at 50% 0%, #1a2c4e 0%, #0a0a0f 100%)',
            padding: '40px 24px'
        }}>
            {/* Nav */}
            <nav style={{ maxWidth: '1100px', margin: '0 auto 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/" style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={22} color="#818cf8" /> TradeAlgo
                </Link>
                <div style={{ display: 'flex', gap: '16px' }}>
                    {currentUser ? (
                        <Link to="/app" style={{ color: '#818cf8', textDecoration: 'none', fontSize: '14px' }}>← Back to App</Link>
                    ) : (
                        <>
                            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Sign in</Link>
                            <Link to="/signup" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: '600', fontSize: '14px' }}>Start Free Trial →</Link>
                        </>
                    )}
                </div>
            </nav>

            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h1 style={{
                        fontSize: '48px', fontWeight: 'bold', marginBottom: '16px',
                        background: 'linear-gradient(to right, #fff, #a5b4fc)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        Simple Pricing
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '18px', maxWidth: '500px', margin: '0 auto' }}>
                        One plan. Everything included. Pay only with <strong style={{ color: '#22d3ee' }}>USDT (TRC20)</strong>.
                    </p>
                </div>

                {/* Already active / pending banners */}
                {isActive && (
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px', textAlign: 'center', color: '#4ade80' }}>
                        ✅ Your subscription is <strong>active</strong> until {new Date(subscriptionStatus.subscriptionExpiresAt).toLocaleDateString()}.{' '}
                        <Link to="/app" style={{ color: '#4ade80', fontWeight: '600' }}>Go to App →</Link>
                    </div>
                )}
                {isTrial && !isActive && (
                    <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px', textAlign: 'center', color: '#fbbf24' }}>
                        ⏱️ You're on a free trial. Subscribe now to keep access after your trial ends.
                    </div>
                )}
                {isPending && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '12px', padding: '16px 20px', marginBottom: '32px', textAlign: 'center', color: '#818cf8' }}>
                        <Clock size={16} style={{ display: 'inline', marginRight: '8px' }} />
                        Your payment is under review. Activation within 1 hour.
                    </div>
                )}

                {/* Step 3: Submitted confirmation */}
                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '48px', background: 'rgba(255,255,255,0.04)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
                        <h2 style={{ fontSize: '28px', color: '#fff', marginBottom: '12px' }}>Payment Submitted!</h2>
                        <p style={{ color: '#94a3b8', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                            Your transaction has been received. We will verify it on the TRC20 network and activate your account within <strong style={{ color: '#fbbf24' }}>1 hour</strong>.
                        </p>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 20px', marginBottom: '24px', fontSize: '13px', color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                            TX: {txHash}
                        </div>
                        {currentUser ? (
                            <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', textDecoration: 'none', borderRadius: '8px', fontWeight: '600' }}>
                                Return to App (trial still active) <ArrowRight size={16} />
                            </Link>
                        ) : (
                            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', textDecoration: 'none', borderRadius: '8px', fontWeight: '600' }}>
                                Sign in to check status <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                )}

                {/* Step 1: Plan Overview */}
                {step === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
                        {/* Free Trial Card */}
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px' }}>
                            <h3 style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>Free Trial</h3>
                            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#4ade80', marginBottom: '8px' }}>$0</div>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>1 day · No payment needed</p>
                            {['Full platform access for 24 hours', 'All features unlocked', 'No credit card required'].map(f => (
                                <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                    <CheckCircle size={15} color="#4ade80" style={{ flexShrink: 0 }} />
                                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>{f}</span>
                                </div>
                            ))}
                            {!currentUser && (
                                <Link to="/signup" style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    marginTop: '24px', padding: '11px', background: 'rgba(74, 222, 128, 0.15)',
                                    color: '#4ade80', textDecoration: 'none', borderRadius: '8px', fontWeight: '600',
                                    border: '1px solid rgba(74, 222, 128, 0.3)'
                                }}>
                                    Start Free Trial <ArrowRight size={16} />
                                </Link>
                            )}
                        </div>

                        {/* Pro Plan Card */}
                        <div style={{
                            background: 'rgba(99, 102, 241, 0.08)',
                            border: '2px solid #6366f1',
                            borderRadius: '16px', padding: '32px',
                            position: 'relative'
                        }}>
                            <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                                MOST POPULAR
                            </div>
                            <h3 style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', marginBottom: '4px' }}>Pro Plan</h3>
                            <div style={{ fontSize: '40px', fontWeight: 'bold', color: '#818cf8', marginBottom: '4px' }}>
                                $99 <span style={{ fontSize: '18px', color: '#64748b' }}>/month</span>
                            </div>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>Pay with USDT TRC20 · Activate in 1hr</p>
                            {features.slice(0, 6).map(f => (
                                <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                    <CheckCircle size={15} color="#818cf8" style={{ flexShrink: 0 }} />
                                    <span style={{ color: '#94a3b8', fontSize: '14px' }}>{f}</span>
                                </div>
                            ))}
                            <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>+{features.length - 6} more features</p>
                            <button
                                onClick={() => { if (!currentUser) { navigate('/signup'); } else { setStep(2); } }}
                                style={{
                                    width: '100%', marginTop: '24px', padding: '12px',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff', border: 'none', borderRadius: '8px',
                                    fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                Subscribe Now — $99/mo <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Payment Instructions */}
                {step === 2 && (
                    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '14px', marginBottom: '24px' }}>← Back</button>

                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px' }}>
                            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>Complete Your Payment</h2>
                            <p style={{ color: '#94a3b8', marginBottom: '28px', fontSize: '14px' }}>
                                Send exactly <strong style={{ color: '#fff' }}>$99 USDT</strong> on the <strong style={{ color: '#22d3ee' }}>Tron (TRC20)</strong> network to the address below. Then paste your transaction ID.
                            </p>

                            {/* Step indicators */}
                            {[
                                { n: 1, text: 'Send $99 USDT (TRC20) to this wallet' },
                                { n: 2, text: 'Copy your Transaction ID (TXID) from your wallet' },
                                { n: 3, text: 'Paste it below and click Submit' }
                            ].map(step => (
                                <div key={step.n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>{step.n}</div>
                                    <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>{step.text}</p>
                                </div>
                            ))}

                            {/* Wallet Address Box */}
                            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '10px', padding: '16px', marginTop: '24px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>USDT TRC20 Wallet Address</span>
                                    <button onClick={copyWallet} style={{ background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#818cf8', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0', wordBreak: 'break-all', lineHeight: '1.6' }}>
                                    {USDT_TRC20_WALLET}
                                </div>

                                {/* QR Code via external service */}
                                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${USDT_TRC20_WALLET}&bgcolor=0a0a0f&color=ffffff&qzone=2`}
                                        alt="QR Code"
                                        style={{ width: '140px', height: '140px', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.1)' }}
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <p style={{ color: '#475569', fontSize: '11px', marginTop: '6px' }}>Scan with your wallet app</p>
                                </div>
                            </div>

                            {/* Warning */}
                            <div style={{ background: 'rgba(251, 191, 36, 0.08)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#fbbf24' }}>
                                ⚠️ Send ONLY USDT on the <strong>TRC20 (Tron)</strong> network. Sending on ERC20 or other networks will result in loss of funds.
                            </div>

                            {/* TX Hash Input */}
                            <form onSubmit={handleSubmitPayment}>
                                {error && (
                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircle size={14} /> {error}
                                    </div>
                                )}

                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#e2e8f0', marginBottom: '8px' }}>
                                        Transaction Hash (TXID)
                                    </label>
                                    <input
                                        type="text"
                                        className="input"
                                        placeholder="e.g. a3f8d2c19e74b6..."
                                        value={txHash}
                                        onChange={(e) => setTxHash(e.target.value)}
                                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                                    />
                                    <p style={{ color: '#475569', fontSize: '12px', marginTop: '6px' }}>
                                        Find this in your wallet's transaction history or on{' '}
                                        <a href="https://tronscan.org" target="_blank" rel="noreferrer" style={{ color: '#818cf8', textDecoration: 'underline' }}>TronScan.org <ExternalLink size={10} style={{ display: 'inline' }} /></a>
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        width: '100%', padding: '13px',
                                        background: submitting ? '#4f46e5aa' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        color: '#fff', border: 'none', borderRadius: '8px',
                                        fontSize: '15px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                >
                                    {submitting ? 'Submitting...' : <><span>Submit Payment for Review</span><ArrowRight size={16} /></>}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* FAQ Section */}
                {step === 1 && (
                    <div style={{ marginTop: '64px' }}>
                        <h2 style={{ textAlign: 'center', color: '#fff', fontSize: '28px', marginBottom: '32px' }}>Frequently Asked Questions</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            {[
                                { q: 'What is USDT TRC20?', a: 'USDT on the Tron blockchain. It\'s fast and has very low fees. You can get it on any major exchange (Binance, OKX, Bybit).' },
                                { q: 'How long does activation take?', a: 'Once you submit your transaction hash, we will verify it on the TRC20 network and activate your account within 1 hour.' },
                                { q: 'What does the trial include?', a: 'The 1-day free trial gives you full access to all features — no payment required. Just create an account.' },
                                { q: 'Can I cancel anytime?', a: 'Yes. Your subscription lasts 30 days per payment. Simply don\'t renew when it expires.' },
                                { q: 'Is my data secure?', a: 'Yes. Your account uses secure password hashing and all data is stored in encrypted Firebase.' },
                                { q: 'What if I sent to the wrong network?', a: 'Unfortunately, cross-chain transfers cannot be recovered. Always verify the network before sending.' },
                            ].map(({ q, a }) => (
                                <div key={q} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '20px' }}>
                                    <h4 style={{ color: '#e2e8f0', marginBottom: '8px', fontSize: '15px' }}>{q}</h4>
                                    <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>{a}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
