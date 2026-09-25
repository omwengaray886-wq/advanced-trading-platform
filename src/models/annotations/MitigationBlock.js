import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Mitigation Block annotation
 * Represents a failed order block that didn't take liquidity before being broken
 */
export class MitigationBlock extends ChartAnnotation {
    constructor(coordinates, direction, metadata = {}) {
        // coordinates: { top, bottom, startTime, endTime }
        super('MITIGATION_BLOCK', coordinates, metadata);

        this.direction = direction; // BULLISH or BEARISH
        this.timeframe = metadata.timeframe || '1H';
    }

    /**
     * Check if this is a bullish mitigation block
     * @returns {boolean}
     */
    isBullish() {
        return this.direction === 'BULLISH';
    }

    /**
     * Check if this is a bearish mitigation block
     * @returns {boolean}
     */
    isBearish() {
        return this.direction === 'BEARISH';
    }

    /**
     * Get the mean threshold (50%) of the block
     * @returns {number}
     */
    getMeanThreshold() {
        return (this.coordinates.top + this.coordinates.bottom) / 2;
    }
}
