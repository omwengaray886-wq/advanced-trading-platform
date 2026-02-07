import React from 'react';
import './TrapZoneWarning.css';

/**
 * Trap Zone Warning Component
 * Displays detected failure patterns and trap zones
 */
const TrapZoneWarning = ({ trapZones }) => {
    if (!trapZones || trapZones.count === 0) {
        return null;
    }

    const { count, bullTraps, bearTraps, warning } = trapZones;

    return (
        <div className="trap-zone-warning">
            <div className="warning-header">
                <span className="warning-icon">⚠️</span>
                <h3>Trap Zone Alert</h3>
                <span className="trap-count">{count} pattern{count !== 1 ? 's' : ''}</span>
            </div>

            {warning && (
                <div className="warning-message">{warning}</div>
            )}

            {bullTraps && bullTraps.length > 0 && (
                <div className="trap-section">
                    <div className="trap-section-header bull-trap">
                        🐂 Bull Traps ({bullTraps.length})
                    </div>
                    <div className="trap-list">
                        {bullTraps.map((trap, index) => (
                            <div key={index} className="trap-item bull-trap-item">
                                <div className="trap-header">
                                    <span className="trap-type">{trap.type.replace(/_/g, ' ')}</span>
                                    <span className="trap-confidence">{Math.round(trap.confidence * 100)}%</span>
                                </div>
                                <div className="trap-location">
                                    @ {trap.location.toFixed(5)}
                                </div>
                                <div className="trap-reason">{trap.reason}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {bearTraps && bearTraps.length > 0 && (
                <div className="trap-section">
                    <div className="trap-section-header bear-trap">
                        🐻 Bear Traps ({bearTraps.length})
                    </div>
                    <div className="trap-list">
                        {bearTraps.map((trap, index) => (
                            <div key={index} className="trap-item bear-trap-item">
                                <div className="trap-header">
                                    <span className="trap-type">{trap.type.replace(/_/g, ' ')}</span>
                                    <span className="trap-confidence">{Math.round(trap.confidence * 100)}%</span>
                                </div>
                                <div className="trap-location">
                                    @ {trap.location.toFixed(5)}
                                </div>
                                <div className="trap-reason">{trap.reason}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrapZoneWarning;
