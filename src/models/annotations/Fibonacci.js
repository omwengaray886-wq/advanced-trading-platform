import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Institutional Fibonacci Annotation
 * Focuses on OTE (Optimal Trade Entry) and Institutional Targets
 */
export class Fibonacci extends ChartAnnotation {
    constructor(anchorLow, anchorHigh, metadata = {}) {
        super('FIBONACCI', {
            start: { time: anchorLow.time, price: anchorLow.price },
            end: { time: anchorHigh.time, price: anchorHigh.price }
        }, metadata);

        this.direction = anchorHigh.price > anchorLow.price ? 'BULLISH' : 'BEARISH';
        this.levels = this.calculateLevels();
        this.oteRange = this.getOTERange();
    }

    calculateLevels() {
        const start = this.coordinates.start.price;
        const end = this.coordinates.end.price;
        const diff = end - start;

        // Institutional Standard Levels
        const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.705, 0.786, 1.0, -0.27, -0.618];

        return ratios.map(r => ({
            ratio: r,
            price: end - (diff * r), // Standard fib projection/retracement logic
            label: this.getLabel(r)
        }));
    }

    getLabel(ratio) {
        if (ratio === 0.5) return '均衡 (Equilibrium)';
        if (ratio === 0.705) return 'OTE (Optimal Entry)';
        if (ratio === -0.27) return 'Target 1 (Institutional)';
        if (ratio === -0.618) return 'Target 2 (Institutional)';
        return `${(ratio * 100).toFixed(1)}%`;
    }

    getOTERange() {
        const l618 = this.levels.find(l => l.ratio === 0.618).price;
        const l786 = this.levels.find(l => l.ratio === 0.786).price;
        return {
            top: Math.max(l618, l786),
            bottom: Math.min(l618, l786)
        };
    }

    // Check if a price is within the OTE zone
    isAtOTE(price) {
        return price <= this.oteRange.top && price >= this.oteRange.bottom;
    }
}
