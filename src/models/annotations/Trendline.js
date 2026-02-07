import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Trendline annotation
 * Represents a line connecting swing points
 */
export class Trendline extends ChartAnnotation {
    constructor(startPoint, endPoint, metadata = {}) {
        super('TRENDLINE', {
            start: { time: startPoint.time, price: startPoint.price },
            end: { time: endPoint.time, price: endPoint.price }
        }, metadata);

        this.swingPoints = metadata.swingPoints || [];
        this.strength = metadata.strength || 'moderate'; // weak, moderate, strong
        this.touches = metadata.touches || 2;
        this.timeframe = metadata.timeframe || '1H';
        this.state = metadata.state || 'VALID'; // VALID, BROKEN_SWEPT, RETESTED
    }

    // Institutional Logic: High-touch trendlines are Liquidity Traps (Inducement)
    get isLiquidityTrap() {
        return this.touches >= 3;
    }

    // Calculate slope
    getSlope() {
        const deltaPrice = this.coordinates.end.price - this.coordinates.start.price;
        const deltaTime = this.coordinates.end.time - this.coordinates.start.time;
        return deltaTime === 0 ? 0 : deltaPrice / deltaTime;
    }

    // Get direction
    getDirection() {
        return this.getSlope() > 0 ? 'BULLISH' : 'BEARISH';
    }

    // Extend line to future
    projectTo(futureTime) {
        const slope = this.getSlope();
        const deltaTime = futureTime - this.coordinates.end.time;
        const projectedPrice = this.coordinates.end.price + (slope * deltaTime);
        return { time: futureTime, price: projectedPrice };
    }

    markBroken() {
        this.state = 'BROKEN_SWEPT';
    }
}
