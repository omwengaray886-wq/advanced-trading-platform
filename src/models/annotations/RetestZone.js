import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Retest Zone annotation
 * Highlights areas where price returns to validate a previous breakout
 */
export class RetestZone extends ChartAnnotation {
    constructor(price, time, sourceZoneType, direction, metadata = {}) {
        super('RETEST_ZONE', { price, time }, metadata);

        this.sourceZoneType = sourceZoneType; // FVG, SUP_DEM, SR, etc
        this.direction = direction; // BULLISH, BEARISH
        this.isValidated = metadata.isValidated || false;
    }

    /**
     * Mark retest as successful
     */
    validate() {
        this.isValidated = true;
        this.metadata.validatedAt = Date.now();
    }
}
