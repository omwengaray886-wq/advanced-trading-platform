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
}
