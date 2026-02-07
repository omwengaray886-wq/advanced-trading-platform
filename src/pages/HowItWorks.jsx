import React from 'react';
import { Brain, TrendingUp, Target, Shield } from 'lucide-react';
import Footer from '../components/layout/Footer';

export default function HowItWorks() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>TradeAlgo</h1>
                <div className="flex-row gap-md">
                    <a href="/" className="btn btn-ghost">Home</a>
                    <a href="/pricing" className="btn btn-ghost">Pricing</a>
                    <a href="/login" className="btn btn-primary">Login</a>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px 20px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '40px', marginBottom: '16px', textAlign: 'center' }}>How TradeAlgo Works</h1>
                    <p style={{ fontSize: '18px', color: 'var(--color-text-secondary)', marginBottom: '48px', textAlign: 'center', lineHeight: '1.6' }}>
                        Our AI-powered platform analyzes market data to identify high-probability trading opportunities using institutional-grade techniques.
                    </p>

                    {/* Process Steps */}
                    <div style={{ display: 'grid', gap: '32px', marginBottom: '64px' }}>
                        <div className="card">
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>1</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <Brain size={24} color="var(--color-accent-primary)" />
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Data Collection & Processing</h3>
                                    </div>
                                    <p style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                                        Our system connects to multiple market data sources (exchanges, price feeds) and collects real-time candlestick data,
                                        volume information, and order book depth. This data is cleaned, normalized, and prepared for analysis.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>2</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <TrendingUp size={24} color="var(--color-accent-primary)" />
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Market Structure Analysis</h3>
                                    </div>
                                    <p style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                                        Our AI identifies key market structures: Higher Highs/Lows (HH/HL) in uptrends, Lower Highs/Lows (LH/LL) in downtrends,
                                        Break of Structure (BOS), Change of Character (CHOCH), and liquidity zones. This reveals where institutions are likely positioning.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>3</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <Target size={24} color="var(--color-accent-primary)" />
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Strategy Selection & Setup Generation</h3>
                                    </div>
                                    <p style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                                        Based on detected structure, our AI selects the optimal strategy: Trend Following, Smart Money Concepts (SMC),
                                        Range Trading, or Breakout. It then generates specific entry zones, stop loss levels, and multiple take profit targets
                                        with associated probabilities.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>4</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <Shield size={24} color="var(--color-accent-primary)" />
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Risk Assessment & Confidence Scoring</h3>
                                    </div>
                                    <p style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                                        Every setup receives a confidence score (0-100%) based on: trend strength, volume confirmation, structure clarity,
                                        and confluence with multiple timeframes. We also calculate optimal position sizing based on your risk tolerance
                                        and the setup's risk-to-reward ratio.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Principles */}
                    <h2 style={{ fontSize: '28px', marginBottom: '24px', textAlign: 'center' }}>Our Core Principles</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '48px' }}>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Educational First</h4>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                                We explain the "why" behind every analysis, helping you learn institutional techniques.
                            </p>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Probability-Based</h4>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                                No guarantees. We show confidence levels and alternative scenarios.
                            </p>
                        </div>
                        <div className="card" style={{ textAlign: 'center' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Risk Management</h4>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                                Every setup includes stop loss, position sizing, and risk-to-reward calculations.
                            </p>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div style={{ padding: '20px', background: 'var(--color-bg-tertiary)', borderRadius: '8px', borderLeft: '4px solid var(--color-accent-primary)' }}>
                        <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                            <strong>Important:</strong> TradeAlgo is an analytical tool, not a financial advisor.
                            All analysis is for educational purposes only. You are responsible for your own trading decisions.
                            Past performance does not guarantee future results.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
