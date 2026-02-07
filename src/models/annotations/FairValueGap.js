import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Fair Value Gap (FVG) annotation
 * Represents an imbalance between three consecutive candles
 */
export class FairValueGap extends ChartAnnotation {
    constructor(coordinates, direction, metadata = {}) {
        // coordinates: { top, bottom, startTime, endTime }
        super('FAIR_VALUE_GAP', coordinates, metadata);

        this.direction = direction; // BULLISH or BEARISH
        this.isMitigated = metadata.isMitigated || false;
        this.mitigationTime = metadata.mitigationTime || null;
        this.timeframe = metadata.timeframe || '1H';
    }

    /**
     * Check if the FVG has been tested/mitigated by price
     * @param {number} currentPrice 
     * @returns {boolean}
     */
    isTested(currentPrice) {
        if (this.direction === 'BULLISH') {
            return currentPrice <= this.coordinates.top;
        } else {
            return currentPrice >= this.coordinates.bottom;
        }
    }

    /**
     * Get the 50% equilibrium level of the FVG
     * @returns {number}
     */
    getEquilibrium() {
        return (this.coordinates.top + this.coordinates.bottom) / 2;
    }

    /**
     * Get the direction of the gap
     * @returns {string}
     */
    getDirection() {
        return this.direction;
    }

    /**
     * Mark the FVG as mitigated
     * @param {number} time 
     */
    mitigate(time) {
        this.isMitigated = true;
        this.mitigationTime = time;
    }
}
