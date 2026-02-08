import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Session Zone annotation
 * Highlights institutional trading sessions (London, NY, Asia)
 */
export class SessionZone extends ChartAnnotation {
    constructor(sessionName, startTime, endTime, high, low, metadata = {}) {
        super('SESSION_ZONE', { startTime, endTime, high, low }, metadata);

        this.sessionName = sessionName; // LONDON, NEWYORK, ASIA
        this.killzone = metadata.killzone || false;
        this.displacement = metadata.displacement || 0;
    }

    /**
     * Check if a timestamp is within the session
     */
    isWithinSession(timestamp) {
        return timestamp >= this.coordinates.startTime && timestamp <= this.coordinates.endTime;
    }

    /**
     * Get session-specific styling (Phase 72)
     */
    getSessionStyle() {
        const colors = {
            LONDON: { bg: 'rgba(33, 150, 243, 0.08)', border: '#2196f3' },
            NEWYORK: { bg: 'rgba(76, 175, 80, 0.08)', border: '#4caf50' },
            ASIA: { bg: 'rgba(255, 193, 7, 0.05)', border: '#ffc107' }
        };

        const baseStyle = colors[this.sessionName] || { bg: 'rgba(158, 158, 158, 0.03)', border: '#9e9e9e' };

        // Boost opacity for killzones
        if (this.killzone) {
            baseStyle.bg = baseStyle.bg.replace(/0\.\d+/, '0.15');
        }

        return baseStyle;
    }

    /**
     * Calculate session probability rating (Phase 72)
     */
    getProbabilityRating() {
        let rating = 'MEDIUM';
        if (this.killzone) rating = 'HIGH';
        if (this.sessionName === 'ASIA' && !this.killzone) rating = 'LOW';
        return rating;
    }
}
