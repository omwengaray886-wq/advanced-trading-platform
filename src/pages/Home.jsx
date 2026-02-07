import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, BarChart3, ArrowRight } from 'lucide-react';
import Footer from '../components/layout/Footer';

export default function Home() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Hero Section */}
            <nav style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>TradeAlgo</div>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <Link to="/pricing" className="btn btn-ghost">Pricing</Link>
                    <Link to="/about" className="btn btn-ghost">Methodology</Link>
                    <Link to="/login" className="btn btn-ghost">Login</Link>
                    <Link to="/app" className="btn btn-primary">Launch App</Link>
                </div>
            </nav>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '64px' }}>
                <h1 style={{ fontSize: '48px', maxWidth: '800px', marginBottom: '24px', letterSpacing: '-0.02em' }}>
                    Institutional-Grade Analysis <br /> for <span style={{ color: 'var(--color-accent-primary)' }}>Retail Traders</span>.
                </h1>
                <p style={{ fontSize: '20px', color: 'var(--color-text-secondary)', maxWidth: '600px', marginBottom: '48px' }}>
                    Stop gambling. Start trading with AI-driven market structure analysis, liquidity zone detection, and probabilistic setups.
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Link to="/app" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '18px' }}>
                        Get Started <ArrowRight size={20} />
                    </Link>
                    <Link to="/demo" className="btn btn-outline" style={{ padding: '12px 32px', fontSize: '18px' }}>
                        View Live Demo
                    </Link>
                </div>
            </main>

            {/* Features Grid */}
            <section style={{ padding: '64px', background: 'var(--color-bg-secondary)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', maxWidth: '1200px', margin: '0 auto' }}>
                    <div className="card">
                        <TrendingUp size={32} color="var(--color-accent-primary)" style={{ marginBottom: '16px' }} />
                        <h3>Market Structure AI</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Automatically detects Break of Structure (BOS), Change of Character (CHOCH), and trends.</p>
                    </div>
                    <div className="card">
                        <Shield size={32} color="var(--color-success)" style={{ marginBottom: '16px' }} />
                        <h3>Risk Management</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>Dynamic position sizing and risk-to-reward calculation for every potential setup.</p>
                    </div>
                    <div className="card">
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
