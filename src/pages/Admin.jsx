import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, ExternalLink, Lock } from 'lucide-react';
import axios from 'axios';

/**
 * Admin Panel — /admin
 * Password-protected (set ADMIN_PASSWORD in your .env on the server)
 * Default password if not set: admin123change
 */
export default function Admin() {
    const [adminPw, setAdminPw] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [authError, setAuthError] = useState('');
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState({});
    const [message, setMessage] = useState('');

    const fetchPayments = useCallback(async () => {
        if (!authenticated) return;
        setLoading(true);
        try {
            const response = await axios.get('/api/admin/payments', {
                headers: { 'x-admin-password': adminPw }
            });
            setPayments(response.data.payments || []);
        } catch (err) {
            setMessage('❌ Failed to load payments: ' + (err.response?.data?.error || err.message));
        }
        setLoading(false);
    }, [authenticated, adminPw]);

    useEffect(() => {
        if (authenticated) fetchPayments();
    }, [authenticated, fetchPayments]);

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!adminPw.trim()) { setAuthError('Enter the admin password'); return; }
        setLoading(true);
        try {
            // Real server verification — will 403 if password is wrong
            await axios.get('/api/admin/payments', {
                headers: { 'x-admin-password': adminPw }
            });
            setAuthenticated(true);
            setAuthError('');
        } catch (err) {
            setAuthError(err.response?.data?.error || 'Invalid admin password');
            setAuthenticated(false);
        }
        setLoading(false);
    };

    const handleApprove = async (payment) => {
        setActionLoading(prev => ({ ...prev, [payment.paymentId]: 'approving' }));
        try {
            await axios.post(`/api/admin/approve/${payment.userId}`, { paymentId: payment.paymentId }, {
                headers: { 'x-admin-password': adminPw }
            });
            setMessage(`✅ Approved: ${payment.email}`);
            await fetchPayments();
        } catch (err) {
            setMessage('❌ Approval failed: ' + (err.response?.data?.error || err.message));
        }
        setActionLoading(prev => ({ ...prev, [payment.paymentId]: null }));
    };

    const handleReject = async (payment) => {
        if (!window.confirm(`Reject payment from ${payment.email}?`)) return;
        setActionLoading(prev => ({ ...prev, [payment.paymentId]: 'rejecting' }));
        try {
            await axios.post(`/api/admin/reject/${payment.paymentId}`, {}, {
                headers: { 'x-admin-password': adminPw }
            });
            setMessage(`❌ Rejected payment from ${payment.email}`);
            await fetchPayments();
        } catch (err) {
            setMessage('❌ Rejection failed: ' + (err.response?.data?.error || err.message));
        }
        setActionLoading(prev => ({ ...prev, [payment.paymentId]: null }));
    };

    const statusBadge = (status) => {
        const colors = { pending: '#fbbf24', approved: '#4ade80', rejected: '#f87171' };
        const icons = { pending: <Clock size={12} />, approved: <CheckCircle size={12} />, rejected: <XCircle size={12} /> };
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: `${colors[status]}22`, color: colors[status],
                border: `1px solid ${colors[status]}55`, padding: '3px 10px',
                borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize'
            }}>
                {icons[status]} {status}
            </span>
        );
    };

    // Login wall
    if (!authenticated) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', padding: '24px' }}>
                <div style={{ width: '100%', maxWidth: '380px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '32px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'rgba(239, 68, 68, 0.15)', border: '2px solid #ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                            <Lock size={22} color="#ef4444" />
                        </div>
                        <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>Admin Access</h1>
                        <p style={{ color: '#64748b', fontSize: '13px' }}>Restricted — authorized personnel only</p>
                    </div>
                    {authError && <div style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px', textAlign: 'center' }}>{authError}</div>}
                    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <input
                            type="password"
                            className="input"
                            placeholder="Admin password"
                            value={adminPw}
                            onChange={e => setAdminPw(e.target.value)}
                            autoComplete="current-password"
                        />
                        <button type="submit" style={{ padding: '11px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                            Enter Admin Panel
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const pending = payments.filter(p => p.status === 'pending');
    const others = payments.filter(p => p.status !== 'pending');

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: '32px', color: '#fff' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Admin — Payment Review</h1>
                        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                            Approve or reject USDT payment submissions
                        </p>
                    </div>
                    <button onClick={fetchPayments} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                {message && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#94a3b8' }}>
                        {message}
                        <button onClick={() => setMessage('')} style={{ float: 'right', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>✕</button>
                    </div>
                )}

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
                    {[
                        { label: 'Pending Review', value: payments.filter(p => p.status === 'pending').length, color: '#fbbf24' },
                        { label: 'Approved', value: payments.filter(p => p.status === 'approved').length, color: '#4ade80' },
                        { label: 'Rejected', value: payments.filter(p => p.status === 'rejected').length, color: '#f87171' }
                    ].map(({ label, value, color }) => (
                        <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color }}>{value}</div>
                            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>{label}</div>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>Loading payments...</div>
                ) : payments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        No payment submissions yet.
                    </div>
                ) : (
                    <>
                        {/* Pending Table */}
                        {pending.length > 0 && (
                            <div style={{ marginBottom: '32px' }}>
                                <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#fbbf24' }}>
                                    🕐 Pending Review ({pending.length})
                                </h2>
                                <PaymentTable payments={pending} onApprove={handleApprove} onReject={handleReject} actionLoading={actionLoading} statusBadge={statusBadge} showActions={true} />
                            </div>
                        )}

                        {/* History Table */}
                        {others.length > 0 && (
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#64748b' }}>
                                    History ({others.length})
                                </h2>
                                <PaymentTable payments={others} onApprove={handleApprove} onReject={handleReject} actionLoading={actionLoading} statusBadge={statusBadge} showActions={false} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function PaymentTable({ payments, onApprove, onReject, actionLoading, statusBadge, showActions }) {
    const tdStyle = { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px', color: '#94a3b8', verticalAlign: 'middle' };
    const thStyle = { padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.08)' };

    return (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>User</th>
                        <th style={thStyle}>Amount</th>
                        <th style={thStyle}>TX Hash</th>
                        <th style={thStyle}>Submitted</th>
                        <th style={thStyle}>Status</th>
                        {showActions && <th style={thStyle}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {payments.map((p) => (
                        <tr key={p.paymentId || p.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={tdStyle}>
                                <div style={{ fontWeight: '500', color: '#e2e8f0' }}>{p.email}</div>
                                <div style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>{p.userId?.slice(0, 12)}...</div>
                            </td>
                            <td style={tdStyle}>
                                <span style={{ color: '#4ade80', fontWeight: '600' }}>{p.amount} {p.currency?.split(' ')[0] || 'USDT'}</span>
                            </td>
                            <td style={tdStyle}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#818cf8' }}>
                                        {p.txHash?.slice(0, 16)}...
                                    </span>
                                    <a href={`https://tronscan.org/#/transaction/${p.txHash}`} target="_blank" rel="noreferrer" title="View on TronScan" style={{ color: '#475569' }}>
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            </td>
                            <td style={tdStyle}>
                                <span style={{ fontSize: '13px' }}>{new Date(p.submittedAt).toLocaleDateString()}</span>
                                <div style={{ fontSize: '11px', color: '#475569' }}>{new Date(p.submittedAt).toLocaleTimeString()}</div>
                            </td>
                            <td style={tdStyle}>{statusBadge(p.status)}</td>
                            {showActions && (
                                <td style={tdStyle}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => onApprove(p)}
                                            disabled={!!actionLoading[p.paymentId]}
                                            style={{ padding: '6px 14px', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            {actionLoading[p.paymentId] === 'approving' ? '...' : <><CheckCircle size={13} /> Approve</>}
                                        </button>
                                        <button
                                            onClick={() => onReject(p)}
                                            disabled={!!actionLoading[p.paymentId]}
                                            style={{ padding: '6px 14px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            {actionLoading[p.paymentId] === 'rejecting' ? '...' : <><XCircle size={13} /> Reject</>}
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
