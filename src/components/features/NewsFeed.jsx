import React from 'react';
import { Newspaper, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

const news = [
    { id: 1, title: 'Bitcoin reclaims $85k as ETF inflows surge to record highs', source: 'CoinDesk', time: '10m ago', sentiment: 'BULLISH' },
    { id: 2, title: 'SEC delays decision on Ethereum Spot ETF application', source: 'Reuters', time: '45m ago', sentiment: 'BEARISH' },
    { id: 3, title: 'Solana network activity spikes ahead of major upgrade', source: 'The Block', time: '2h ago', sentiment: 'BULLISH' },
    { id: 4, title: 'Tech stocks slide ahead of earnings reports', source: 'Bloomberg', time: '3h ago', sentiment: 'BEARISH' },
];

export default function NewsFeed() {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Newspaper size={18} color="var(--color-primary)" />
                    <h3 className="card-title">Live Market News</h3>
                </div>
                <div style={{ width: '8px', height: '8px', background: 'var(--color-success)', borderRadius: '50%', boxShadow: '0 0 5px var(--color-success)' }}></div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {news.map((item, index) => (
                    <div key={item.id} className="news-item" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        cursor: 'pointer'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.4', margin: 0, flex: 1 }}>{item.title}</h4>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{item.source} • {item.time}</span>
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
