import React, { useState, useEffect } from 'react';
import TradeSetupCard from '../components/features/TradeSetupCard';
import SetupDetailView from '../components/features/SetupDetailView';
import { subscribeToTradeSetups } from '../services/db';
import { Filter, RefreshCw, Zap } from 'lucide-react';

export default function TradeSetups() {
    const [setups, setSetups] = useState([]);
    const [selectedSetup, setSelectedSetup] = useState(null);
    const [filter, setFilter] = useState('ALL'); // ALL, ACTIVE, PENDING, INVALIDATED
    const [isScalperMode, setIsScalperMode] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToTradeSetups((data) => {
            setSetups(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredSetups = setups.filter(s => {
        // 1. Status Filter
        if (filter !== 'ALL' && s.status !== filter) return false;

        // 2. Scalper Mode Filter
        if (isScalperMode) {
            return ['1m', '5m', '15m'].includes(s.timeframe) || s.strategy === 'SCALPER_ENGINE';
        }

        // Default: Hide 1m/5m noise unless in Scalper Mode? No, show all.
        return true;
    }).sort((a, b) => {
        // Sort urgency
        if (isScalperMode) return b.timestamp - a.timestamp; // Newest first for scalping
        return b.confidence - a.confidence; // Highest confidence for swing
    });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 className="card-title" style={{ fontSize: '24px', marginBottom: '8px' }}>Trade Signals</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        AI-generated trade opportunities based on market analysis
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`btn ${isScalperMode ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setIsScalperMode(!isScalperMode)}
                        style={{ display: 'flex', gap: '8px', alignItems: 'center', borderColor: isScalperMode ? 'var(--color-accent)' : '' }}
                    >
                        <Zap size={16} fill={isScalperMode ? "currentColor" : "none"} />
                        {isScalperMode ? "Scalper Mode ON" : "Scalper Mode"}
                    </button>
                    <button className="btn btn-outline" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Controls */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {['ALL', 'ACTIVE', 'PENDING', 'INVALIDATED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`btn ${filter === status ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '12px' }}
                    >
                        {status}
                        <span style={{
                            marginLeft: '6px',
                            background: filter === status ? 'rgba(255,255,255,0.2)' : 'var(--color-bg-tertiary)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px'
                        }}>
                            {status === 'ALL' ? setups.length : setups.filter(s => s.status === status).length}
                        </span>
                    </button>
                ))}
            </div>

            {/* Setups Grid */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className="card" style={{ height: '300px', background: 'var(--color-bg-tertiary)', opacity: 0.5 }}></div>
                    ))}
                </div>
            ) : filteredSetups.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
                    {filteredSetups.map(setup => (
                        <TradeSetupCard
                            key={setup.id}
                            setup={setup}
                            onClick={setSelectedSetup}
                        />
                    ))}
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <Filter size={48} color="var(--color-text-tertiary)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>No {filter.toLowerCase()} setups found</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        Try selecting a different filter or wait for new signals.
                    </p>
                </div>
            )}

            {/* Detail View Modal */}
            <SetupDetailView
                setup={selectedSetup}
                onClose={() => setSelectedSetup(null)}
            />
        </div>
    );
}
