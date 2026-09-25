import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Target, Shield } from 'lucide-react';
import { marketData } from '../../services/marketData';

export default function ActivePositions() {
    const [positions, setPositions] = useState([
        { id: 1, pair: 'BTCUSDT', type: 'LONG', entry: 95500, sl: 94000, tp: 98000, size: 0.1, status: 'OPEN' },
        { id: 2, pair: 'ETHUSDT', type: 'SHORT', entry: 2350, sl: 2450, tp: 2150, size: 2.0, status: 'OPEN' }
    ]);
    const [prices, setPrices] = useState({});

    useEffect(() => {
        const fetchPrices = async () => {
            const uniquePairs = [...new Set(positions.map(p => p.pair))];
            const newPrices = {};

            await Promise.all(uniquePairs.map(async (pair) => {
                try {
                    const history = await marketData.fetchHistory(pair, '1m', 1);
                    if (history && history.length > 0) {
                        newPrices[pair] = history[0].close;
                    }
                } catch (e) {
                    console.error(`Price fetch failed for ${pair}`);
                }
            }));

            setPrices(newPrices);
        };

        fetchPrices();
        const interval = setInterval(fetchPrices, 10000); // 10s price update
        return () => clearInterval(interval);
    }, [positions]);

    const calculatePnL = (pos) => {
        const currentPrice = prices[pos.pair];
        if (!currentPrice) return 0;

        if (pos.type === 'LONG') {
            return (currentPrice - pos.entry) * pos.size;
        } else {
            return (pos.entry - currentPrice) * pos.size;
        }
    };

    return (
        <div className="flex-col gap-sm">
            <AnimatePresence>
                {positions.map(pos => {
                    const pnl = calculatePnL(pos);
                    const isProfit = pnl >= 0;

                    return (
                        <motion.div
                            key={pos.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="card glass-panel"
                            style={{ padding: '12px', borderLeft: `3px solid ${isProfit ? 'var(--color-success)' : 'var(--color-danger)'}` }}
                        >
                            <div className="flex-row justify-between items-start" style={{ marginBottom: '8px' }}>
                                <div className="flex-col">
                                    <div className="flex-row items-center gap-xs">
                                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{pos.pair}</span>
                                        <span className={`badge ${pos.type === 'LONG' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '9px' }}>
                                            {pos.type}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>Entry: ${pos.entry}</span>
                                </div>
                                <div className="flex-col items-end">
                                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: isProfit ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                        {isProfit ? '+' : ''}${pnl.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '9px', color: 'var(--color-text-tertiary)' }}>
                                        {((pnl / (pos.entry * pos.size)) * 100).toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            <div className="flex-row justify-between" style={{ marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                                <div className="flex-row items-center gap-xs">
                                    <Target size={11} color="var(--color-success)" />
                                    <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>${pos.tp}</span>
                                </div>
                                <div className="flex-row items-center gap-xs">
                                    <Shield size={11} color="var(--color-danger)" />
                                    <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>${pos.sl}</span>
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--color-accent-primary)', fontWeight: 'bold' }}>
                                    {prices[pos.pair] ? `$${prices[pos.pair].toFixed(2)}` : '...'}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
