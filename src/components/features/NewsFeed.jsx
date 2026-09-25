import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { newsService } from '../../services/newsService';
import { newsShockEngine } from '../../services/newsShockEngine';

export default function NewsFeed() {
    const [news, setNews] = useState([]);
    const [shock, setShock] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNewsData = async () => {
            try {
                // Fetch general market news (using BTC as anchor for broad feed)
                const realNews = await newsService.fetchRealNews('BTC/USDT');
                setNews(realNews.slice(0, 5));

                // Check for active shocks
                const activeShock = await newsShockEngine.getActiveShock('BTC/USDT');
                setShock(activeShock);
            } catch (error) {
                console.error('[NewsFeed] Error fetching news:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNewsData();
        const interval = setInterval(fetchNewsData, 300000); // Refresh every 5 mins
        return () => clearInterval(interval);
    }, []);

    if (loading && news.length === 0) {
        return <div className="card">Loading Market Intelligence...</div>;
    }

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Newspaper size={18} color="var(--color-primary)" />
                    <h3 className="card-title">Live Market News</h3>
                </div>
                <div style={{ width: '8px', height: '8px', background: 'var(--color-success)', borderRadius: '50%', boxShadow: '0 0 5px var(--color-success)' }}></div>
            </div>

            {shock && (
                <div className="news-shock-alert" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#ef4444'
                }}>
                    <AlertTriangle size={20} />
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>NEWS SHOCK DETECTED</div>
                        <div style={{ fontSize: '11px', opacity: 0.9 }}>{shock.message}</div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {news.map((item, index) => (
                    <div key={item.id} className="news-item" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'pointer'
                    }} onClick={() => item.url && window.open(item.url, '_blank')}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.4', margin: 0, flex: 1 }}>{item.title}</h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                    {item.source} • {new Date(item.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <span style={{
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: item.sentiment === 'BULLISH' ? 'var(--color-success)' : 'var(--color-danger)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                {item.sentiment === 'BULLISH' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {item.sentiment}
                            </span>
                        </div>
                        {index !== news.length - 1 && <div style={{ height: '1px', background: 'var(--border-color)', marginTop: '8px' }}></div>}
                    </div>
                ))}
            </div>
        </div>
    );
}
