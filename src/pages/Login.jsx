import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError('Please enter your email and password.');
            return;
        }
        try {
            setError('');
            setLoading(true);
            await login(email.trim(), password);
            addToast('Welcome back! Access granted.', 'success');
            navigate('/app');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.message || 'Login failed.';
            setError(msg);
            addToast('Authentication failed.', 'error');
        }
        setLoading(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 0%, #1a2c4e 0%, #0a0a0f 100%)',
            padding: '24px'
        }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: '52px', height: '52px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
                        <TrendingUp color="white" size={26} />
                    </div>
                    <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>
                        Sign in to TradeAlgo
                    </h1>
                    <p style={{ color: '#94a3b8' }}>Enter your credentials to access your account</p>
                </div>

                <div className="card" style={{ padding: '32px' }}>
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: '#e2e8f0' }}>
                                Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <input
                                    type="email"
                                    required
                                    className="input"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: '#e2e8f0' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <input
                                    type="password"
                                    required
                                    className="input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '12px 24px',
                                background: loading ? '#4f46e5aa' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff', border: 'none', borderRadius: '8px',
                                fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight size={18} /></>}
                        </button>
                    </form>

                    <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                        Don't have an account?{' '}
                        <Link to="/signup" style={{ color: '#818cf8', fontWeight: '600', textDecoration: 'none' }}>
                            Start your free trial
                        </Link>
                    </div>
                </div>

                <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#475569' }}>
                    By signing in, you agree to our{' '}
                    <Link to="/terms" style={{ color: '#64748b', textDecoration: 'underline' }}>Terms</Link>
                    {' '}and{' '}
                    <Link to="/privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>Privacy Policy</Link>
                </p>
            </div>
        </div>
    );
}
