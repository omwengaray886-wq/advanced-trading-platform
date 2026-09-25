import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Structure Zone annotation
 * Represents the area surrounding a BOS or CHOCH
 */
export class StructureZone extends ChartAnnotation {
    constructor(price, time, structureType, direction, metadata = {}) {
        const threshold = metadata.threshold || 0.0005; // 5 pips default context
        super('STRUCTURE_ZONE', {
            center: price,
            top: price + threshold,
            bottom: price - threshold,
            time: time
        }, metadata);

        this.structureType = structureType; // BOS, CHOCH
        this.direction = direction; // BULLISH, BEARISH
        this.strength = metadata.strength || 'low';
        this.timeframe = metadata.timeframe || '1H';
    }

    /**
     * Check if price is revisiting this breakout point
     */
    isRevisit(price) {
        return price >= this.coordinates.bottom && price <= this.coordinates.top;
    }
}
