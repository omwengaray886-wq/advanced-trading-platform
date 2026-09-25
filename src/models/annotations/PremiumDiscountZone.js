import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Premium/Discount Zone annotation
 * Maps Equilibrium, Premium, and Discount zones relative to a structural range
 */
export class PremiumDiscountZone extends ChartAnnotation {
    constructor(rangeHigh, rangeLow, startTime, metadata = {}) {
        super('PREMIUM_DISCOUNT_ZONE', {
            high: rangeHigh,
            low: rangeLow,
            startTime,
            endTime: metadata.endTime || null
        }, metadata);

        this.equilibrium = (rangeHigh + rangeLow) / 2;
        this.timeframe = metadata.timeframe || '1H';
    }

    /**
     * Determine price regime relative to the range
     * @param {number} price 
     * @returns {string} PREMIUM, DISCOUNT, or EQUILIBRIUM
     */
    getPriceRegime(price) {
        if (price > this.equilibrium * 1.001) return 'PREMIUM';
        if (price < this.equilibrium * 0.999) return 'DISCOUNT';
        return 'EQUILIBRIUM';
    }

    /**
     * Get target bias based on price regime
     */
    getLogicalBias(price) {
        const regime = this.getPriceRegime(price);
        if (regime === 'PREMIUM') return 'SHORT';
        if (regime === 'DISCOUNT') return 'LONG';
        return 'NEUTRAL';
    }
}
