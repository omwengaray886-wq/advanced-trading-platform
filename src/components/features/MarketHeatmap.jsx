import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { marketData } from '../../services/marketData';

const SECTORS = [
    { title: 'DeFi Highcaps', assets: ['UNIUSDT', 'AAVEUSDT', 'LINKUSDT', 'MKRUSDT'] },
    { title: 'Layer 1s', assets: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADARUSDT', 'AVAXUSDT'] },
    { title: 'Forex Majors', assets: ['EURUSDT', 'GBPUSDT', 'JPYUSDT', 'AUDUSDT'] },
    { title: 'Safe Havens', assets: ['XAUUSDT', 'BTCUSDT'] }
];

export default function MarketHeatmap() {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            const results = {};
            const uniqueAssets = [...new Set(SECTORS.flatMap(s => s.assets))];

            await Promise.all(uniqueAssets.map(async (asset) => {
                try {
                    const history = await marketData.fetchHistory(asset, '1h', 24);
                    if (history && history.length > 1) {
                        const start = history[0].close;
                        const end = history[history.length - 1].close;
                        results[asset] = ((end - start) / start) * 100;
                    }
                } catch (e) { results[asset] = 0; }
            }));

            setStats(results);
            setLoading(false);
        };
        fetchAll();
    }, []);

    const getColor = (val) => {
        if (loading) return 'rgba(255,255,255,0.05)';
        const abs = Math.min(Math.abs(val) * 10, 80); // Scale up for visibility
        if (val >= 0) return `rgba(16, 185, 129, ${abs / 100 + 0.1})`;
        return `rgba(239, 68, 68, ${abs / 100 + 0.1})`;
    };

    return (
        <div className="flex-col gap-md">
            {SECTORS.map((sector, sIdx) => (
                <div key={sIdx} className="flex-col gap-xs">
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>
                        {sector.title}
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '4px' }}>
                        {sector.assets.map((asset, aIdx) => {
                            const val = stats[asset] || 0;
                            return (
                                <motion.div
                                    key={aIdx}
                                    whileHover={{ scale: 1.05 }}
                                    style={{
                                        background: getColor(val),
                                        padding: '10px 4px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        border: '1px solid rgba(255,b255,255,0.05)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{asset.replace('USDT', '')}</div>
                                    <div style={{ fontSize: '9px', opacity: 0.8 }}>
                                        {loading ? '...' : (val >= 0 ? '+' : '') + val.toFixed(2) + '%'}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
