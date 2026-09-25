import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Institutional Level Annotation
 * Represents precise horizontal Support and Resistance levels.
 */
export class InstitutionalLevel extends ChartAnnotation {
    constructor(price, type, metadata = {}) {
        super('INSTITUTIONAL_LEVEL', {
            price: price,
            time: metadata.lastTouch || Date.now() / 1000
        }, metadata);

        this.levelType = type; // SUPPORT, RESISTANCE
        this.strength = metadata.strength || 'MODERATE'; // MODERATE, STRONG
        this.touches = metadata.touches || 2;
        this.timeframe = metadata.timeframe || '1H';
        this.isMajor = metadata.isMajor || false;

        // Institutional state tracking
        this.state = 'UNBROKEN'; // UNBROKEN, TESTED, BROKEN
    }

    getLabel() {
        const prefix = this.isMajor ? 'MAJOR' : 'RETAIL';
        return `${prefix} ${this.levelType}`;
    }

    getStyle() {
        return {
            color: this.levelType === 'SUPPORT' ? '#10b981' : '#ef4444',
            lineStyle: this.isMajor ? 0 : 2, // 0 = Solid, 2 = Dashed
            lineWidth: this.isMajor ? 2 : 1
        };
    }
}
