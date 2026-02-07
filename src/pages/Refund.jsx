import React from 'react';

export default function Refund() {
    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Refund Policy</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>Last Updated: January 29, 2026</p>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>1. Subscription Cancellation</h2>
                <p style={{ lineHeight: '1.6' }}>
                    You may cancel your subscription at any time through your Account settings. Upon cancellation:
                </p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>You will retain access to paid features until the end of your current billing period</li>
                    <li>No further charges will be made after the current period ends</li>
                    <li>Your account will automatically revert to the Free tier</li>
                    <li>No prorated refunds will be issued for the remaining days in the billing period</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>2. 7-Day Money-Back Guarantee (First-Time Subscribers Only)</h2>
                <p style={{ lineHeight: '1.6' }}>
                    If you are subscribing for the first time, you are eligible for a full refund within 7 days of your initial payment if:
                </p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>This is your first subscription to any paid tier</li>
                    <li>You request the refund within 7 calendar days of the initial charge</li>
                    <li>You contact support at <a href="mailto:refunds@tradealgo.com" style={{ color: 'var(--color-accent-primary)' }}>refunds@tradealgo.com</a> with your refund request</li>
                </ul>
                <p style={{ lineHeight: '1.6', marginTop: '12px', fontWeight: 'bold' }}>
                    Note: This guarantee applies only once per user and only to your first subscription. Renewals, upgrades, and re-subscriptions are not eligible.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>3. Refund Process</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>To request a refund under the 7-day guarantee:</p>
                <ol style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>Email <a href="mailto:refunds@tradealgo.com" style={{ color: 'var(--color-accent-primary)' }}>refunds@tradealgo.com</a> with your account email and order reference</li>
                    <li>State your reason for requesting a refund (feedback helps us improve)</li>
                    <li>Our team will process your request within 3-5 business days</li>
                    <li>Refunds will be issued to the original payment method within 7-10 business days</li>
                </ol>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>4. Non-Refundable Situations</h2>
                <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>Refunds will NOT be issued in the following cases:</p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>Subscription renewals (automatic or manual)</li>
                    <li>Upgrade charges from one tier to another</li>
                    <li>Requests made after the 7-day guarantee period</li>
                    <li>Users who have previously received a refund</li>
                    <li>Account suspensions due to Terms of Service violations</li>
                    <li>Trading losses or poor market performance</li>
                    <li>Dissatisfaction with AI analysis accuracy (not guaranteed)</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>5. Annual Subscriptions</h2>
                <p style={{ lineHeight: '1.6' }}>
                    Annual subscriptions are billed as a single payment for 12 months. The 7-day money-back guarantee applies to first-time annual subscribers.
                    After the 7-day period, no refunds will be issued, but you may cancel to prevent auto-renewal for the next year.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>6. Downgrades</h2>
                <p style={{ lineHeight: '1.6' }}>
                    If you downgrade from a higher tier to a lower tier, the change will take effect at the end of your current billing period.
                    No partial refunds will be issued for the difference in price.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>7. Service Interruptions</h2>
                <p style={{ lineHeight: '1.6' }}>
                    In the event of extended service outages or platform unavailability (more than 48 consecutive hours),
                    we may offer prorated credits or refunds at our discretion. This does not apply to:
                </p>
                <ul style={{ marginLeft: '24px', lineHeight: '1.8' }}>
                    <li>Scheduled maintenance (with advance notice)</li>
                    <li>Issues caused by third-party services (payment processors, hosting providers)</li>
                    <li>Force majeure events</li>
                </ul>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>8. Chargebacks</h2>
                <p style={{ lineHeight: '1.6' }}>
                    If you initiate a chargeback without first contacting our support team, your account may be immediately suspended pending investigation.
                    We encourage you to contact us first to resolve any billing disputes.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>9. Changes to Refund Policy</h2>
                <p style={{ lineHeight: '1.6' }}>
                    We reserve the right to modify this Refund Policy at any time. Changes will not affect refund eligibility for subscriptions purchased before the change date.
                </p>
            </section>

            <section style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>10. Contact for Refund Requests</h2>
                <p style={{ lineHeight: '1.6' }}>
                    For all refund-related inquiries, please contact: <a href="mailto:refunds@tradealgo.com" style={{ color: 'var(--color-accent-primary)' }}>refunds@tradealgo.com</a>
                </p>
                <p style={{ lineHeight: '1.6', marginTop: '12px' }}>
                    Please allow 3-5 business days for a response.
                </p>
            </section>

            <div style={{ marginTop: '48px', padding: '16px', background: 'var(--color-bg-tertiary)', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', lineHeight: '1.6', fontWeight: 'bold' }}>
                    Summary: First-time subscribers have 7 days to request a full refund. After that, cancellations stop future billing but do not refund the current period.
                </p>
            </div>
        </div>
    );
}
