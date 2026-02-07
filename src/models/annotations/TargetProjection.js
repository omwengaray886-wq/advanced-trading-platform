import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Target projection annotation
 * Represents stop loss and take profit levels
 */
export class TargetProjection extends ChartAnnotation {
    constructor(price, projectionType, metadata = {}) {
        super('TARGET_PROJECTION', {
            price: price
        }, metadata);

        this.projectionType = projectionType; // STOP_LOSS, TARGET_1, TARGET_2, TARGET_3
        this.riskReward = metadata.riskReward || null;
        this.probability = metadata.probability || null;
        this.hit = false;
    }

    // Mark as hit
    markHit(timestamp) {
        this.hit = true;
        this.metadata.hitAt = timestamp;
    }

    // Check if stop loss
    isStopLoss() {
        return this.projectionType === 'STOP_LOSS';
    }

    // Check if target
    isTarget() {
        return this.projectionType.startsWith('TARGET_');
    }

    // Get target number
    getTargetNumber() {
        if (!this.isTarget()) return null;
        return parseInt(this.projectionType.split('_')[1]);
    }

    // Get display label
    getLabel() {
        if (this.isStopLoss()) {
            return 'Stop Loss';
        }
        const num = this.getTargetNumber();
        return `Target ${num}${this.riskReward ? ` (${this.riskReward}R)` : ''}`;
    }
}
