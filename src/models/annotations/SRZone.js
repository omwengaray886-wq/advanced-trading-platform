import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Support & Resistance Zone annotation
 * Represents S/R levels as elastic areas
 */
export class SRZone extends ChartAnnotation {
    constructor(price, zoneType, metadata = {}) {
        const width = metadata.width || (price * 0.001); // 0.1% width default
        super('SR_ZONE', {
            center: price,
            top: price + (width / 2),
            bottom: price - (width / 2)
        }, metadata);

        this.zoneType = zoneType; // SUPPORT, RESISTANCE
        this.strength = metadata.strength || 'medium';
        this.touches = metadata.touches || 0;
        this.isMajor = metadata.isMajor || false;
    }

    /**
     * Check if price is within the S/R elastic area
     */
    contains(price) {
        return price >= this.coordinates.bottom && price <= this.coordinates.top;
    }
}
