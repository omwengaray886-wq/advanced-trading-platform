import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Time Based Zone annotation
 * Highlights macro cycles or specific time windows
 */
export class TimeBasedZone extends ChartAnnotation {
    constructor(label, startTime, endTime, metadata = {}) {
        super('TIME_BASED_ZONE', { startTime, endTime }, metadata);

        this.label = label; // e.g., "Macro Cycle 1", "DXY Correlation Window"
        this.recurrence = metadata.recurrence || 'none';
    }
}
