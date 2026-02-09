import React from 'react';

/**
 * Confidence Breakdown Tooltip
 * Shows detailed factors contributing to prediction confidence
 */
export default function ConfidenceTooltip({ prediction, marketState }) {
    if (!prediction || !marketState) return null;

    const factors = [];

    // Base probability
    const baseProb = Math.max(
        prediction.probabilities?.continuation || 0,
        prediction.probabilities?.reversal || 0
    );
    factors.push({
        label: 'Base Probability',
        value: Math.round((baseProb / 100) * 50),
        max: 50
    });

    // HTF alignment
    const htfBias = marketState.mtf?.globalBias;
    const htfPoints = htfBias === prediction.bias ? 25 : htfBias === 'NEUTRAL' ? 12 : 0;
    factors.push({
        label: 'HTF Alignment',
        value: htfPoints,
        max: 25
    });

    // Structure confirmation
    if (marketState.mtfBiasAligned) {
        factors.push({
            label: 'Structure Confirmation',
            value: 15,
            max: 15
        });
    }

    // Volume confirmation
    if (marketState.volumeAnalysis?.isInstitutional) {
        factors.push({
            label: 'Institutional Volume',
            value: 10,
            max: 10
        });
    }

    // Volume profile penalty
    const vpPenalty = marketState.volumeProfile ? 15 : 0;
    if (vpPenalty > 0) {
        factors.push({
            label: 'Volume Profile Path',
            value: -vpPenalty,
            max: 0,
            isPenalty: true
        });
    }

    // Session modifier
    const session = marketState.session?.active;
    let sessionMod = 0;
    if (session === 'ASIAN') sessionMod = -10;
    else if (session === 'LONDON' && marketState.session?.killzone) sessionMod = 15;

    if (sessionMod !== 0) {
        factors.push({
            label: `Session (${session})`,
            value: sessionMod,
            max: sessionMod > 0 ? 15 : 0,
            isPenalty: sessionMod < 0
        });
    }

    // Correlation
    if (marketState.macroCorrelation?.bias && marketState.macroCorrelation.bias !== 'NEUTRAL') {
        const corrConflict = (prediction.bias === 'BULLISH' && marketState.macroCorrelation.bias === 'BEARISH') ||
            (prediction.bias === 'BEARISH' && marketState.macroCorrelation.bias === 'BULLISH');
        if (corrConflict) {
            factors.push({
                label: 'Macro Correlation',
                value: -20,
                max: 0,
                isPenalty: true
            });
        }
    }

    // Divergence
    const hasBullishDiv = marketState.divergences?.some(d => d.type?.includes('BULLISH'));
    const hasBearishDiv = marketState.divergences?.some(d => d.type?.includes('BEARISH'));

    if (hasBullishDiv || hasBearishDiv) {
        const divValue = (prediction.bias === 'BULLISH' && hasBullishDiv) ||
            (prediction.bias === 'BEARISH' && hasBearishDiv) ? 10 : -15;
        factors.push({
            label: 'Momentum Divergence',
            value: divValue,
            max: divValue > 0 ? 10 : 0,
            isPenalty: divValue < 0
        });
    }

    const totalConfidence = prediction.confidence || 0;

    return (
        <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px',
            minWidth: '280px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000
        }}>
            <div style={{
                fontSize: '13px',
                fontWeight: 'bold',
                marginBottom: '12px',
                color: 'var(--color-text-primary)',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '8px'
            }}>
                Confidence Breakdown
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {factors.map((factor, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px'
                    }}>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                            {factor.label}
                        </span>
                        <span style={{
                            fontWeight: 'bold',
                            color: factor.isPenalty ? 'var(--color-danger)' :
                                factor.value > 0 ? 'var(--color-success)' : 'var(--color-text-secondary)'
                        }}>
                            {factor.value > 0 ? '+' : ''}{factor.value}%
                        </span>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: 'bold'
            }}>
                <span>Final Confidence</span>
                <span style={{ color: 'var(--color-primary)' }}>{totalConfidence}%</span>
            </div>
        </div>
    );
}
