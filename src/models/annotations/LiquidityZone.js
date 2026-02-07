import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Liquidity zone annotation
 * Represents areas of liquidity (equal highs/lows, session extremes)
 */
export class LiquidityZone extends ChartAnnotation {
    constructor(priceLevel, zoneType, metadata = {}) {
        super('LIQUIDITY_ZONE', {
            price: priceLevel,
            width: metadata.width || 0.0010 // default spread
        }, metadata);

        this.zoneType = zoneType; // EQUAL_HIGHS, EQUAL_LOWS, SESSION_HIGH, SESSION_LOW
        this.liquidity = metadata.liquidity || 'high'; // low, medium, high
        this.timeframe = metadata.timeframe || '1H';
        this.touched = metadata.touched || false;
    }

    // Mark as touched/swept
    markTouched() {
        this.touched = true;
        this.metadata.touchedAt = Date.now();
    }

    // Check if likely to be swept
    getSweepProbability() {
        if (this.touched) return 0;
        if (this.liquidity === 'high') return 0.75;
        if (this.liquidity === 'medium') return 0.50;
        return 0.25;
    }

    // Get direction expectation after sweep
    getExpectedDirection() {
        const bullishZones = ['EQUAL_LOWS', 'SESSION_LOW'];
        return bullishZones.includes(this.zoneType) ? 'BULLISH' : 'BEARISH';
    }

    // Get zone bounds
    getBounds() {
        return {
            upper: this.coordinates.price + (this.coordinates.width / 2),
            lower: this.coordinates.price - (this.coordinates.width / 2)
        };
    }
}
