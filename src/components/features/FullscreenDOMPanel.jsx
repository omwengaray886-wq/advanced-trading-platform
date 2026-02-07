import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * DOM (Depth of Market) Panel for fullscreen chart
 */
export default function DOMPanel({ symbol, currentPrice }) {
    // Mock DOM data - in production, this would come from WebSocket
    const mockDOM = {
        asks: [
            { price: currentPrice * 1.003, volume: 45000, total: 45000 },
            { price: currentPrice * 1.002, volume: 32000, total: 77000 },
            { price: currentPrice * 1.001, volume: 28000, total: 105000 },
        ],
        bids: [
            { price: currentPrice * 0.999, volume: 35000, total: 35000 },
            { price: currentPrice * 0.998, volume: 42000, total: 77000 },
            { price: currentPrice * 0.997, volume: 38000, total: 115000 },
        ]
    };

    const maxVolume = Math.max(
        ...mockDOM.asks.map(a => a.volume),
        ...mockDOM.bids.map(b => b.volume)
    );

    return (
        <div style={{
            background: 'rgba(0,0,0,0.4)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '16px'
        }}>
            <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: 'rgba(255,255,255,0.7)',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <span>ORDER BOOK</span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{symbol}</span>
            </div>

            {/* Asks (Sell orders) */}
            <div style={{ marginBottom: '12px' }}>
                {mockDOM.asks.slice().reverse().map((ask, i) => {
                    const volumePercent = (ask.volume / maxVolume) * 100;
                    return (
                        <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            fontSize: '11px',
                            padding: '4px 6px',
                            position: 'relative',
                            marginBottom: '2px'
                        }}>
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: `${volumePercent}%`,
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '2px'
                            }} />
                            <span style={{ color: '#ef4444', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                                {ask.price.toFixed(2)}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'right', position: 'relative', zIndex: 1 }}>
                                {ask.volume.toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Spread */}
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '8px',
                borderRadius: '6px',
                textAlign: 'center',
                marginBottom: '12px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.6)'
            }}>
                SPREAD: {((mockDOM.asks[mockDOM.asks.length - 1].price - mockDOM.bids[0].price) / currentPrice * 100).toFixed(3)}%
            </div>

            {/* Bids (Buy orders) */}
            <div>
                {mockDOM.bids.map((bid, i) => {
                    const volumePercent = (bid.volume / maxVolume) * 100;
                    return (
                        <div key={i} style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            fontSize: '11px',
                            padding: '4px 6px',
                            position: 'relative',
                            marginBottom: '2px'
                        }}>
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 0,
                                bottom: 0,
                                width: `${volumePercent}%`,
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '2px'
                            }} />
                            <span style={{ color: '#10b981', fontWeight: 'bold', position: 'relative', zIndex: 1 }}>
                                {bid.price.toFixed(2)}
                            </span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'right', position: 'relative', zIndex: 1 }}>
                                {bid.volume.toLocaleString()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
