import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Invalidation Zone annotation
 * Marks the area where a trade setup's thesis is no longer valid
 */
export class InvalidationZone extends ChartAnnotation {
    constructor(price, startTime, direction, metadata = {}) {
        const height = metadata.height || 0.0005;
        super('INVALIDATION_ZONE', {
            top: direction === 'LONG' ? price : price + height,
            bottom: direction === 'LONG' ? price - height : price,
            startTime
        }, metadata);

        this.setupDirection = direction;
        this.severity = metadata.severity || 'CRITICAL';
    }

    /**
     * Check if thesis is invalidated
     */
    checkInvalidation(price) {
        if (this.setupDirection === 'LONG') {
            return price < this.coordinates.bottom;
        } else {
            return price > this.coordinates.top;
        }
    }
}
