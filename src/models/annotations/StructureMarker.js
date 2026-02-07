import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Structure marker annotation
 * Represents market structure points: HH, HL, LH, LL, BOS, CHOCH
 */
export class StructureMarker extends ChartAnnotation {
    constructor(point, markerType, metadata = {}) {
        super('STRUCTURE_MARKER', {
            time: point.time,
            price: point.price
        }, metadata);

        this.markerType = markerType; // HH, HL, LH, LL, BOS, CHOCH
        this.significance = metadata.significance || 'medium'; // low, medium, high
        this.timeframe = metadata.timeframe || '1H';
    }

    // Get display label
    getLabel() {
        const labels = {
            'HH': 'Higher High',
            'HL': 'Higher Low',
            'LH': 'Lower High',
            'LL': 'Lower Low',
            'BOS': 'Break of Structure',
            'CHOCH': 'Change of Character'
        };
        return labels[this.markerType] || this.markerType;
    }

    // Get color based on type
    getColor() {
        const bullishMarkers = ['HH', 'HL', 'BOS'];
        const bearishMarkers = ['LH', 'LL'];

        if (bullishMarkers.includes(this.markerType)) return '#10b981'; // green
        if (bearishMarkers.includes(this.markerType)) return '#ef4444'; // red
        return '#f59e0b'; // yellow for CHOCH
    }

    // Check if bullish structure
    isBullish() {
        return ['HH', 'HL'].includes(this.markerType);
    }

    // Check if bearish structure
    isBearish() {
        return ['LH', 'LL'].includes(this.markerType);
    }
}
