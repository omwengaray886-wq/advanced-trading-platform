import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * NewsShock Model
 * Represents a discrete fundamental event (CPI, FOMC, NFP) on the chart.
 * Used for drawing vertical "Shock Lines" and "Volatility Corridors".
 */
export class NewsShock extends ChartAnnotation {
    /**
     * @param {string} eventTitle - e.g., "CPI m/m Data Release"
     * @param {number} time - Unix timestamp of the event
     * @param {string} impact - 'HIGH' | 'MEDIUM' | 'LOW'
     * @param {string} currency - 'USD' | 'EUR' | 'GBP' etc.
     * @param {Object} data - { actual, forecast, previous }
     */
    constructor(eventTitle, time, impact, currency, data = {}, metadata = {}) {
        // Universal Visual System Properties
        const visuals = {
            type: 'NEWS_SHOCK',
            state: metadata.status || 'UPCOMING', // UPCOMING | RELEASED | VOLATILE
            intent: 'LIQUIDITY_EXPANSION',
            allowedDirection: 'BOTH',
            confidence: impact === 'HIGH' ? 1.0 : 0.6
        };

        super('NEWS_SHOCK', { time }, { ...metadata, ...visuals });

        this.eventTitle = eventTitle;
        this.impact = impact;
        this.currency = currency;
        this.actual = data.actual || null;
        this.forecast = data.forecast || null;
        this.previous = data.previous || null;

        // Institutional Volatility Tracking
        this.volatilityCorridor = {
            startTime: time - 1800, // 30m before
            endTime: time + 3600    // 1h after
        };
    }

    /**
     * Check if the shock is imminent (< 1 hour away)
     */
    isImminent() {
        if (this.state === 'RELEASED') return false;
        const now = Math.floor(Date.now() / 1000);
        return this.coordinates.time - now <= 3600 && this.coordinates.time > now;
    }

    /**
     * Get the descriptive risk label for AI explanation
     */
    getRiskLevel() {
        if (this.impact === 'HIGH') return 'CRITICAL MACRO SHOCK';
        if (this.impact === 'MEDIUM') return 'MODERATE VOLATILITY RISK';
        return 'LOW IMPACT EVENT';
    }
}
