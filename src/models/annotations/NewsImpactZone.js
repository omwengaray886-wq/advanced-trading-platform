import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * News Impact Zone annotation
 * Highlights areas affected by high-impact economic news
 */
export class NewsImpactZone extends ChartAnnotation {
    constructor(eventTitle, impact, time, high, low, metadata = {}) {
        super('NEWS_IMPACT_ZONE', { time, high, low }, metadata);

        this.eventTitle = eventTitle;
        this.impact = impact; // high, medium, low
        this.volatilityMultiplier = metadata.volatilityMultiplier || 1.0;
    }

    /**
     * Check if news risk is high
     */
    isHighRisk() {
        return this.impact === 'high';
    }
}
