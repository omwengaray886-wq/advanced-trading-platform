import React from 'react';

export default function Terms() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Terms and Conditions</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>Last Updated: January 29, 2026</p>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
                <p style={{ lineHeight: '1.6' }}>
                    By accessing and using TradeAlgo ("the Platform"), you accept and agree to be bound by the terms and provision of this agreement.
                    If you do not agree to these terms, you should not use this Platform.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>2. Description of Service</h2>
                <p style={{ lineHeight: '1.6' }}>
                    TradeAlgo provides AI-powered market analysis and educational content for financial markets including Forex, Cryptocurrencies, and Indices.
                    The Platform generates analytical insights, technical patterns, and educational materials.
                </p>
                <p style={{ lineHeight: '1.6', marginTop: '12px', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                    IMPORTANT: All analysis and content provided are for educational and informational purposes only.
                    This is NOT financial advice, investment recommendations, or trading signals.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>3. User Responsibilities</h2>
                <p style={{ lineHeight: '1.6' }}>You agree to:</p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>Provide accurate registration information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Use the Platform only for lawful purposes</li>
                    <li>Not share your account with others</li>
                    <li>Conduct your own due diligence before making any trading decisions</li>
                    <li>Understand that trading involves substantial risk of loss</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>4. Subscription and Payments</h2>
                <p style={{ lineHeight: '1.6' }}>
                    Subscription fees are billed in advance on a monthly or annual basis. You authorize us to charge your payment method for all fees.
                    Subscriptions auto-renew unless cancelled before the renewal date. See our Refund Policy for cancellation terms.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>5. Intellectual Property</h2>
                <p style={{ lineHeight: '1.6' }}>
                    All content, features, and functionality of the Platform, including but not limited to AI algorithms, analysis methods,
                    educational content, and design, are owned by TradeAlgo and protected by international copyright and intellectual property laws.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>6. Limitation of Liability</h2>
                <p style={{ lineHeight: '1.6', fontWeight: 'bold', color: 'var(--color-danger)' }}>
                    TradeAlgo shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the Platform,
                    including but not limited to trading losses, lost profits, or loss of data.
                </p>
                <p style={{ lineHeight: '1.6', marginTop: '12px' }}>
                    You acknowledge that all trading decisions are made at your own risk and discretion.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>7. No Guarantees</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We make no guarantees regarding the accuracy, completeness, or timeliness of the analysis provided.
                    Past performance does not guarantee future results. Market conditions change rapidly and unpredictably.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>8. Termination</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We reserve the right to suspend or terminate your access to the Platform at any time, with or without notice,
                    for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>9. Changes to Terms</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We reserve the right to modify these Terms at any time. We will notify users of material changes via email or platform notification.
                    Continued use of the Platform after changes constitutes acceptance of the modified Terms.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>10. Contact Information</h2>
                <p style={{ lineHeight: '1.6' }}>
                    For questions about these Terms, please contact us at: <a href="mailto:legal@tradealgo.com" style={{ color: 'var(--color-accent-primary)' }}>legal@tradealgo.com</a>
                </p>
            </section>

            <div style={{ marginTop: '48px', padding: '16px', background: 'var(--color-bg-tertiary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                    By using TradeAlgo, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                </p>
            </div>
        </div>
    );
}
