import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signup } = useAuth();
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await signup(formData.email, formData.password, formData.firstName, formData.lastName);
            navigate('/app');
        } catch (err) {
            console.error(err);
            // Simplify error message for user
            setError(err.message.replace('Firebase: ', ''));
        }
        setLoading(false);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
            <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Create Account</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Join 1,200+ traders using institutional analytics.</p>
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

                <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>First Name</label>
                            <input
                                type="text"
                                required
                                className="input"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Last Name</label>
                            <input
                                type="text"
                                required
                                className="input"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Email Address</label>
                        <input
                            type="email"
                            required
                            className="input"
                            placeholder="name@firm.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>Password</label>
                        <input
                            type="password"
                            required
                            minLength="6"
                            className="input"
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)', padding: '12px', borderRadius: '4px' }}>
                        <ShieldCheck size={16} color="var(--color-success)" style={{ flexShrink: 0 }} />
                        <span>
                            Your data is encrypted. We never trade against you. By signing up, you agree to our <a href="#" style={{ textDecoration: 'underline' }}>Terms</a>.
                        </span>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ height: '44px', fontSize: '16px', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Creating Account...' : 'Start 14-Day Free Trial'} {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--color-accent-primary)', fontWeight: '600' }}>Sign in</Link>
                </div>
            </div>
        </div>
    );
}
