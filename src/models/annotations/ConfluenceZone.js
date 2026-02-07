import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Confluence Zone annotation
 * Heavyweight zone where multiple institutional factors overlap
 */
export class ConfluenceZone extends ChartAnnotation {
    constructor(top, bottom, startTime, factors, metadata = {}) {
        super('CONFLUENCE_ZONE', { top, bottom, startTime, endTime: metadata.endTime || null }, metadata);

        this.factors = factors; // Array of zone types (e.g., ['FVG', 'ORDER_BLOCK', 'FIB_OTE'])
        this.confluenceScore = this.calculateScore();
    }

    /**
     * Calculate score based on number and strength of factors
     */
    calculateScore() {
        return Math.min(this.factors.length * 25, 100);
    }

    /**
     * Get primary bias from factors
     */
    getDominantBias() {
        // Logic to determine if factors are mostly bullish or bearish
        return this.metadata.direction || 'NEUTRAL';
    }
}
