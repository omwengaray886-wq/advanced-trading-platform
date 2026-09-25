import React, { useState, useEffect } from 'react';
import { strategyPerformanceTracker } from '../../services/StrategyPerformanceTracker';
import './AlphaMonitor.css';

/**
 * Alpha Monitor (Phase 15)
 * Displays real-time performance and dynamic weighting for core strategies.
 */
const AlphaMonitor = () => {
    const [weights, setWeights] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeights = async () => {
            try {
                const liveWeights = await strategyPerformanceTracker.constructor.getAllStrategyWeights();
                setWeights(liveWeights);
            } catch (error) {
                console.error('[AlphaMonitor] Error fetching weights:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchWeights();
        const interval = setInterval(fetchWeights, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    const getStatusInfo = (multiplier) => {
        if (multiplier > 1.2) return { label: 'HOT', color: 'var(--success)', icon: '🔥' };
        if (multiplier < 0.8) return { label: 'COLD', color: 'var(--danger)', icon: '❄️' };
        return { label: 'NEUTRAL', color: 'var(--text-secondary)', icon: '⚖️' };
    };

    if (loading) return <div className="alpha-monitor-loading">Loading Performance Data...</div>;

    return (
        <div className="alpha-monitor">
            <div className="alpha-monitor-header">
                <h3>Tactical Alpha Intelligence</h3>
                <span className="live-badge">AUTONOMOUS LEARNING ACTIVE</span>
            </div>

            <div className="alpha-strategies-grid">
                {Object.entries(weights).map(([name, data]) => {
                    const status = getStatusInfo(data.multiplier);
                    return (
                        <div key={name} className={`strategy-stat-card status-${status.label.toLowerCase()}`}>
                            <div className="strategy-info">
                                <span className="strategy-name">{name}</span>
                                <div className="strategy-status" style={{ color: status.color }}>
                                    {status.icon} {status.label}
                                </div>
                            </div>

                            <div className="strategy-metrics">
                                <div className="metric">
                                    <span className="label">Weight</span>
                                    <span className="value">x{data.multiplier.toFixed(2)}</span>
                                </div>
                                <div className="metric">
                                    <span className="label">Win Rate</span>
                                    <span className="value">{(data.winRate * 100).toFixed(0)}%</span>
                                </div>
                                <div className="metric">
                                    <span className="label">Streak</span>
                                    <span className="value" style={{ color: data.streak > 0 ? 'var(--success)' : data.streak < 0 ? 'var(--danger)' : 'inherit' }}>
                                        {data.streak > 0 ? `+${data.streak}` : data.streak}
                                    </span>
                                </div>
                            </div>

                            <div className="weight-bar-container">
                                <div
                                    className="weight-bar"
                                    style={{
                                        width: `${(data.multiplier / 1.5) * 100}%`,
                                        background: status.color
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="alpha-monitor-footer">
                <p>Multipliers adjust dynamically based on the last 20 institutional setups.</p>
            </div>
        </div>
    );
};

export default AlphaMonitor;
