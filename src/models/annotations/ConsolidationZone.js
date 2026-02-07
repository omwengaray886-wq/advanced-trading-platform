import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Consolidation Zone annotation
 * Represents range-bound or accumulation/distribution areas
 */
export class ConsolidationZone extends ChartAnnotation {
    constructor(top, bottom, startTime, endTime, metadata = {}) {
        super('CONSOLIDATION_ZONE', { top, bottom, startTime, endTime }, metadata);

        this.strength = metadata.strength || 1;
        this.timeframe = metadata.timeframe || '1H';
        this.isAccumulation = metadata.isAccumulation || false;
    }

    /**
     * Get the range height in price
     */
    getRangeHeight() {
        return this.coordinates.top - this.coordinates.bottom;
    }

    /**
     * Check if price has broken out of the consolidation
     */
    checkBreakout(price) {
        if (price > this.coordinates.top) return 'BULLISH_BREAKOUT';
        if (price < this.coordinates.bottom) return 'BEARISH_BREAKOUT';
        return 'IN_RANGE';
    }
}
