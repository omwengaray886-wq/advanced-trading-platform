import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Target, Shield, Zap, Send, Info, AlertTriangle } from 'lucide-react';
import { exchangeService } from '../../services/exchangeService';
import { autonomousExecutionService } from '../../services/autonomousExecutionService';
import { riskManagementService } from '../../services/riskManagementService';
import { useToast } from '../../context/ToastContext';

export default function TradeExecution({ symbol, currentPrice, riskData, analysis, candles }) {
    const [orderType, setOrderType] = useState('MARKET');
    const [side, setSide] = useState('BUY');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [executing, setExecuting] = useState(false);
    const [autoRisk, setAutoRisk] = useState(true);
    const { addToast } = useToast();

    // Hazards check (Phase 38)
    const hazards = analysis?.marketState?.hazards || [];
    const isLocked = hazards.some(h => h.severity === 'HIGH');

    // Auto-fill quantity if riskData (from RiskCalculator) is provided
    useEffect(() => {
        if (riskData?.suggestedSize) {
            setQuantity(riskData.suggestedSize);
        }
    }, [riskData]);

    const handleSubmit = async () => {
        if (!quantity && !autoRisk) return addToast('Please enter quantity', 'warning');

        setExecuting(true);
        try {
            if (autoRisk && analysis?.setups?.[0]) {
                // Autonomous OCO Execution (Phase 38)
                const setup = analysis.setups[0];
                const account = { equity: 10000 }; // Fetch real equity in prod

                await autonomousExecutionService.executeOneClickTrade(
                    { ...setup, symbol },
                    account,
                    candles
                );
                addToast('Autonomous OCO Transmitted', 'success');
            } else {
                // Manual Order
                const order = {
                    symbol: symbol.replace('/', '').toUpperCase(),
                    side,
                    type: orderType,
                    quantity: parseFloat(quantity)
                };

                if (orderType === 'LIMIT') {
                    if (!price) throw new Error('Price required for limit orders');
                    order.price = parseFloat(price);
                }

                const result = await exchangeService.placeOrder(order);
                addToast(`Order Executed! ID: ${result.orderId}`, 'success');
            }
        } catch (error) {
            addToast(`Execution Failed: ${error.msg || error.message}`, 'error');
        }
        setExecuting(false);
    };

    return (
        <div className="card glass-panel" style={{ padding: '20px' }}>
            <div className="flex-row justify-between items-center" style={{ marginBottom: '20px' }}>
                <div className="flex-row items-center gap-xs">
                    <Send size={18} color="var(--color-accent-primary)" />
                    <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Execution Engine</h3>
                </div>
                <div className="flex-row gap-xs" style={{ background: 'var(--color-bg-tertiary)', padding: '2px', borderRadius: '4px' }}>
                    {['BUY', 'SELL'].map(s => (
                        <button
                            key={s}
                            onClick={() => setSide(s)}
                            className={`btn btn-xs ${side === s ? (s === 'BUY' ? 'btn-success' : 'btn-danger') : 'btn-ghost'}`}
                            style={{ minWidth: '60px' }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-col gap-md">
                <div className="flex-row gap-sm">
                    {['MARKET', 'LIMIT'].map(t => (
                        <button
                            key={t}
                            onClick={() => setOrderType(t)}
                            className={`btn btn-xs ${orderType === t ? 'btn-primary' : 'btn-outline'}`}
                            style={{ flex: 1 }}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(29, 185, 84, 0.05)', borderRadius: '8px', border: '1px solid rgba(29, 185, 84, 0.1)' }}>
                    <div className="flex-col">
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>AUTO-RISK PROTECTION</span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Auto-size & OCO Protection</span>
                    </div>
                    <button
                        onClick={() => setAutoRisk(!autoRisk)}
                        className={`btn btn-xs ${autoRisk ? 'btn-success' : 'btn-outline'}`}
                        style={{ minWidth: '80px' }}
                    >
                        {autoRisk ? 'ACTIVE' : 'OFF'}
                    </button>
                </div>

                {hazards.length > 0 && (
                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div className="flex-row items-center justify-between mb-xs">
                            <div className="flex-row items-center gap-xs">
                                <AlertTriangle size={14} color="var(--color-danger)" />
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-danger)' }}>EXECUTION HAZARDS</span>
                            </div>
                            {hazards.find(h => h.type === 'NEWS_SHOCK_RISK') && (
                                <div style={{ fontSize: '10px', background: 'var(--color-danger)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                                    NEWS SHOCK
                                </div>
                            )}
                        </div>
                        {hazards.map((h, i) => (
                            <div key={i} style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>• {h.message}</span>
                                {h.type === 'NEWS_SHOCK_RISK' && <span style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}>LOCK ENGAGED</span>}
                            </div>
                        ))}
                    </div>
                )}

                {!autoRisk && (
                    <>
                        <div className="flex-col gap-xs">
                            <label style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Quantity ({symbol.split('/')[0]})</label>
                            <input
                                type="number"
                                className="input"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        {orderType === 'LIMIT' && (
                            <div className="flex-col gap-xs">
                                <label style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Limit Price (USDT)</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={price}
                                    onChange={e => setPrice(e.target.value)}
                                    placeholder={currentPrice?.toFixed(2)}
                                />
                            </div>
                        )}
                    </>
                )}

                <div style={{ padding: '12px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '6px', fontSize: '12px' }}>
                    <div className="flex-row justify-between">
                        <span style={{ color: 'var(--color-text-tertiary)' }}>{autoRisk ? 'Estimated Risk:' : 'Estimated Cost:'}</span>
                        <span style={{ fontWeight: 'bold' }}>
                            {autoRisk ? '$100.00 (1%)' : `$${((parseFloat(quantity) || 0) * (orderType === 'LIMIT' ? parseFloat(price) : currentPrice) || 0).toFixed(2)}`}
                        </span>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={executing || isLocked}
                    className={`btn ${side === 'BUY' ? 'btn-primary' : 'btn-danger'}`}
                    style={{ marginTop: '8px', padding: '12px' }}
                >
                    {executing ? 'TRANSMITTING...' : isLocked ? 'SAFETY LOCK ACTIVE' : `SEND ${side} ORDER`}
                </button>
            </div>

            <div className="flex-row items-center justify-between" style={{ marginTop: '16px', opacity: 0.6 }}>
                <div className="flex-row items-center gap-xs">
                    <Shield size={12} />
                    <span style={{ fontSize: '10px' }}>Institutional Grade Protection</span>
                </div>
                {autoRisk && <Zap size={12} color="var(--color-success)" />}
            </div>
        </div>
    );
}
