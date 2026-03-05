/**
 * Volatility Corridor Annotation (Phase 6)
 * Represents Standard Deviation bands for institutional mean reversion.
 */
export class VolatilityCorridor {
    constructor(upper, lower, center, startTime, endTime, options = {}) {
        this.id = `vol-corridor-${startTime}-${upper.toFixed(2)}`;
        this.type = 'VOLATILITY_CORRIDOR';
        this.coordinates = {
            top: upper,
            bottom: lower,
            center: center,
            time: startTime,
            endTime: endTime
        };
        this.properties = {
            timeframe: options.timeframe || '15m',
            sigma: options.sigma || 2.0,
            regime: options.regime || 'STABLE',
            label: options.label || 'VOL CORRIDOR (2.0σ)',
            isGhost: options.isGhost || true
        };
    }
}
