import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Liquidity Sweep Zone annotation
 * Represents "stop raids" or "clearing" of liquidity levels
 */
export class LiquiditySweepZone extends ChartAnnotation {
    constructor(sweepHigh, sweepLow, time, sweepType, metadata = {}) {
        super('LIQUIDITY_SWEEP_ZONE', {
            high: sweepHigh,
            low: sweepLow,
            center: (sweepHigh + sweepLow) / 2,
            time
        }, metadata);

        this.sweepType = sweepType; // BULLISH_SWEEP, BEARISH_SWEEP
        this.displacement = metadata.displacement || 0;
        this.isValidated = metadata.isValidated || false;
    }

    /**
     * Get the recovery bias after sweep
     */
    getRecoveryBias() {
        return this.sweepType === 'BULLISH_SWEEP' ? 'SHORT' : 'LONG';
    }
}
