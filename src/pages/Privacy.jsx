import React from 'react';

export default function Privacy() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Privacy Policy</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>Last Updated: January 29, 2026</p>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>1. Information We Collect</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>We collect the following types of information:</p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li><strong>Account Information:</strong> Email address, name, and password</li>
                    <li><strong>Payment Information:</strong> Processed securely through Paystack (we do not store card details)</li>
                    <li><strong>Usage Data:</strong> Platform interactions, features used, analysis generated</li>
                    <li><strong>Technical Data:</strong> IP address, browser type, device information, session data</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>2. How We Use Your Information</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>Your information is used to:</p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>Provide and maintain the Platform</li>
                    <li>Process payments and manage subscriptions</li>
                    <li>Send important updates and notifications</li>
                    <li>Improve our AI algorithms and user experience</li>
                    <li>Detect and prevent fraud or abuse</li>
                    <li>Comply with legal obligations</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>3. Data Storage and Security</h2>
                <p style={{ lineHeight: '1.6' }}>
                    Your data is stored securely using Firebase Authentication and Firestore Database with industry-standard encryption.
                    We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, or destruction.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>4. Data Sharing</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>We do not sell your personal information. We may share data with:</p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li><strong>Payment Processors:</strong> Paystack for payment processing</li>
                    <li><strong>AI Services:</strong> Google Gemini for analysis generation (anonymized)</li>
                    <li><strong>Analytics:</strong> Anonymous usage statistics for platform improvement</li>
                    <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>5. Your Rights</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>You have the right to:</p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>Access your personal data</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Export your data</li>
                    <li>Withdraw consent</li>
                    <li>Object to data processing</li>
                </ul>
                <p style={{ lineHeight: '1.6', marginTop: '12px' }}>
                    To exercise these rights, contact us at <a href="mailto:privacy@tradealgo.com" style={{ color: 'var(--color-accent-primary)' }}>privacy@tradealgo.com</a>
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>6. Cookies and Tracking</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We use essential cookies for authentication and session management. We do not use third-party advertising cookies.
                    You can control cookies through your browser settings.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>7. Data Retention</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We retain your personal data for as long as your account is active or as needed to provide services.
                    Upon account deletion, we will remove or anonymize your data within 30 days, except where retention is required by law.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>8. Children's Privacy</h2>
                <p style={{ lineHeight: '1.6' }}>
                    The Platform is not intended for users under 18 years of age. We do not knowingly collect personal information from children.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>9. International Data Transfers</h2>
                <p style={{ lineHeight: '1.6' }}>
                    Your data may be transferred to and processed in countries other than your country of residence.
                    We ensure appropriate safeguards are in place for such transfers.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>10. Changes to Privacy Policy</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform notification.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>11. Contact Us</h2>
                <p style={{ lineHeight: '1.6' }}>
                    For privacy-related questions or concerns, contact our Data Protection Officer at:
                    <a href="mailto:privacy@tradealgo.com" style={{ color: 'var(--color-accent-primary)' }}> privacy@tradealgo.com</a>
                </p>
            </section>

            <div style={{ marginTop: '48px', padding: '16px', background: 'var(--color-bg-tertiary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                    Your privacy is important to us. By using TradeAlgo, you consent to the collection and use of information in accordance with this Privacy Policy.
                </p>
            </div>
        </div>
    );
}
