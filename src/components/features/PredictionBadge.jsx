import React from 'react';
import './PredictionBadge.css';

/**
 * Prediction Badge Component
 * Displays the dominant market bias with confidence score
 */
const PredictionBadge = ({ prediction }) => {
    if (!prediction || prediction.bias === 'NO_EDGE') {
        return (
            <div className="prediction-badge no-edge">
                <div className="badge-header">
                    <span className="badge-icon">⚠️</span>
                    <span className="badge-title">NO CLEAR EDGE</span>
                </div>
                <div className="badge-reason">{prediction?.reason || 'Awaiting clearer market structure'}</div>
            </div>
        );
    }

    const getBiasColor = (bias) => {
        switch (bias) {
            case 'BULLISH': return '#00ff88';
            case 'BEARISH': return '#ff4466';
            case 'NEUTRAL': return '#ffaa00';
            default: return '#666';
        }
    };

    const getBiasIcon = (bias) => {
        switch (bias) {
            case 'BULLISH': return '🚀';
            case 'BEARISH': return '📉';
            case 'NEUTRAL': return '⚖️';
            default: return '❓';
        }
    };

    const getConfidenceLevel = (confidence) => {
        if (confidence >= 80) return 'HIGH';
        if (confidence >= 60) return 'MEDIUM';
        return 'LOW';
    };

    const biasColor = getBiasColor(prediction.bias);
    const biasIcon = getBiasIcon(prediction.bias);
    const confidenceLevel = getConfidenceLevel(prediction.confidence);

    return (
        <div className="prediction-badge" style={{ borderColor: biasColor }}>
            <div className="badge-header">
                <span className="badge-icon">{biasIcon}</span>
                <span className="badge-title" style={{ color: biasColor }}>
                    {prediction.bias}
                </span>
                <span className={`confidence-badge confidence-${confidenceLevel.toLowerCase()}`}>
                    {prediction.confidence}%
                </span>
            </div>

            <div className="badge-levels">
                {prediction.target && (
                    <div className="level-item target">
                        <span className="level-label">Target:</span>
                        <span className="level-value">{prediction.target.toFixed(5)}</span>
                    </div>
                )}
                {prediction.invalidation && (
                    <div className="level-item invalidation">
                        <span className="level-label">Stop:</span>
                        <span className="level-value">{prediction.invalidation.toFixed(5)}</span>
                    </div>
                )}
            </div>

            {prediction.reason && (
                <div className="badge-reason">{prediction.reason}</div>
            )}

            {prediction.meta && (
                <div className="badge-meta">
                    <div className="meta-row">
                        <span>Continuation: {prediction.meta.continuationProb}%</span>
                        <span>Reversal: {prediction.meta.reversalProb}%</span>
                    </div>
                    <div className="meta-label">HTF: {prediction.meta.htfBias}</div>
                </div>
            )}
        </div>
    );
};

export default PredictionBadge;
