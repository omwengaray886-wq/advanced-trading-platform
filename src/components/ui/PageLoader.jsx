import React from 'react';

export const PageLoader = () => (
    <div style={{
        height: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
    }}>
        <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--color-bg-tertiary)',
            borderTop: '3px solid var(--color-accent-primary)',
            borderRadius: '50%',
        }}></div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', animation: 'pulse 1.5s infinite' }}>Loading Market Data...</p>
        <style>{`
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .spinner {
                animation: spin 1s linear infinite;
            }
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `}</style>
    </div>
);
