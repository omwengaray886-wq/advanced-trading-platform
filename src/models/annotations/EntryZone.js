import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Entry zone annotation
 * Represents recommended entry price range
 */
export class EntryZone extends ChartAnnotation {
    constructor(topPrice, bottomPrice, direction, metadata = {}) {
        super('ENTRY_ZONE', {
            top: topPrice,
            bottom: bottomPrice,
            time: metadata.startTime || metadata.time || Date.now() / 1000,
            startTime: metadata.startTime || null,
            endTime: metadata.endTime || null
        }, metadata);

        this.direction = direction; // LONG, SHORT
        this.status = metadata.status || 'PENDING'; // PENDING, ACTIVE, FILLED, INVALIDATED
        this.confidence = metadata.confidence || 0.7;
        this.timeframe = metadata.timeframe || '1H';
    }

    // Get optimal entry (center of zone)
    getOptimalEntry() {
        return (this.coordinates.top + this.coordinates.bottom) / 2;
    }

    // Get aggressive entry
    getAggressiveEntry() {
        return this.direction === 'LONG' ? this.coordinates.top : this.coordinates.bottom;
    }

    // Get conservative entry
    getConservativeEntry() {
        return this.direction === 'LONG' ? this.coordinates.bottom : this.coordinates.top;
    }

    // Get precision entry (Institutional Equilibrium - 50% of zone)
    getPrecisionEntry() {
        return (this.coordinates.top + this.coordinates.bottom) / 2;
    }

    // Get "Sniper" entry (Aggressive limit order at zone edge)
    getSniperEntry() {
        // For LONG: Top of zone (ensure fill)
        // For SHORT: Bottom of zone (ensure fill)
        return this.direction === 'LONG' ? this.coordinates.top : this.coordinates.bottom;
    }

    // Check if price is in zone
    isPriceInZone(currentPrice) {
        return currentPrice >= this.coordinates.bottom && currentPrice <= this.coordinates.top;
    }

    // Mark as filled
    markFilled(fillPrice) {
        this.status = 'FILLED';
        this.metadata.fillPrice = fillPrice;
        this.metadata.filledAt = Date.now();
    }

    // Mark as invalidated
    invalidate(reason) {
        this.status = 'INVALIDATED';
        this.metadata.invalidationReason = reason;
        this.metadata.invalidatedAt = Date.now();
    }
}
