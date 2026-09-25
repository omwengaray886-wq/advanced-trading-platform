import React from 'react';
import './MacroSentimentWidget.css';

/**
 * Macro Sentiment Widget (Phase 6)
 * Displays institutional positioning (COT simulation)
 */
const MacroSentimentWidget = ({ sentiment }) => {
    if (!sentiment || sentiment.bias === 'NEUTRAL') {
        return null;
    }

    const getBiasColor = (bias) => {
        switch (bias) {
            case 'BULLISH': return '#10b981';
            case 'BEARISH': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getPositionBar = (netPosition) => {
        const clampedPosition = Math.max(-100, Math.min(100, netPosition));
        const percentage = ((clampedPosition + 100) / 2); // Convert to 0-100 scale

        return (
            <div style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                position: 'relative',
                marginTop: '8px'
            }}>
                <div style={{
                    position: 'absolute',
                    left: '50%',
                    width: '2px',
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.2)'
                }} />
                <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: getBiasColor(sentiment.bias),
                    borderRadius: '3px',
                    transition: 'width 0.3s ease'
                }} />
            </div>
        );
    };

    return (
        <div className="macro-sentiment-widget" style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h4 style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    margin: 0
                }}>
                    Institutional Positioning
                </h4>
                <span style={{
                    fontSize: '11px',
                    color: getBiasColor(sentiment.bias),
                    fontWeight: 700
                }}>
                    {sentiment.bias}
                </span>
            </div>

            {getPositionBar(sentiment.netPosition)}

            <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                    {sentiment.reason}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', opacity: 0.6 }}>
                    <span>Long Interest: {sentiment.longInterest || 0}</span>
                    <span>Short Interest: {sentiment.shortInterest || 0}</span>
                    <span>Net: {sentiment.netPosition > 0 ? '+' : ''}{sentiment.netPosition}</span>
                </div>
            </div>
        </div>
    );
};

export default MacroSentimentWidget;
