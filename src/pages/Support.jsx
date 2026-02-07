import React, { useState } from 'react';
import { Mail, MessageCircle, Send } from 'lucide-react';
import Footer from '../components/layout/Footer';
import { useToast } from '../context/ToastContext';

export default function Support() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate form submission
        setTimeout(() => {
            addToast('Support request sent! We\'ll respond within 24 hours.', 'success');
            setFormData({ name: '', email: '', subject: '', message: '' });
            setLoading(false);
        }, 1000);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>TradeAlgo</h1>
                <div className="flex-row gap-md">
                    <a href="/" className="btn btn-ghost">Home</a>
                    <a href="/pricing" className="btn btn-ghost">Pricing</a>
                    <a href="/login" className="btn btn-primary">Login</a>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px 20px' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '40px', marginBottom: '16px', textAlign: 'center' }}>Get in Touch</h1>
                    <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', marginBottom: '48px', textAlign: 'center' }}>
                        Have a question or need assistance? We're here to help.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '48px' }}>
                        {/* Contact Options */}
                        <div className="card">
                            <Mail size={32} color="var(--color-accent-primary)" style={{ marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Email Support</h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
                                Get a response within 24 hours
                            </p>
                            <a href="mailto:support@tradealgo.com" style={{ color: 'var(--color-accent-primary)', textDecoration: 'none', fontWeight: '500' }}>
                                support@tradealgo.com
                            </a>
                        </div>

                        <div className="card">
                            <MessageCircle size={32} color="var(--color-accent-primary)" style={{ marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>FAQ</h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '12px', fontSize: '14px' }}>
                                Find instant answers to common questions
                            </p>
                            <a href="/faq" className="btn btn-ghost" style={{ padding: '8px 16px' }}>
                                Visit FAQ
                            </a>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>Send us a Message</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="input"
                                    style={{ width: '100%' }}
                                    placeholder="Your name"
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="input"
                                    style={{ width: '100%' }}
                                    placeholder="your.email@example.com"
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label htmlFor="subject" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                    Subject *
                                </label>
                                <select
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="input"
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Select a topic</option>
                                    <option value="technical">Technical Issue</option>
                                    <option value="billing">Billing Question</option>
                                    <option value="feature">Feature Request</option>
                                    <option value="general">General Inquiry</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label htmlFor="message" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                                    Message *
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    className="input"
                                    style={{ width: '100%', minHeight: '150px', resize: 'vertical' }}
                                    placeholder="Tell us how we can help..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {loading ? 'Sending...' : (
                                    <>
                                        <Send size={18} />
                                        Send Message
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div style={{ marginTop: '48px', padding: '20px', background: 'var(--color-bg-tertiary)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                            <strong>Response Time:</strong> We typically respond to all inquiries within 24 hours during business days.
                            For urgent issues, please mark your subject accordingly.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
