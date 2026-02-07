import React, { useEffect, useState, useRef } from 'react';
import { marketData } from '../../services/marketData';
import { LiquidityMapService } from '../../services/LiquidityMapService';

const DOMWidget = ({ symbol = 'BTCUSDT' }) => {
    const [depth, setDepth] = useState({ bids: [], asks: [] });
    const [lastPrice, setLastPrice] = useState(0);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        // Initial Snapshot
        const loadSnapshot = async () => {
            const data = await marketData.fetchOrderBook(symbol, 20); // Top 20 levels
            if (data) {
                const maps = LiquidityMapService.generateMap(data);
                updateState(maps);
                // Assume mid-price roughly
                if (data.bids[0] && data.asks[0]) {
                    setLastPrice((data.bids[0].price + data.asks[0].price) / 2);
                }
                setConnected(true);
            }
        };

        loadSnapshot();

        // Subscribe to Live Updates
        const unsubscribe = marketData.subscribeToDepth(symbol, (data) => {
            const maps = LiquidityMapService.generateMap(data);
            updateState(maps);
            setConnected(true);
        });

        return () => {
            unsubscribe();
        };
    }, [symbol]);

    const updateState = (maps) => {
        const bids = maps.filter(m => m.side === 'BID').sort((a, b) => b.price - a.price).slice(0, 15);
        const asks = maps.filter(m => m.side === 'ASK').sort((a, b) => a.price - b.price).slice(0, 15);
        setDepth({ bids, asks });
    };

    return (
        <div style={{
            padding: '16px',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'monospace',
            fontSize: '11px',
            color: 'white'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px' }}>MARKET DEPTH</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#10b981' : '#ef4444' }} />
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{connected ? 'STABLE' : 'OFFLINE'}</span>
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Asks (Sell Walls) - Top */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', justifyContent: 'end', gap: '2px' }}>
                    {depth.asks.slice().reverse().map((ask, i) => (
                        <div key={`ask-${i}`} style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', height: '20px', alignItems: 'center' }}>
                            {/* Volume Bar */}
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    width: `${ask.intensity * 100}%`,
                                    transition: 'width 0.3s ease'
                                }}
                            />
                            <span style={{ position: 'relative', zIndex: 1, color: '#ef4444', fontWeight: 'bold' }}>{ask.price.toFixed(2)}</span>
                            <span style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.5)' }}>{ask.volume.toFixed(4)}</span>
                        </div>
                    ))}
                </div>

                {/* Spread / Current Price Indicator */}
                <div style={{
                    margin: '8px 0',
                    padding: '4px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    textAlign: 'center',
                    color: 'white',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontWeight: 'bold',
                    fontSize: '12px'
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: '8px', fontWeight: 'normal' }}>SPREAD</span>
                    {Math.abs(depth.asks[0]?.price - depth.bids[0]?.price).toFixed(2) || '0.00'}
                </div>

                {/* Bids (Buy Walls) - Bottom */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {depth.bids.map((bid, i) => (
                        <div key={`bid-${i}`} style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', height: '20px', alignItems: 'center' }}>
                            {/* Volume Bar */}
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    bottom: 0,
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    width: `${bid.intensity * 100}%`,
                                    transition: 'width 0.3s ease'
                                }}
                            />
                            <span style={{ position: 'relative', zIndex: 1, color: '#10b981', fontWeight: 'bold' }}>{bid.price.toFixed(2)}</span>
                            <span style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.5)' }}>{bid.volume.toFixed(4)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {!connected && <div style={{ textAlign: 'center', color: '#ef4444', marginTop: '12px', fontSize: '10px' }}>ESTABLISHING BINANCE FEED...</div>}
        </div>
    );
};

export default DOMWidget;
