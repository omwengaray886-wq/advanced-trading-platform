import React from 'react';
import './PathProjection.css';

/**
 * Path Projection Panel
 * Displays HTF liquidity roadmap with conditional targets
 */
const PathProjection = ({ pathProjection }) => {
    if (!pathProjection || !pathProjection.targets || pathProjection.targets.length === 0) {
        return null;
    }

    const { htfBias, targets, conditionalPaths, roadmapSummary } = pathProjection;

    const getBiasColor = (bias) => {
        switch (bias) {
            case 'BULLISH': return '#00ff88';
            case 'BEARISH': return '#ff4466';
            default: return '#ffaa00';
        }
    };

    return (
        <div className="path-projection-panel">
            <div className="panel-header">
                <span className="panel-icon">🗺️</span>
                <h3>HTF Price Path</h3>
                <span className="htf-bias" style={{ color: getBiasColor(htfBias) }}>
                    {htfBias}
                </span>
            </div>

            {roadmapSummary && (
                <div className="roadmap-summary">{roadmapSummary}</div>
            )}

            <div className="targets-list">
                {targets.map((target, index) => (
                    <div key={index} className="target-item">
                        <div className="target-header">
                            <span className="target-sequence">Target {target.sequence}</span>
                            <span className="target-probability" style={{
                                color: target.probability >= 70 ? '#00ff88' :
                                    target.probability >= 50 ? '#ffaa00' : '#ff4466'
                            }}>
                                {target.probability}%
                            </span>
                        </div>
                        <div className="target-price">
                            {target.price?.toFixed(5) || 'N/A'}
                        </div>
                        <div className="target-reason">{target.reason}</div>
                    </div>
                ))}
            </div>

            {conditionalPaths && conditionalPaths.length > 0 && (
                <div className="conditional-paths">
                    <div className="paths-header">If-Then Logic</div>
                    {conditionalPaths.map((path, index) => (
                        <div key={index} className="path-item">
                            <div className="path-condition">{path.condition}</div>
                            <div className="path-arrow">→</div>
                            <div className="path-then">{path.then}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PathProjection;
