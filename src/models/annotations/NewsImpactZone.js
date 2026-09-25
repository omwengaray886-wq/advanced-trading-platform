import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * News Impact Zone annotation
 * Highlights areas affected by high-impact economic news
 */
export class NewsImpactZone extends ChartAnnotation {
    constructor(eventTitle, impact, time, high, low, metadata = {}) {
        super('NEWS_IMPACT_ZONE', { time, high, low }, metadata);

        this.eventTitle = eventTitle;
        this.impact = impact; // HIGH, MEDIUM, LOW
        this.tier = metadata.tier || 'TIER 3';
        this.forecast = metadata.forecast || null;
        this.previous = metadata.previous || null;
        this.actual = metadata.actual || null;
        this.unit = metadata.unit || '';
        this.volatilityMultiplier = metadata.volatilityMultiplier || 1.0;
    }

    /**
     * Check if news risk is high
     */
    isHighRisk() {
        return this.impact === 'high';
    }
}
