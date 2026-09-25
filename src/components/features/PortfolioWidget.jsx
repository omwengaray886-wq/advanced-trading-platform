import React, { useState } from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, List, History, XCircle, RefreshCw, DollarSign } from 'lucide-react';

export default function PortfolioWidget({ symbol }) {
    const { balances, openOrders, loading, refresh, cancelOrder } = usePortfolio(symbol);
    const [activeTab, setActiveTab] = useState('BALANCES'); // BALANCES | ORDERS

    return (
        <div className="card glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-row justify-between items-center" style={{ marginBottom: '16px' }}>
                <div className="flex-row gap-xs">
                    <button
                        onClick={() => setActiveTab('BALANCES')}
                        className={`btn btn-xs ${activeTab === 'BALANCES' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <Wallet size={14} style={{ marginRight: '4px' }} /> Balances
                    </button>
                    <button
                        onClick={() => setActiveTab('ORDERS')}
                        className={`btn btn-xs ${activeTab === 'ORDERS' ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <List size={14} style={{ marginRight: '4px' }} /> Orders ({openOrders.length})
                    </button>
                </div>
                <button onClick={refresh} className="btn btn-icon btn-ghost">
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'BALANCES' ? (
                        <motion.div
                            key="balances"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex-col gap-sm"
                        >
                            {balances.length === 0 ? (
                                <div className="text-center text-secondary" style={{ padding: '20px', fontSize: '12px' }}>
                                    No active balances found.
                                </div>
                            ) : (
                                balances.map(asset => (
                                    <div key={asset.asset} className="flex-row justify-between items-center p-sm card-sub">
                                        <div className="flex-row items-center gap-sm">
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                                {asset.asset[0]}
                                            </div>
                                            <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{asset.asset}</span>
                                        </div>
                                        <div className="flex-col items-end">
                                            <span style={{ fontSize: '13px' }}>{parseFloat(asset.free).toFixed(4)}</span>
                                            {parseFloat(asset.locked) > 0 && (
                                                <span style={{ fontSize: '10px', color: 'var(--color-warning)' }}>
                                                    Locked: {parseFloat(asset.locked).toFixed(4)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="orders"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex-col gap-sm"
                        >
                            {openOrders.length === 0 ? (
                                <div className="text-center text-secondary" style={{ padding: '20px', fontSize: '12px' }}>
                                    No open orders for {symbol || 'this asset'}.
                                </div>
                            ) : (
                                openOrders.map(order => (
                                    <div key={order.orderId} className="card-sub p-sm flex-col gap-xs" style={{ borderLeft: `3px solid ${order.side === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                                        <div className="flex-row justify-between items-center">
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: order.side === 'BUY' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                {order.side} {order.type}
                                            </span>
                                            <span style={{ fontSize: '10px', opacity: 0.6 }}>{new Date(order.time).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="flex-row justify-between items-center">
                                            <span style={{ fontSize: '13px' }}>{parseFloat(order.origQty).toFixed(4)} @ {parseFloat(order.price).toFixed(2)}</span>
                                            <button
                                                onClick={() => cancelOrder(order.orderId)}
                                                className="btn btn-xs btn-danger-outline"
                                                style={{ padding: '2px 8px' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
