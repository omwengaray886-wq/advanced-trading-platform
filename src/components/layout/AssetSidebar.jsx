import React, { useState } from 'react';
import { Search } from 'lucide-react';

export const ASSET_REGISTRY = {
    'Crypto': ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'DOT/USDT', 'MATIC/USDT', 'AVAX/USDT', 'LINK/USDT', 'OP/USDT', 'ARB/USDT'],
    'Forex': ['EUR/USD', 'GBP/USD', 'GBP/JPY', 'AUD/USD', 'NZD/USD', 'USD/TRY', 'USD/ZAR', 'USD/MXN', 'USD/BRL', 'USD/RUB'],
    'Metals': ['XAU/USD']
};

export default function AssetSidebar({ selectedPair, onSelectPair, allowAll = false }) {
    const [isSearching, setIsSearching] = useState(false);
    
    // Hardcoded for now, could be passed from props or context
    const recentPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'EUR/USD'];

    return (
        <nav className="asset-sidebar" style={{
            width: '80px',
            background: 'rgba(15, 23, 42, 0.4)',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0',
            gap: '12px',
            overflowY: 'auto',
            scrollbarWidth: 'none',
            flexShrink: 0,
            height: '100%'
        }}>
            {/* SEARCH TRIGGER */}
            <button
                onClick={() => setIsSearching(!isSearching)}
                style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: isSearching ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: isSearching ? 'white' : 'rgba(255,255,255,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    transition: 'all 0.2s'
                }}
            >
                <Search size={20} />
            </button>

            {allowAll && (
                <button
                    onClick={() => onSelectPair('ALL')}
                    title="All Assets"
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: selectedPair === 'ALL' ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.1)',
                        background: selectedPair === 'ALL' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.03)',
                        color: selectedPair === 'ALL' ? 'white' : 'rgba(255,255,255,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        marginBottom: '10px'
                    }}
                >
                    ALL
                </button>
            )}

            {/* RECENT / SEARCHED PAIRS */}
            {!allowAll && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)' }}>REC</div>
                    {recentPairs.slice(0, 5).map(pair => (
                        <button
                            key={pair}
                            onClick={() => onSelectPair(pair)}
                            title={pair}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                border: '1px solid',
                                borderColor: selectedPair === pair ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.1)',
                                background: selectedPair === pair ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.03)',
                                color: selectedPair === pair ? 'white' : 'rgba(255,255,255,0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '9px',
                                fontWeight: 'bold'
                            }}
                        >
                            {pair.split('/')[0].substring(0, 3)}
                        </button>
                    ))}
                </div>
            )}

            <div style={{ width: '30px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />

            {Object.keys(ASSET_REGISTRY).map(cat => (
                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                    <div style={{
                        fontSize: '9px',
                        fontWeight: 'bold',
                        color: 'rgba(255,255,255,0.3)',
                        transform: 'rotate(-90deg)',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {cat.toUpperCase()}
                    </div>
                    {ASSET_REGISTRY[cat].map(pair => (
                        <button
                            key={pair}
                            onClick={() => onSelectPair(pair)}
                            title={pair}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: selectedPair === pair ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.1)',
                                background: selectedPair === pair ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.03)',
                                color: selectedPair === pair ? 'white' : 'rgba(255,255,255,0.6)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                        >
                            {pair.split('/')[0].substring(0, 3)}
                        </button>
                    ))}
                </div>
            ))}
        </nav>
    );
}
