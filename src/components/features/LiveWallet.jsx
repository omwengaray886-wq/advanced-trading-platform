import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { exchangeService } from '../../services/exchangeService';

export default function LiveWallet() {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastSync, setLastSync] = useState(null);

    const fetchBalance = async () => {
        setLoading(true);
        const data = await exchangeService.getBalances();
        if (data) {
            // Calculate Total Equity in USDT
            const usdtAsset = data.balances.find(b => b.asset === 'USDT');
            setBalance({
                totalEquity: usdtAsset ? parseFloat(usdtAsset.free) + parseFloat(usdtAsset.locked) : 0,
                available: usdtAsset ? parseFloat(usdtAsset.free) : 0,
                assets: data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
            });
            setLastSync(new Date());
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBalance();
        const interval = setInterval(fetchBalance, 30000); // Sync every 30s
        return () => clearInterval(interval);
    }, []);

    if (!balance && !loading) return null;

    return (
        <div className="card glass-panel" style={{ padding: '24px' }}>
            <div className="flex-row justify-between items-center" style={{ marginBottom: '20px' }}>
                <div className="flex-row items-center gap-md">
                    <Wallet size={20} color="var(--color-accent-primary)" />
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Live Margin Hub</h2>
                </div>
                <button
                    onClick={fetchBalance}
                    className={`btn btn-ghost btn-xs ${loading ? 'animate-spin' : ''}`}
                    style={{ color: 'var(--color-text-tertiary)' }}
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Total Equity</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-accent-primary)' }}>
                        ${balance?.totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Available Margin</div>
                    <div style={{ fontSize: '24px', fontWeight: '900' }}>
                        ${balance?.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            <div className="flex-col gap-sm">
                <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Asset Allocation</h3>
                <div className="flex-col gap-xs">
                    {balance?.assets.slice(0, 3).map(asset => (
                        <div key={asset.asset} className="flex-row justify-between items-center" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>{asset.asset}</span>
                            <span style={{ fontSize: '12px' }}>{(parseFloat(asset.free) + parseFloat(asset.locked)).toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {lastSync && (
                <div style={{ marginTop: '16px', fontSize: '10px', color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
                    Institutional Sync: {lastSync.toLocaleTimeString()}
                </div>
            )}
        </div>
    );
}
