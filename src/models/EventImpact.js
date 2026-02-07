/**
 * Event Impact Model
 * Represents the impact of fundamental events on technical analysis
 */

export class EventImpact {
    constructor(event, technicalBias) {
        this.event = event;
        this.asset = event.asset;
        this.technicalBias = technicalBias; // BULLISH, BEARISH, NEUTRAL

        // Calculate alignment
        this.technicalAlignment = this.calculateAlignment();
        this.confidenceAdjustment = this.calculateConfidenceAdjustment();
        this.riskLevel = this.calculateRiskLevel();
        this.recommendations = this.generateRecommendations();
    }

    /**
     * Calculate alignment between fundamental bias and technical bias
     * @returns {string} - ALIGNED, CONFLICTING, NEUTRAL
     */
    calculateAlignment() {
        const fundamentalBias = this.event.getDirectionalBias();

        if (fundamentalBias === 'NEUTRAL') return 'NEUTRAL';
        if (this.technicalBias === 'NEUTRAL') return 'NEUTRAL';

        return fundamentalBias === this.technicalBias ? 'ALIGNED' : 'CONFLICTING';
    }

    /**
     * Calculate confidence adjustment based on alignment and event impact
     * @returns {number} - Confidence adjustment (-0.3 to +0.2)
     */
    calculateConfidenceAdjustment() {
        const impactScore = this.event.getImpactScore();
        const phase = this.event.getPhase();

        let adjustment = 0;

        // Alignment effect
        if (this.technicalAlignment === 'ALIGNED') {
            adjustment += impactScore * 0.15; // Up to +15%
        } else if (this.technicalAlignment === 'CONFLICTING') {
            adjustment -= impactScore * 0.25; // Up to -25%
        }

        // Phase effect (reduce confidence before events)
        if (phase === 'PRE_EVENT') {
            adjustment -= impactScore * 0.10; // Additional -10% before high-impact events
        } else if (phase === 'RELEASE_WINDOW') {
            adjustment -= 0.20; // Significant reduction during release
        }

        return Math.max(-0.30, Math.min(0.20, adjustment));
    }

    /**
     * Calculate risk level
     * @returns {string} - NORMAL, ELEVATED, HIGH
     */
    calculateRiskLevel() {
        const phase = this.event.getPhase();
        const impact = this.event.impact;

        if (phase === 'RELEASE_WINDOW') return 'HIGH';
        if (phase === 'PRE_EVENT' && impact === 'HIGH') return 'ELEVATED';
        if (this.technicalAlignment === 'CONFLICTING' && impact !== 'LOW') return 'ELEVATED';

        return 'NORMAL';
    }

    /**
     * Generate trading recommendations
     * @returns {Array<string>} - List of recommendations
     */
    generateRecommendations() {
        const recs = [];
        const phase = this.event.getPhase();

        if (phase === 'PRE_EVENT') {
            recs.push('Consider conservative entry points');
            recs.push('Widen stop loss by 15-20%');
            if (this.event.impact === 'HIGH') {
                recs.push('Reduce position size by 25-50%');
            }
        }

        if (phase === 'RELEASE_WINDOW') {
            recs.push('⚠️ Avoid new entries during release window');
            recs.push('Consider closing partial positions to reduce exposure');
        }

        if (phase === 'POST_EVENT') {
            recs.push('Re-evaluate market structure after event');
            recs.push('Wait for volatility to stabilize before entry');
        }

        if (this.technicalAlignment === 'ALIGNED') {
            recs.push('✅ Fundamental bias reinforces technical setup');
        } else if (this.technicalAlignment === 'CONFLICTING') {
            recs.push('⚠️ Fundamental bias conflicts with technical - exercise caution');
        }

        return recs;
    }

    /**
     * Get narrative explanation of impact
     * @returns {string}
     */
    getNarrative() {
        const eventName = this.event.type.replace(/_/g, ' ');
        const phase = this.event.getPhase();
        const proximity = Math.abs(this.event.getProximity()).toFixed(0);

        let narrative = '';

        if (phase === 'PRE_EVENT') {
            narrative = `Upcoming ${eventName} in ${proximity}h may introduce ${this.event.volatilityExpected.toLowerCase()} volatility. `;
        } else if (phase === 'RELEASE_WINDOW') {
            narrative = `${eventName} releasing now - elevated volatility expected. `;
        } else if (phase === 'POST_EVENT') {
            narrative = `Recent ${eventName} (${proximity}h ago) may still influence price action. `;
        }

        if (this.technicalAlignment === 'ALIGNED') {
            narrative += `${this.event.bias} fundamental bias aligns with ${this.technicalBias.toLowerCase()} technical structure, reinforcing the setup.`;
        } else if (this.technicalAlignment === 'CONFLICTING') {
            narrative += `${this.event.bias} fundamental bias conflicts with ${this.technicalBias.toLowerCase()} technical structure, suggesting caution.`;
        } else {
            narrative += `Fundamental bias is neutral relative to current technical setup.`;
        }

        return narrative;
    }

    /**
     * Calculate standalone impact score
     * @returns {Object} - Impact metrics
     */
    calculateImpact() {
        const impactScore = this.event.getImpactScore();
        const bias = this.event.getDirectionalBias();

        // Map bias to direction score (-1 to 1)
        let directionScore = 0;
        if (bias === 'BULLISH') directionScore = 1;
        else if (bias === 'BEARISH') directionScore = -1;

        // Adjust for event phase
        const phase = this.event.getPhase();
        let confidence = 0.8; // Base confidence

        if (phase === 'PRE_EVENT') {
            confidence = 0.6; // Lower confidence before event
        } else if (phase === 'post_event') { // Fixed case sensitivity
            confidence = 0.9; // Higher confidence after
        }

        return {
            directionScore: directionScore * impactScore,
            strength: impactScore,
            confidence: confidence
        };
    }

    toJSON() {
        return {
            event: this.event.toJSON(),
            technicalAlignment: this.technicalAlignment,
            confidenceAdjustment: this.confidenceAdjustment,
            riskLevel: this.riskLevel,
            recommendations: this.recommendations,
            narrative: this.getNarrative()
        };
    }
}
