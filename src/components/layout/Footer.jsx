import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer style={{
            background: 'var(--color-bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            padding: '32px 24px',
            marginTop: 'auto'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginBottom: '24px' }}>
                    {/* Brand */}
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>TradeAlgo</h3>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                            AI-powered market analysis for informed trading decisions.
                        </p>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Legal</h4>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: '8px' }}>
                                <Link to="/terms" style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                                    Terms & Conditions
                                </Link>
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                <Link to="/privacy" style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                                    Privacy Policy
                                </Link>
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                <Link to="/risk-disclosure" style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                                    Risk Disclosure
                                </Link>
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                <Link to="/refund" style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                                    Refund Policy
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>Company</h4>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            <li style={{ marginBottom: '8px' }}>
                                <Link to="/pricing" style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                                    Pricing
                                </Link>
                            </li>
                            <li style={{ marginBottom: '8px' }}>
                                <a href="mailto:support@tradealgo.com" style={{ color: 'var(--color-text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                        © 2026 TradeAlgo. All rights reserved.
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--color-danger)', margin: 0, fontWeight: '500' }}>
                        ⚠️ Not financial advice. Trading involves risk of loss.
                    </p>
                </div>
            </div>
        </footer>
    );
}
