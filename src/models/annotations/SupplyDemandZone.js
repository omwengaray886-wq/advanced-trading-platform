import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Supply/Demand zone annotation
 * Represents institutional order blocks and imbalance zones
 */
export class SupplyDemandZone extends ChartAnnotation {
    constructor(topPrice, bottomPrice, timestamp, zoneType, metadata = {}) {
        super('SUPPLY_DEMAND_ZONE', {
            top: topPrice,
            bottom: bottomPrice,
            time: timestamp
        }, metadata);

        this.zoneType = zoneType; // DEMAND, SUPPLY
        this.strength = metadata.strength || 'medium'; // weak, medium, strong
        this.timeframe = metadata.timeframe || '1H';

        // Institutional Lifecycles
        this.state = 'FRESH'; // FRESH, PARTIALLY_MITIGATED, FULLY_MITIGATED, BROKEN_FLIPPED
        this.touches = 0;
        this.last_reaction_strength = 'none'; // none, weak, medium, strong
        this.probability_remaining = this.calculateInitialProbability();
    }

    calculateInitialProbability() {
        const base = this.strength === 'strong' ? 0.85 : this.strength === 'medium' ? 0.70 : 0.55;
        const tfWeight = { '1m': 0.8, '5m': 0.85, '15m': 0.9, '1h': 1.0, '4h': 1.1, '1d': 1.2 };
        return Math.min(base * (tfWeight[this.timeframe.toLowerCase()] || 1.0), 0.95);
    }

    // Get zone height
    getHeight() {
        return this.coordinates.top - this.coordinates.bottom;
    }

    // Get midpoint
    getMidpoint() {
        return (this.coordinates.top + this.coordinates.bottom) / 2;
    }

    // Check if price is within zone
    containsPrice(price) {
        return price >= this.coordinates.bottom && price <= this.coordinates.top;
    }

    /**
     * Mark as tested with institutional lifecycle logic
     * @param {number} penetrationDepth - How deep price entered (0-1)
     * @param {string} reactionStrength - Reaction seen: weak, medium, strong
     */
    markTested(penetrationDepth = 0.5, reactionStrength = 'weak') {
        this.touches++;
        this.last_reaction_strength = reactionStrength;

        // Update probability based on usage
        if (reactionStrength === 'weak') {
            this.probability_remaining *= 0.7; // Fast decay on weak reaction
        } else {
            this.probability_remaining *= 0.9;
        }

        // Lifecycle transitions
        if (penetrationDepth > 0.9) {
            this.state = 'FULLY_MITIGATED';
            this.probability_remaining = 0;
        } else if (this.touches > 0) {
            this.state = 'PARTIALLY_MITIGATED';
        }

        if (this.probability_remaining < 0.2) {
            this.state = 'FULLY_MITIGATED';
        }
    }

    /**
     * Flip the zone (Demand becomes Supply and vice versa)
     */
    flip() {
        this.state = 'BROKEN_FLIPPED';
        this.zoneType = this.zoneType === 'DEMAND' ? 'SUPPLY' : 'DEMAND';
        this.probability_remaining = 0.65; // Renewed probability as a breaker
        this.strength = 'medium';
    }

    // Get expected reaction
    getExpectedReaction() {
        return this.zoneType === 'DEMAND' ? 'BULLISH' : 'BEARISH';
    }

    // Get reliability score
    getReliability() {
        if (this.state === 'FULLY_MITIGATED') return 0.1;
        return this.probability_remaining;
    }
}

