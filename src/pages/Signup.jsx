import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Signup() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useAuth();
    const { addToast } = useToast();
    const navigate = useNavigate();

    const handleChange = (field) => (e) => setFormData(prev => ({ ...prev, [field]: e.target.value }));

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) { setError('Please enter your full name.'); return; }
        if (!formData.email.trim()) { setError('Please enter your email address.'); return; }
        if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (formData.password !== formData.confirmPassword) { setError('Passwords do not match.'); return; }

        // Anti-Abuse Layer 1: Local Device Fingerprint Check
        if (localStorage.getItem('_ta_tf_claimed') === 'true') {
            setError('A free trial has already been claimed on this device. Please log in or upgrade to Pro.');
            return;
        }

        try {
            setLoading(true);
            await register(formData.email.trim(), formData.password, formData.name.trim());
            
            // Anti-Abuse Layer 1: Flag the device
            localStorage.setItem('_ta_tf_claimed', 'true');
            
            addToast('Account created! Your 1-day free trial has started.', 'success');
            navigate('/app');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || err.message || 'Registration failed.';
            setError(msg);
        }
        setLoading(false);
    };

    const inputStyle = { paddingLeft: '40px' };
    const iconStyle = { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at 50% 0%, #1a2c4e 0%, #0a0a0f 100%)',
            padding: '24px'
        }}>
            <div style={{ width: '100%', maxWidth: '520px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
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
                        Create your account
                    </h1>
                    <p style={{ color: '#94a3b8' }}>Start with a <strong style={{ color: '#818cf8' }}>free 1-day trial</strong> — no payment required</p>
                </div>

                <div className="card" style={{ padding: '32px' }}>
                    {error && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171', padding: '12px 16px', borderRadius: '8px', fontSize: '14px',
                            marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
                        }}>
                            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                        {/* Name */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: '#e2e8f0' }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={iconStyle} />
                                <input type="text" required className="input" placeholder="John Smith" value={formData.name} onChange={handleChange('name')} style={inputStyle} />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: '#e2e8f0' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={iconStyle} />
                                <input type="email" required className="input" placeholder="your@email.com" value={formData.email} onChange={handleChange('email')} style={inputStyle} />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: '#e2e8f0' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={iconStyle} />
                                <input type="password" required minLength={6} className="input" placeholder="At least 6 characters" value={formData.password} onChange={handleChange('password')} style={inputStyle} />
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: '500', color: '#e2e8f0' }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={iconStyle} />
                                <input type="password" required className="input" placeholder="Re-enter your password" value={formData.confirmPassword} onChange={handleChange('confirmPassword')} style={inputStyle} />
                            </div>
                        </div>

                        {/* Trial Info Banner */}
                        <div style={{
                            background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)',
                            borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#a5b4fc',
                            display: 'flex', alignItems: 'flex-start', gap: '10px'
                        }}>
                            <CheckCircle size={16} color="#818cf8" style={{ flexShrink: 0, marginTop: '1px' }} />
                            <span>You'll get <strong>1 full day of free access</strong> to explore all features. After that, subscribe for $99/month to continue.</span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '13px 24px',
                                background: loading ? '#4f46e5aa' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff', border: 'none', borderRadius: '8px',
                                fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}
                        >
                            {loading ? 'Creating account...' : <><span>Start Free Trial</span><ArrowRight size={18} /></>}
                        </button>
                    </form>

                    <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#818cf8', fontWeight: '600', textDecoration: 'none' }}>Sign in</Link>
                    </div>
                </div>

                <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#475569' }}>
                    By creating an account, you agree to our{' '}
                    <Link to="/terms" style={{ color: '#64748b', textDecoration: 'underline' }}>Terms</Link> and{' '}
                    <Link to="/privacy" style={{ color: '#64748b', textDecoration: 'underline' }}>Privacy Policy</Link>
                </p>
            </div>
        </div>
    );
}
