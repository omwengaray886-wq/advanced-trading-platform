import React, { useState, useEffect } from 'react';
import { Calculator, RefreshCw, TrendingUp, Shield, AlertTriangle } from 'lucide-react';
import { marketData } from '../services/marketData';
import { riskManagementService } from '../services/riskManagementService';
import { exchangeService } from '../services/exchangeService';

export default function RiskCalculator() {
    const [balance, setBalance] = useState(10000);
    const [useLiveBalance, setUseLiveBalance] = useState(false);
    const [riskPercent, setRiskPercent] = useState(1);
    const [stopLoss, setStopLoss] = useState(20);
    const [pair, setPair] = useState('BTCUSDT');
    const [livePrice, setLivePrice] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [liveEquity, setLiveEquity] = useState(null);

    useEffect(() => {
        const fetchMarketData = async () => {
            setLoadingPrice(true);
            try {
                // 1. Fetch Price
                const history = await marketData.fetchHistory(pair, '1m', 1);
                if (history && history.length > 0) {
                    setLivePrice(history[history.length - 1].close);
                }

                // 2. Fetch Live Equity if Vault is present
                const account = await exchangeService.getBalances();
                if (account?.totalBalance) {
                    setLiveEquity(account.totalBalance);
                }
            } catch (error) {
                console.error("Failed to fetch data for calculator:", error);
            }
            setLoadingPrice(false);
        };

        fetchMarketData();
        const interval = setInterval(fetchMarketData, 30000);
        return () => clearInterval(interval);
    }, [pair]);

    const calculateSize = () => {
        const activeEquity = useLiveBalance && liveEquity ? liveEquity : balance;

        // Use central risk service for calculation
        // Stop loss in calculator is usually pips or price distance
        // Let's derive stopPrice based on entry (livePrice)
        if (!livePrice) return "0.00";

        const isForex = !pair.includes('USDT') && !pair.includes('BTC');
        const stopPrice = isForex ?
            livePrice - (stopLoss * (pair.includes('JPY') ? 0.01 : 0.0001)) :
            livePrice - (livePrice * (stopLoss / 100));

        const size = riskManagementService.calculatePositionSize(
            activeEquity,
            livePrice,
            stopPrice,
            pair
        );

        return size;
    };

    const getUnitLabel = () => {
        if (pair.includes('USDT')) return 'Units';
        return 'Lots';
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h1 className="card-title" style={{ fontSize: '24px', marginBottom: '24px' }}>Position Size Calculator</h1>

            <div className="card">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                    <div className="flex-col gap-sm">
                        <div className="flex-row justify-between items-center">
                            <label style={{ fontSize: '14px', fontWeight: '500' }}>Account Balance ($)</label>
                            {liveEquity && (
                                <button
                                    onClick={() => setUseLiveBalance(!useLiveBalance)}
                                    style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: useLiveBalance ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                        color: useLiveBalance ? 'var(--color-success)' : 'var(--color-text-tertiary)',
                                        border: '1px solid currentColor',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {useLiveBalance ? 'LIVE' : 'MANUAL'}
                                </button>
                            )}
                        </div>
                        <input
                            type="number"
                            className="input"
                            disabled={useLiveBalance && !!liveEquity}
                            value={useLiveBalance && liveEquity ? liveEquity : balance}
                            onChange={e => setBalance(parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="flex-col gap-sm">
                        <label style={{ fontSize: '14px', fontWeight: '500' }}>Risk Percentage (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={riskPercent}
                            onChange={e => setRiskPercent(parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="flex-col gap-sm">
                        <label style={{ fontSize: '14px', fontWeight: '500' }}>Stop Loss (Pips/%)</label>
                        <input
                            type="number"
                            className="input"
                            value={stopLoss}
                            onChange={e => setStopLoss(parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="flex-col gap-sm">
                        <label style={{ fontSize: '14px', fontWeight: '500' }}>Instrument</label>
                        <select className="input" value={pair} onChange={e => setPair(e.target.value)}>
                            <option value="EURUSD">EUR/USD</option>
                            <option value="GBPUSD">GBP/USD</option>
                            <option value="BTCUSDT">Bitcoin (BTC/USDT)</option>
                            <option value="ETHUSDT">Ethereum (ETH/USDT)</option>
                            <option value="SOLUSDT">Solana (SOL/USDT)</option>
                            <option value="XAUUSD">GOLD (XAU)</option>
                        </select>
                    </div>
                </div>

                {livePrice && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                        marginBottom: '24px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={14} color="var(--color-success)" />
                            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Live Price:</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-success)' }}>
                            ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                )}

                <div style={{ background: 'var(--color-bg-tertiary)', padding: '24px', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Recommended Position Size</p>
                    <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--color-accent-primary)' }}>
                        {calculateSize()} <span style={{ fontSize: '24px' }}>{getUnitLabel()}</span>
                    </div>
                    <p style={{ fontSize: '14px', marginTop: '16px' }}>
                        Risk Amount: <span style={{ color: 'var(--color-danger)' }}>${(balance * (riskPercent / 100)).toFixed(2)}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
