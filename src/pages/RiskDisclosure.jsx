import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function RiskDisclosure() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <AlertTriangle size={40} color="var(--color-danger)" />
                <h1 style={{ fontSize: '32px', margin: 0 }}>Risk Disclosure</h1>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>Last Updated: January 29, 2026</p>

            <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid var(--color-danger)', borderRadius: '8px', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px', color: 'var(--color-danger)' }}>⚠️ WARNING: High Risk Activity</h2>
                <p style={{ lineHeight: '1.6', fontWeight: 'bold' }}>
                    Trading foreign exchange, cryptocurrencies, and other financial instruments involves substantial risk of loss and is not suitable for all investors.
                    You could lose more than your initial investment.
                </p>
            </div>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>1. Platform Purpose</h2>
                <p style={{ lineHeight: '1.6' }}>
                    TradeAlgo is an <strong>educational and analytical tool</strong> that provides AI-generated market analysis and technical patterns.
                    It is designed to help you learn about market analysis techniques and understand technical approaches to trading.
                </p>
                <p style={{ lineHeight: '1.6', marginTop: '12px', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                    TradeAlgo does NOT provide financial advice, investment recommendations, or trading signals that should be followed blindly.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>2. No Guarantees of Accuracy</h2>
                <p style={{ lineHeight: '1.6' }}>
                    While our AI is trained on extensive market data, we make no guarantees regarding:
                </p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>Accuracy of analysis or predictions</li>
                    <li>Completeness of information provided</li>
                    <li>Timeliness of market data</li>
                    <li>Success rate of suggested patterns or setups</li>
                </ul>
                <p style={{ lineHeight: '1.6', marginTop: '12px' }}>
                    Market conditions change rapidly. Analysis that was valid minutes ago may no longer be relevant.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>3. Past Performance ≠ Future Results</h2>
                <p style={{ lineHeight: '1.6' }}>
                    Any historical performance statistics, backtesting results, or past setup outcomes displayed on the Platform are
                    <strong> not indicative of future performance</strong>. Markets are unpredictable and constantly evolving.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>4. Trading Risks</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>You should be aware of the following risks:</p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li><strong>Leverage Risk:</strong> Leveraged trading can amplify both gains and losses</li>
                    <li><strong>Volatility Risk:</strong> Markets can move rapidly against your position</li>
                    <li><strong>Liquidity Risk:</strong> You may not be able to exit positions at desired prices</li>
                    <li><strong>Technical Risk:</strong> Platform outages or connectivity issues</li>
                    <li><strong>Regulatory Risk:</strong> Changes in laws affecting trading</li>
                    <li><strong>Counterparty Risk:</strong> Broker or exchange failure</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>5. Your Responsibility</h2>
                <p style={{ lineHeight: '1.6' }}>
                    By using TradeAlgo, you acknowledge that:
                </p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>All trading decisions are made at your own discretion and risk</li>
                    <li>You should conduct your own research and due diligence</li>
                    <li>You should only trade with money you can afford to lose</li>
                    <li>You should seek independent financial advice if needed</li>
                    <li>You understand the markets and instruments you are trading</li>
                    <li>You are solely responsible for any losses incurred</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>6. AI Limitations</h2>
                <p style={{ lineHeight: '1.6' }}>
                    Our AI analysis has inherent limitations:
                </p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>Cannot predict unexpected market events (news, geopolitics, etc.)</li>
                    <li>Based on historical patterns that may not repeat</li>
                    <li>May generate false signals or miss opportunities</li>
                    <li>Subject to technical errors or bugs</li>
                    <li>Requires human judgment for proper context</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>7. Not Investment Advice</h2>
                <p style={{ lineHeight: '1.6', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                    TradeAlgo and its employees are not licensed financial advisors, brokers, or investment advisors.
                    Nothing on this Platform constitutes professional investment advice, a recommendation, or an endorsement to buy or sell any security or instrument.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>8. Regulatory Status</h2>
                <p style={{ lineHeight: '1.6' }}>
                    TradeAlgo is an educational technology platform. We are not a regulated financial institution, broker, or investment advisor.
                    You are responsible for ensuring your trading activities comply with your local laws and regulations.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>9. Emotional and Financial Well-being</h2>
                <p style={{ lineHeight: '1.6' }}>
                    Trading can be stressful and emotionally challenging. Never trade if:
                </p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>You are under financial pressure</li>
                    <li>You cannot afford to lose the capital</li>
                    <li>You are experiencing emotional distress</li>
                    <li>You feel compelled to "chase losses"</li>
                </ul>
            </section>

            <div style={{ marginTop: '48px', padding: '20px', background: 'var(--color-bg-tertiary)', borderRadius: '8px', border: '2px solid var(--color-danger)' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '12px', color: 'var(--color-danger)' }}>Final Warning</h3>
                <p style={{ lineHeight: '1.6', fontWeight: 'bold' }}>
                    By using TradeAlgo, you acknowledge that you have read and understood this Risk Disclosure, and you accept full responsibility for your trading decisions and any resulting losses.
                </p>
                <p style={{ lineHeight: '1.6', marginTop: '12px', fontSize: '14px' }}>
                    If you do not accept these risks, you should not use this Platform or engage in trading.
                </p>
            </div>
        </div>
    );
}
