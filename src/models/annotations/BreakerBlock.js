import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Breaker Block annotation
 * Represents a failed supply/demand zone that has been flipped
 */
export class BreakerBlock extends ChartAnnotation {
    constructor(coordinates, direction, metadata = {}) {
        // coordinates: { top, bottom, startTime, endTime }
        super('BREAKER_BLOCK', coordinates, metadata);

        this.direction = direction; // BULLISH or BEARISH
        this.isValidated = metadata.isValidated || false;
        this.timeframe = metadata.timeframe || '1H';
    }

    /**
     * Check if this is a bullish breaker
     * (A bearish order block that was broken to the upside)
     * @returns {boolean}
     */
    isBullish() {
        return this.direction === 'BULLISH';
    }

    /**
     * Check if this is a bearish breaker
     * (A bullish order block that was broken to the downside)
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
