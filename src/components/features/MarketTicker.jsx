import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function MarketTicker() {
    const [tickers, setTickers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { addToast } = useToast();

    const symbols = ['ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];

    const fetchTickers = async () => {
        try {
            // Fetch 24hr stats for single symbols is safer than bulk for just a few
            // Using Promise.all to fetch in parallel
            const promises = symbols.map(s =>
                fetch(`/api/binance/ticker/24hr?symbol=${s}`).then(r => r.json())
            );

            const results = await Promise.all(promises);
            setTickers(results);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch tickers", error);
        }
    };

    useEffect(() => {
        fetchTickers();
        const interval = setInterval(fetchTickers, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    const handleRowClick = (symbol) => {
        addToast(`Loading chart for ${symbol.replace('USDT', '')}...`, 'info', 2000);
        navigate('/app/markets');
    };

    if (loading) {
        return (
            <div className="card">
                <h3 className="card-title" style={{ marginBottom: '16px' }}>Market Ticker</h3>
                <div className="flex-col gap-sm">
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: '37px', background: 'var(--color-bg-tertiary)', borderRadius: '4px', opacity: 0.5 }}></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title" style={{ marginBottom: '16px' }}>Market Ticker (24h)</h3>
            <div className="flex-col gap-sm">
                {tickers.map(t => {
                    const change = parseFloat(t.priceChangePercent);
                    return (
                        <div
                            key={t.symbol}
                            onClick={() => handleRowClick(t.symbol)}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '8px 0',
                                borderBottom: '1px solid var(--border-color)',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            className="hover:bg-tertiary"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <span style={{ fontWeight: '500' }}>{t.symbol.replace('USDT', '/USDT')}</span>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '14px' }}>${parseFloat(t.lastPrice).toLocaleString()}</div>
                                <span style={{
                                    fontSize: '12px',
                                    color: change >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                                }}>
                                    {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
