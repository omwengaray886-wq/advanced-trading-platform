import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, BarChart3, ArrowRight, Brain, Zap, Users, Target, Star } from 'lucide-react';
import Footer from '../components/layout/Footer';

export default function Home() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'radial-gradient(circle at 50% 0%, #1a2c4e 0%, #0a0a0f 100%)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Grid Overlay */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px', pointerEvents: 'none'
            }} />

            {/* Navigation */}
            <nav style={{
                padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'relative', zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '22px', fontWeight: 'bold', color: '#fff' }}>
                    <TrendingUp size={22} color="#818cf8" /> TradeAlgo
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Link to="/pricing" style={{ padding: '8px 16px', color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Pricing</Link>
                    <Link to="/how-it-works" style={{ padding: '8px 16px', color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>How It Works</Link>
                    <Link to="/performance" style={{ padding: '8px 16px', color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Performance</Link>
                    <Link to="/login" style={{ padding: '8px 16px', color: '#94a3b8', textDecoration: 'none', fontSize: '14px' }}>Sign In</Link>
                    <Link to="/signup" style={{
                        padding: '9px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600'
                    }}>Start Free Trial</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px 48px', position: 'relative', zIndex: 10 }}>
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: '700px', height: '700px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
                    filter: 'blur(60px)', zIndex: -1
                }} />

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '20px', padding: '6px 14px', marginBottom: '24px', fontSize: '13px', color: '#818cf8' }}>
                    <Zap size={12} /> AI-Powered Institutional-Grade Analysis
                </div>

                <h1 style={{
                    fontSize: 'clamp(40px, 6vw, 72px)', maxWidth: '900px', marginBottom: '24px',
                    letterSpacing: '-0.02em', lineHeight: '1.1',
                    background: 'linear-gradient(to right, #fff 30%, #a5b4fc)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                }}>
                    Stop Gambling. <br />Start Trading with Edge.
                </h1>

                <p style={{ fontSize: '20px', color: '#94a3b8', maxWidth: '560px', marginBottom: '40px', lineHeight: '1.7' }}>
                    AI-driven market structure analysis, institutional order flow, liquidity zone detection, and probabilistic setups — built for serious retail traders.
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Link to="/signup" style={{
                        padding: '15px 40px', fontSize: '17px', fontWeight: '600',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', textDecoration: 'none', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        boxShadow: '0 0 40px rgba(99, 102, 241, 0.3)'
                    }}>
                        Start Free Trial <ArrowRight size={20} />
                    </Link>
                    <Link to="/how-it-works" style={{
                        padding: '15px 40px', fontSize: '17px',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                        color: '#e2e8f0', textDecoration: 'none', borderRadius: '10px'
                    }}>
                        How It Works
                    </Link>
                </div>

                <p style={{ color: '#475569', fontSize: '13px', marginTop: '16px' }}>
                    ✓ 1-day free trial &nbsp;·&nbsp; ✓ No credit card &nbsp;·&nbsp; ✓ $99/month after
                </p>
            </main>

            {/* Stats Bar */}
            <section style={{
                background: 'rgba(99, 102, 241, 0.06)', borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                borderBottom: '1px solid rgba(99, 102, 241, 0.15)', padding: '20px 48px',
                position: 'relative', zIndex: 10
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '64px', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
                    {[
                        { value: '2,400+', label: 'Active Traders' },
                        { value: '29+', label: 'Trading Strategies' },
                        { value: '50+', label: 'Analysis Engines' },
                        { value: '9', label: 'Timeframes Tracked' },
                    ].map(({ value, label }) => (
                        <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#818cf8' }}>{value}</div>
                            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section style={{ padding: '80px 48px', position: 'relative', zIndex: 10 }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Everything You Need to Trade Smarter</h2>
                        <p style={{ color: '#64748b', fontSize: '16px' }}>All the tools institutional traders use, now available to you.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {[
                            { icon: <Brain size={28} color="#818cf8" />, title: 'AI Market Intelligence', desc: 'Automatically detects BOS, CHoCH, order blocks, FVGs, and smart money traps using Gemini AI.' },
                            { icon: <Shield size={28} color="#4ade80" />, title: 'Risk Management', desc: 'Dynamic position sizing, ATR-based stop losses, and probabilistic risk-to-reward calculation.' },
                            { icon: <BarChart3 size={28} color="#fbbf24" />, title: 'Institutional Order Flow', desc: 'See where large players are positioned using depth-of-market analysis and volume profiling.' },
                            { icon: <Target size={28} color="#f87171" />, title: 'Precision Entry Signals', desc: '29+ strategy modules including Wyckoff, AMD, SMT Divergence, Liquidity Sweeps and more.' },
                            { icon: <TrendingUp size={28} color="#22d3ee" />, title: 'Multi-Timeframe Analysis', desc: 'Simultaneous analysis across 9 timeframes (1m to 1W) with confluence scoring.' },
                            { icon: <Zap size={28} color="#c084fc" />, title: 'Real-Time Alerts', desc: 'Get notified instantly when your setup conditions are met across any watched pair.' },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '28px' }}>
                                <div style={{ marginBottom: '16px' }}>{icon}</div>
                                <h3 style={{ color: '#e2e8f0', marginBottom: '10px', fontSize: '17px', fontWeight: '600' }}>{title}</h3>
                                <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '14px', margin: 0 }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works — 3 Steps */}
            <section style={{ padding: '64px 48px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 10 }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>Up and Running in 3 Steps</h2>
                    <p style={{ color: '#64748b', marginBottom: '48px' }}>No complex setup. Start analyzing markets within minutes.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
                        {[
                            { step: '01', title: 'Create Free Account', desc: 'Sign up in 30 seconds. No credit card needed. Your 1-day trial starts immediately.' },
                            { step: '02', title: 'Explore the Platform', desc: 'Open any pair, run a full AI analysis, explore strategies, and test signals during your trial.' },
                            { step: '03', title: 'Subscribe to Continue', desc: 'Send $99 USDT/month to keep full access. Pay directly from your crypto wallet.' },
                        ].map(({ step, title, desc }) => (
                            <div key={step} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '48px', fontWeight: '900', color: 'rgba(99,102,241,0.3)', marginBottom: '12px', lineHeight: 1 }}>{step}</div>
                                <h3 style={{ color: '#e2e8f0', marginBottom: '10px', fontSize: '18px' }}>{title}</h3>
                                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>{desc}</p>
                            </div>
                        ))}
                    </div>
                    <Link to="/signup" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '40px',
                        padding: '13px 32px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: '#fff', textDecoration: 'none', borderRadius: '8px', fontWeight: '600'
                    }}>
                        Start Free Trial <ArrowRight size={18} />
                    </Link>
                </div>
            </section>

            {/* Testimonials */}
            <section style={{ padding: '80px 48px', position: 'relative', zIndex: 10 }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>Trusted by Traders Worldwide</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '8px' }}>
                            {[1,2,3,4,5].map(i => <Star key={i} size={18} color="#fbbf24" fill="#fbbf24" />)}
                            <span style={{ color: '#64748b', marginLeft: '8px', fontSize: '14px' }}>4.9 / 5 average</span>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {[
                            { name: 'Marcus O.', role: 'Prop Trader, Lagos', text: 'The SMC order block detection is insane. I\'ve been manually marking these for years — this does it automatically and better. Worth every penny.' },
                            { name: 'Fatima K.', role: 'Forex Trader, London', text: 'The multi-timeframe confluence system changed how I enter trades. I don\'t take a setup unless it shows up on at least 3 timeframes now. Win rate is up significantly.' },
                            { name: 'James T.', role: 'Crypto Scalper, Dubai', text: 'The 1-minute AMD engine for scalping is next level. It literally tells me where the accumulation/distribution is happening in real-time. Crazy useful.' },
                        ].map(({ name, role, text }) => (
                            <div key={name} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
                                <div style={{ display: 'flex', gap: '2px', marginBottom: '14px' }}>
                                    {[1,2,3,4,5].map(i => <Star key={i} size={14} color="#fbbf24" fill="#fbbf24" />)}
                                </div>
                                <p style={{ color: '#94a3b8', lineHeight: '1.7', fontSize: '14px', marginBottom: '16px', fontStyle: 'italic' }}>"{text}"</p>
                                <div>
                                    <div style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>{name}</div>
                                    <div style={{ color: '#475569', fontSize: '12px' }}>{role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section style={{
                padding: '64px 48px', textAlign: 'center',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                borderTop: '1px solid rgba(99, 102, 241, 0.2)',
                position: 'relative', zIndex: 10
            }}>
                <h2 style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff', marginBottom: '12px' }}>
                    Ready to Trade Like an Institution?
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '32px' }}>Start your free 1-day trial today. No payment required.</p>
                <Link to="/signup" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                    padding: '16px 48px', fontSize: '18px', fontWeight: '600',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', textDecoration: 'none', borderRadius: '12px',
                    boxShadow: '0 0 50px rgba(99, 102, 241, 0.35)'
                }}>
                    Get Started Free <ArrowRight size={22} />
                </Link>
                <p style={{ color: '#475569', fontSize: '13px', marginTop: '14px' }}>
                    Then $99 USDT/month · Cancel anytime · Payments go directly to wallet
                </p>
            </section>

            <Footer />
        </div>
    );
}
