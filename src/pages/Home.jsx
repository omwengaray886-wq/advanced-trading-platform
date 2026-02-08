import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, BarChart3, ArrowRight } from 'lucide-react';
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
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                pointerEvents: 'none'
            }}></div>

            {/* Hero Section */}
            <nav style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', position: 'relative', zIndex: 10 }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>TradeAlgo</div>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <Link to="/pricing" className="btn btn-ghost">Pricing</Link>
                    <Link to="/about" className="btn btn-ghost">Methodology</Link>
                    <Link to="/app" className="btn btn-primary">Launch App</Link>
                </div>
            </nav>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px', position: 'relative', zIndex: 10 }}>
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '600px',
                    height: '600px',
                    background: 'radial-gradient(circle, rgba(29, 185, 84, 0.1) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                    zIndex: -1
                }}></div>

                <h1 style={{ fontSize: '64px', maxWidth: '900px', marginBottom: '24px', letterSpacing: '-0.02em', lineHeight: '1.1', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Institutional-Grade Analysis <br /> for <span style={{ color: 'var(--color-accent-primary)', WebkitTextFillColor: 'initial' }}>Retail Traders</span>.
                </h1>
                <p style={{ fontSize: '20px', color: 'var(--color-text-secondary)', maxWidth: '600px', marginBottom: '48px', lineHeight: '1.6' }}>
                    Stop gambling. Start trading with AI-driven market structure analysis, liquidity zone detection, and probabilistic setups.
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Link to="/app" className="btn btn-primary" style={{ padding: '16px 48px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Get Started <ArrowRight size={20} />
                    </Link>
                    <Link to="/demo" className="btn btn-outline" style={{ padding: '16px 48px', fontSize: '18px' }}>
                        View Live Demo
                    </Link>
                </div>
            </main>

            {/* Features Grid */}
            <section style={{ padding: '64px', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                    <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <TrendingUp size={32} color="var(--color-accent-primary)" style={{ marginBottom: '16px' }} />
                        <h3>Market Structure AI</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Automatically detects Break of Structure (BOS), Change of Character (CHOCH), and trends.</p>
                    </div>
                    <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Shield size={32} color="var(--color-success)" style={{ marginBottom: '16px' }} />
                        <h3>Risk Management</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Dynamic position sizing and risk-to-reward calculation for every potential setup.</p>
                    </div>
                    <div className="card" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <BarChart3 size={32} color="var(--color-warning)" style={{ marginBottom: '16px' }} />
                        <h3>Institutional Data</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>See where the liquidity is. Identify supply and demand zones with precision.</p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
