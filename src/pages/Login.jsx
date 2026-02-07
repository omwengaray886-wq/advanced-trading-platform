import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';
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

        try {
            setError('');
            setLoading(true);
            await login(email, password);
            addToast('Welcome back! Session restored.', 'success');
            navigate('/app');
        } catch (err) {
            console.error(err);
            setError('Failed to log in. Please check your credentials.');
            addToast('Login failed. Please check your credentials.', 'error');
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--color-accent-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Lock color="white" size={24} />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Welcome Back</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Sign in to access your institutional dashboard.</p>
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
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Email Address</label>
                        <input
                            type="email"
                            required
                            className="input"
                            placeholder="name@firm.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Password</label>
                            <a href="#" style={{ fontSize: '12px', color: 'var(--color-accent-primary)' }}>Forgot password?</a>
                        </div>
                        <input
                            type="password"
                            required
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '44px', fontSize: '16px', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Signing In...' : 'Sign In'} {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    Don't have an account? <Link to="/signup" style={{ color: 'var(--color-accent-primary)', fontWeight: '600' }}>Start your trial</Link>
                </div>
            </div>
        </div>
    );
}
