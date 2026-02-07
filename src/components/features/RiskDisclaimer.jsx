import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RiskDisclaimer({ variant = 'compact' }) {
    if (variant === 'compact') {
        return (
            <div style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--color-danger)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <AlertTriangle size={20} color="var(--color-danger)" />
                <p style={{ fontSize: '12px', lineHeight: '1.4', margin: 0 }}>
                    <strong>Risk Warning:</strong> Trading involves substantial risk of loss.
                    This is not financial advice. See our <Link to="/risk-disclosure" style={{ color: 'var(--color-danger)', textDecoration: 'underline' }}>Risk Disclosure</Link>.
                </p>
            </div>
        );
    }

    if (variant === 'banner') {
        return (
            <div style={{
                padding: '8px 16px',
                background: 'var(--color-danger)',
                color: 'white',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '500'
            }}>
                ⚠️ Trading involves substantial risk. Not financial advice. Educational purposes only.
            </div>
        );
    }

    return null;
}
