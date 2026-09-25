import React from 'react';
import './RegimeTransitionIndicator.css';

/**
 * Regime Transition Indicator
 * Displays early warnings of regime changes with probability scoring
 */
const RegimeTransitionIndicator = ({ regimeTransition }) => {
    if (!regimeTransition || regimeTransition.probability < 30) {
        return null; // Only show if transition probability is significant
    }

    const { probability, expectedRegime, triggers, confidence } = regimeTransition;

    const getProbabilityColor = (prob) => {
        if (prob >= 70) return '#ff4466';  // High probability = warning red
        if (prob >= 50) return '#ffaa00';  // Medium probability = caution yellow
        return '#4a9eff';                   // Low probability = info blue
    };

    const getRegimeIcon = (regime) => {
        switch (regime) {
            case 'TRENDING': return '📈';
            case 'RANGING': return '📊';
            case 'TRANSITIONAL': return '🔄';
            default: return '❓';
        }
    };

    const probabilityColor = getProbabilityColor(probability);
    const regimeIcon = getRegimeIcon(expectedRegime);

    return (
        <div className="regime-transition-indicator" style={{ borderColor: probabilityColor }}>
            <div className="transition-header">
                <span className="transition-icon">⚡</span>
                <h3>Regime Shift Alert</h3>
                <span className="probability-badge" style={{
                    backgroundColor: `${probabilityColor}20`,
                    color: probabilityColor,
                    borderColor: probabilityColor
                }}>
                    {probability}% Probability
                </span>
            </div>

            <div className="regime-change">
                <div className="regime-label">Expected Regime</div>
                <div className="regime-value">
                    <span className="regime-icon-large">{regimeIcon}</span>
                    <span className="regime-name" style={{ color: probabilityColor }}>
                        {expectedRegime}
                    </span>
                </div>
            </div>

            {triggers && triggers.length > 0 && (
                <div className="triggers-section">
                    <div className="triggers-header">Detected Signals</div>
                    <div className="triggers-list">
                        {triggers.map((trigger, index) => (
                            <div key={index} className="trigger-item">
                                <span className="trigger-dot">•</span>
                                <span className="trigger-text">{trigger}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="confidence-bar">
                <div className="confidence-label">
                    Confidence: {Math.round(confidence * 100)}%
                </div>
                <div className="bar-container">
                    <div
                        className="bar-fill"
                        style={{
                            width: `${confidence * 100}%`,
                            backgroundColor: probabilityColor
                        }}
                    />
                </div>
            </div>

            {probability >= 70 && (
                <div className="action-message">
                    ⚠️ Market regime shift highly probable. Monitor closely for confirmation.
                </div>
            )}
        </div>
    );
};

export default RegimeTransitionIndicator;
