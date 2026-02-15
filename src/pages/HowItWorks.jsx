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

                    {/* Process Steps: Brain, Body, Hands */}
                    <div style={{ display: 'grid', gap: '32px', marginBottom: '64px' }}>

                        {/* Phase 6: The Brain */}
                        <div className="card">
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>1</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <Brain size={24} color="var(--color-accent-primary)" />
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>The Brain: Predictive Intelligence</h3>
                                    </div>
                                    <p style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                                        <strong>Intermarket Lead-Lag:</strong> We track DXY and US10Y yields to predict crypto moves <em>before</em> they happen.<br />
                                        <strong>Ghost Patterns (DTW):</strong> Our AI scans 5 years of history to find "fractal matches" (Dynamic Time Warping) and projects the likely future path.<br />
                                        <strong>Sentiment:</strong> NLP analysis of news and social feeds provides a real-time "Fear & Greed" bias.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Phase 1-5: The Body */}
                        <div className="card">
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>2</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <TrendingUp size={24} color="var(--color-accent-primary)" />
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>The Body: Structural Analysis</h3>
                                    </div>
                                    <p style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                                        <strong>Market Structure:</strong> Detects Break of Structure (BOS), Change of Character (CHOCH), and Liquidity Sweeps.<br />
                                        <strong>Regime Adaptive:</strong> Automatically switches strategies (Trend Following vs Mean Reversion) based on current volatility state.<br />
                                        <strong>Trap Detection:</strong> Identifies "Bull/Bear Traps" to keep you out of bad trades.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Phase 8: The Hands */}
                        <div className="card">
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'white' }}>3</div>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                        <Target size={24} color="var(--color-accent-primary)" />
                                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>The Hands: Smart Execution</h3>
                                    </div>
                                    <p style={{ lineHeight: '1.6', color: 'var(--color-text-secondary)' }}>
                                        <strong>Iceberg Slicing:</strong> Large orders are split into micro-chunks to hide from HFT bots.<br />
                                        <strong>Limit Chasing:</strong> Standard limits are dynamically updated to "chase" the price if it runs away, ensuring you don't miss the move.<br />
                                        <strong>Slippage Protection:</strong> Market orders are downgraded to limits if the book is too thin.
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
