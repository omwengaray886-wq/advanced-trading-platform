import React from 'react';
import { normalizeDirection } from '../../utils/normalization';

/**
 * Entry Confirmation Overlay
 * Displays a checklist of confirmation criteria for entry signals
 */
export const EntryConfirmationOverlay = ({ setup, analysis, position = 'top-right' }) => {
    if (!setup || !analysis) return null;

    const {
        direction,
        bayesianStats,
        entryZone
    } = setup;

    const {
        mtf,
        orderFlow,
        retests,
        liquiditySweep
    } = analysis;

    const normDir = normalizeDirection(direction);
    const isBullish = normDir === 'BULLISH';
    const htfBias = normalizeDirection(mtf?.globalBias);

    // Check all confirmation criteria
    const checks = {
        bayesian: {
            label: 'Bayesian Edge',
            passed: bayesianStats?.probability >= 0.70,
            value: bayesianStats?.probability ? `${(bayesianStats.probability * 100).toFixed(0)}%` : 'N/A',
            required: true
        },
        mtfAlignment: {
            label: 'HTF Alignment',
            passed: htfBias === normDir && normDir !== 'NEUTRAL',
            value: htfBias,
            required: false
        },
        orderFlow: {
            label: 'Order Flow',
            passed: normalizeDirection(orderFlow?.bias) === normDir && normDir !== 'NEUTRAL',
            value: orderFlow?.bias || 'NEUTRAL',
            required: false
        },
        retest: {
            label: 'Retest Detected',
            passed: (retests || []).some(r => normalizeDirection(r.direction) === normDir),
            value: (retests || []).length > 0 ? 'Yes' : 'No',
            required: false
        },
        sweep: {
            label: 'Liquidity Sweep',
            passed: liquiditySweep && (
                (isBullish && liquiditySweep.type === 'BULLISH_SWEEP') ||
                (!isBullish && liquiditySweep.type === 'BEARISH_SWEEP')
            ),
            value: liquiditySweep ? 'Yes' : 'No',
            required: false
        }
    };

    // Count passed confirmations (excluding Bayesian which is mandatory)
    const optionalPassed = Object.entries(checks)
        .filter(([key, check]) => !check.required && check.passed)
        .length;

    const isFullyConfirmed = checks.bayesian.passed && optionalPassed >= 1;

    // Position styles
    const positions = {
        'top-right': { top: '12px', right: '12px' },
        'top-left': { top: '12px', left: '12px' },
        'bottom-right': { bottom: '12px', right: '12px' },
        'bottom-left': { bottom: '12px', left: '12px' },
    };

    const statusColor = isFullyConfirmed ? '#10b981' : checks.bayesian.passed ? '#f59e0b' : '#ef4444';
    const statusText = isFullyConfirmed ? 'CONFIRMED' : checks.bayesian.passed ? 'PARTIAL' : 'UNCONFIRMED';

    return (
        <div style={{
            position: 'absolute',
            ...positions[position],
            background: 'rgba(15, 23, 42, 0.95)',
            border: `2px solid ${statusColor}`,
            borderRadius: '8px',
            padding: '12px',
            minWidth: '220px',
            boxShadow: `0 8px 16px rgba(0,0,0,0.3), 0 0 0 1px ${statusColor}40`,
            zIndex: 1000,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backdropFilter: 'blur(10px)'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: `1px solid ${statusColor}40`
            }}>
                <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    Entry Confirmation
                </span>
                <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: statusColor,
                    background: `${statusColor}20`,
                    padding: '2px 6px',
                    borderRadius: '4px'
                }}>
                    {statusText}
                </span>
            </div>

            {/* Direction & Probability */}
            <div style={{
                marginBottom: '12px',
                padding: '8px',
                background: isBullish ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: '6px',
                borderLeft: `3px solid ${isBullish ? '#10b981' : '#ef4444'}`
            }}>
                <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: isBullish ? '#10b981' : '#ef4444',
                    marginBottom: '4px'
                }}>
                    {direction} SETUP
                </div>
                <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: statusColor
                }}>
                    {checks.bayesian.value}
                </div>
                <div style={{
                    fontSize: '9px',
                    color: '#64748b',
                    marginTop: '2px'
                }}>
                    Bayesian Probability
                </div>
            </div>

            {/* Confirmation Checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {Object.entries(checks).map(([key, check]) => (
                    <div key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        background: check.passed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(100, 116, 139, 0.05)',
                        borderRadius: '4px',
                        fontSize: '11px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                                fontSize: '14px',
                                color: check.passed ? '#10b981' : '#64748b'
                            }}>
                                {check.passed ? '✅' : check.required ? '❌' : '⏳'}
                            </span>
                            <span style={{
                                color: check.passed ? '#e2e8f0' : '#94a3b8',
                                fontWeight: check.required ? '600' : '400'
                            }}>
                                {check.label}
                                {check.required && <span style={{ color: '#ef4444', marginLeft: '2px' }}>*</span>}
                            </span>
                        </div>
                        <span style={{
                            color: check.passed ? '#10b981' : '#64748b',
                            fontSize: '10px',
                            fontWeight: '600'
                        }}>
                            {check.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(100, 116, 139, 0.2)',
                fontSize: '9px',
                color: '#64748b',
                lineHeight: '1.4'
            }}>
                {isFullyConfirmed ? (
                    <span style={{ color: '#10b981' }}>✓ All criteria met. Safe to enter.</span>
                ) : checks.bayesian.passed ? (
                    <span style={{ color: '#f59e0b' }}>⚠️ Bayesian edge present. Wait for additional confirmation.</span>
                ) : (
                    <span style={{ color: '#ef4444' }}>⛔ Bayesian edge required. DO NOT enter.</span>
                )}
            </div>
        </div>
    );
};

export default EntryConfirmationOverlay;
