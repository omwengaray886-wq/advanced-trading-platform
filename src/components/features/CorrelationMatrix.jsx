import React, { useState, useEffect } from 'react';
import { correlationService } from '../../services/correlationService';
import { motion } from 'framer-motion';
import { AlertCircle, Activity } from 'lucide-react';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'EURUSDT', 'PAXGUSDT'];

export default function CorrelationMatrix() {
    const [matrix, setMatrix] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatrix = async () => {
            const data = await correlationService.getMatrix(SYMBOLS);
            setMatrix(data);
            setLoading(false);
        };
        fetchMatrix();
        const interval = setInterval(fetchMatrix, 300000); // Update every 5m
        return () => clearInterval(interval);
    }, []);

    const getBgColor = (val) => {
        const abs = Math.abs(val);
        if (val > 0.8) return 'rgba(16, 185, 129, 0.4)'; // High Pos
        if (val < -0.8) return 'rgba(239, 68, 68, 0.4)'; // High Neg
        if (abs > 0.5) return 'rgba(255, 255, 255, 0.1)';
        return 'rgba(255, 255, 255, 0.05)';
    };

    if (loading) return <div className="card" style={{ height: '300px', opacity: 0.5 }}>Loading Correlation Matrix...</div>;

    return (
        <div className="card glass-panel" style={{ padding: '20px' }}>
            <header className="flex-row justify-between items-center" style={{ marginBottom: '20px' }}>
                <div className="flex-row items-center gap-sm">
                    <Activity size={18} color="var(--color-accent-primary)" />
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Systemic Correlation</h3>
                </div>
                {Object.values(matrix).some(row => Object.values(row).some(v => Math.abs(v) > 0.9 && v !== 1)) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b' }}>
                        <AlertCircle size={14} />
                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>High Correlation Risk</span>
                    </div>
                )}
            </header>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}>
                    <thead>
                        <tr>
                            <th></th>
                            {SYMBOLS.map(s => (
                                <th key={s} style={{ fontSize: '10px', color: 'var(--color-text-secondary)', padding: '4px', textAlign: 'center' }}>
                                    {s.replace('USDT', '')}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {SYMBOLS.map(s1 => (
                            <tr key={s1}>
                                <td style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-text-secondary)', padding: '4px' }}>
                                    {s1.replace('USDT', '')}
                                </td>
                                {SYMBOLS.map(s2 => {
                                    const val = matrix[s1][s2];
                                    return (
                                        <motion.td
                                            key={s2}
                                            whileHover={{ scale: 1.1 }}
                                            style={{
                                                background: getBgColor(val),
                                                borderRadius: '4px',
                                                padding: '8px',
                                                textAlign: 'center',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                color: Math.abs(val) > 0.7 ? 'white' : 'var(--color-text-secondary)',
                                                border: Math.abs(val) > 0.9 && s1 !== s2 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                            }}
                                        >
                                            {val.toFixed(2)}
                                        </motion.td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '16px', fontSize: '10px', color: 'var(--color-text-tertiary)', textAlign: 'center' }}>
                Pearson Coefficient (1.0 = Perfect Positive, -1.0 = Inverse)
            </div>
        </div>
    );
}
