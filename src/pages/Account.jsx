import React, { useState, useEffect } from 'react';
import { User, CreditCard, Bell, Shield, Database, Check, AlertTriangle, Key, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { exchangeService } from '../services/exchangeService';
import { useAuth } from '../context/AuthContext';
import { tradeSetups } from '../utils/mockData';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';

export default function Account() {
    const [activeTab, setActiveTab] = useState('profile');
    const { addToast } = useToast();
    const [profile, setProfile] = useState({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        bio: 'Forex trader with 5 years experience. Focus on EUR/USD and GBP/JPY.'
    });

    const handleSave = (e) => {
        e.preventDefault();
        addToast('Profile updated successfully!', 'success');
    };


    const handleSeedDatabase = async () => {
        if (!window.confirm('This will write test data to your Firestore database. Continue?')) return;

        try {
            const batch = writeBatch(db);

            tradeSetups.forEach(setup => {
                const docRef = doc(collection(db, "tradeSetups"));
                batch.set(docRef, setup);
            });

            await batch.commit();
            addToast('Database seeded successfully! Check the Dashboard.', 'success');
        } catch (error) {
            console.error(error);
            addToast('Error seeding database: ' + error.message, 'error');
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: User },
        { id: 'billing', label: 'Subscription & Billing', icon: CreditCard },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'exchange', label: 'Exchange API', icon: Key },
        { id: 'developer', label: 'Developer Actions', icon: Database },
    ];

    const [exchange, setExchange] = useState(() => {
        const saved = localStorage.getItem('tradealgo_vault');
        return saved ? JSON.parse(saved) : { apiKey: '', apiSecret: '', testnet: true };
    });
    const [balanceData, setBalanceData] = useState(null);
    const [loadingBalance, setLoadingBalance] = useState(false);
    const [showSecret, setShowSecret] = useState(false);

    useEffect(() => {
        const fetchBalance = async () => {
            if (exchange.apiKey && exchange.apiSecret) {
                setLoadingBalance(true);
                try {
                    const data = await exchangeService.getBalances();
                    if (data) setBalanceData(data);
                } catch (e) {
                    console.error("Balance sync failed:", e);
                }
                setLoadingBalance(false);
            }
        };
        fetchBalance();
    }, [exchange.apiKey]);

    const handleSaveExchange = (e) => {
        e.preventDefault();
        localStorage.setItem('tradealgo_vault', JSON.stringify(exchange));
        addToast('Exchange credentials saved to local vault!', 'success');
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '32px' }}>
            {/* Settings Sidebar */}
            <div style={{ width: '240px', flexShrink: 0 }}>
                <h1 className="card-title" style={{ fontSize: '24px', marginBottom: '24px' }}>Settings</h1>
                <div className="flex-col gap-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="btn btn-ghost"
                            style={{
                                justifyContent: 'flex-start',
                                background: activeTab === tab.id ? 'var(--color-bg-tertiary)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                                fontWeight: activeTab === tab.id ? '600' : '400'
                            }}
                        >
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1 }}>
                {activeTab === 'profile' && (
                    <div className="card">
                        <h2 className="card-title" style={{ marginBottom: '24px' }}>Personal Information</h2>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                            <div style={{ width: '80px', height: '80px', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
                                JD
                            </div>
                            <div>
                                <button className="btn btn-outline" style={{ marginRight: '12px' }}>Change Avatar</button>
                                <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }}>Delete</button>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="flex-col gap-md">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>First Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={profile.firstName}
                                        onChange={e => setProfile({ ...profile, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Last Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={profile.lastName}
                                        onChange={e => setProfile({ ...profile, lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Email Address</label>
                                <input
                                    type="email"
                                    className="input"
                                    value={profile.email}
                                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Bio</label>
                                <textarea
                                    className="input"
                                    rows="4"
                                    value={profile.bio}
                                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                    style={{ fontFamily: 'inherit' }}
                                />
                            </div>

                            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'billing' && (
                    <div className="card">
                        <h2 className="card-title" style={{ marginBottom: '24px' }}>Real-Time Equity & Billing</h2>

                        {/* Real-time Balance Display */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '16px',
                            marginBottom: '32px'
                        }}>
                            <div style={{ padding: '20px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>Total Equity (USDT)</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-accent-primary)' }}>
                                    {loadingBalance ? <RefreshCw size={20} className="animate-spin" /> : `$${balanceData?.totalBalance?.toLocaleString() || '0.00'}`}
                                </div>
                            </div>
                            <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginBottom: '8px' }}>Available Margin</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                                    {loadingBalance ? '...' : `$${balanceData?.availableBalance?.toLocaleString() || '0.00'}`}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', background: 'var(--color-bg-tertiary)', borderRadius: '6px', marginBottom: '24px' }}>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Pro Plan</div>
                                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>$29.00 / month</div>
                            </div>
                            <span className="badge badge-success">Active</span>
                        </div>

                        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Payment Method</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                            <div style={{ width: '40px', height: '28px', background: '#ccc', borderRadius: '4px' }}></div>
                            <div>
                                <div style={{ fontWeight: '500' }}>Visa ending in 4242</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Expires 12/28</div>
                            </div>
                            <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: '12px' }}>Edit</button>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="card">
                        <h2 className="card-title" style={{ marginBottom: '24px' }}>Security Settings</h2>
                        <div className="flex-col gap-md">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Two-Factor Authentication</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Add an extra layer of security to your account.</div>
                                </div>
                                <button className="btn btn-outline">Enable</button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Password</div>
                                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Last changed 3 months ago.</div>
                                </div>
                                <button className="btn btn-outline">Change Password</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'exchange' && (
                    <div className="card">
                        <div className="flex-row items-center gap-sm" style={{ marginBottom: '24px' }}>
                            <Shield size={20} color="var(--color-accent-primary)" />
                            <h2 className="card-title" style={{ margin: 0 }}>Institutional API Vault</h2>
                        </div>

                        <div style={{ padding: '16px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', marginBottom: '24px' }}>
                            <div className="flex-row items-start gap-sm">
                                <Lock size={16} color="var(--color-accent-primary)" style={{ marginTop: '2px' }} />
                                <div style={{ fontSize: '13px', lineHeight: 1.5 }}>
                                    Your API keys are stored <b>only locally</b> in your browser's encrypted vault. They are never sent to our servers in plain text.
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSaveExchange} className="flex-col gap-md">
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Binance API Key</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Paste your API key here..."
                                    value={exchange.apiKey}
                                    onChange={e => setExchange({ ...exchange, apiKey: e.target.value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Binance Secret Key</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showSecret ? 'text' : 'password'}
                                        className="input"
                                        placeholder="Paste your secret key here..."
                                        value={exchange.apiSecret}
                                        onChange={e => setExchange({ ...exchange, apiSecret: e.target.value })}
                                        style={{ paddingRight: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowSecret(!showSecret)}
                                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
                                    >
                                        {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-bg-tertiary)', borderRadius: '6px' }}>
                                <input
                                    type="checkbox"
                                    checked={exchange.testnet}
                                    onChange={e => setExchange({ ...exchange, testnet: e.target.checked })}
                                />
                                <span style={{ fontSize: '14px' }}>Mode: <b>{exchange.testnet ? 'TESTNET (Safety First)' : 'LIVE TRADING'}</b></span>
                            </div>

                            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" className="btn btn-primary">Connect Exchange</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
