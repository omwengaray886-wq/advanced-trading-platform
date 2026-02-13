import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { verifyToken } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!token.trim()) {
            setError('Please enter your Access Key.');
            return;
        }

        try {
            setError('');
            setLoading(true);
            await verifyToken(token.trim());
            addToast('Access Granted. Welcome back.', 'success');
            navigate('/app');
        } catch (err) {
            console.error(err);
            setError('Invalid Access Key. Access Denied.');
            addToast('Authentication failed.', 'error');
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--color-accent-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Key color="white" size={24} />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Restricted Access</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Enter your Signed Access Token to proceed.</p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--color-danger)',
                        color: 'var(--color-danger)',
                        padding: '12px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Access Key</label>
                        <textarea
                            required
                            className="input"
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            style={{
                                minHeight: '120px',
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '44px', fontSize: '16px', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Verifying...' : 'Authenticate'} {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <Lock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    This system is for authorized personnel only. All access attempts are logged.
                </div>
            </div>
        </div>
    );
}
