import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Order Block (OB) annotation
 * Represents a specific area where institutional orders were placed
 */
export class OrderBlock extends ChartAnnotation {
    constructor(top, bottom, startTime, direction, metadata = {}) {
        super('ORDER_BLOCK', { top, bottom, startTime, endTime: metadata.endTime || null }, metadata);

        this.direction = direction; // BULLISH, BEARISH
        this.strength = metadata.strength || 'medium';
        this.isMitigated = metadata.isMitigated || false;
        this.touches = metadata.touches || 0;
        this.timeframe = metadata.timeframe || '1H';
    }

    /**
     * Get the mean threshold (50%) of the block
     */
    getMeanThreshold() {
        return (this.coordinates.top + this.coordinates.bottom) / 2;
    }

    /**
     * Check if a price point is high risk (past mean threshold)
     */
    isDeepPenetration(price) {
        const mean = this.getMeanThreshold();
        if (this.direction === 'BULLISH') {
            return price < mean;
        } else {
            return price > mean;
        }
    }

    /**
     * Mark as mitigated
     */
    mitigate() {
        this.isMitigated = true;
        this.metadata.mitigatedAt = Date.now();
    }
}
