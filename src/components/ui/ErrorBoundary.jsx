import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: '100vh',
                    width: '100vw',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--color-bg-primary)',
                    color: 'var(--color-text-primary)'
                }}>
                    <div className="card" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <AlertTriangle size={32} color="var(--color-danger)" />
                        </div>

                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Something went wrong</h1>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
                            Success is not final, failure is not fatal. But this error is annoying. We've logged it.
                        </p>

                        <div style={{ background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '4px', marginBottom: '32px', textAlign: 'left', fontSize: '12px', fontFamily: 'monospace', overflow: 'auto' }}>
                            {this.state.error?.toString()}
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => window.location.reload()}
                            style={{ margin: '0 auto' }}
                        >
                            <RefreshCw size={18} style={{ marginRight: '8px' }} />
                            Reload Platform
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
