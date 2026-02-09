/**
 * Regime Transition Predictor
 * 
 * Wrapper service to formalize market regime transition logic.
 * Adds state persistence to track transition probabilities over time.
 */

import { calculateTransitionProbability } from '../analysis/marketRegime.js';

export class RegimeTransitionPredictor {
    constructor() {
        this.history = []; // Store past predictions to track trends
    }

    /**
     * Predict the next market regime based on current state
     * @param {Object} marketState - Current market state
     * @param {Array} structures - Market structure markers
     * @param {Array} consolidations - Consolidation zones
     * @returns {Object} Prediction result
     */
    predictNextRegime(marketState, structures, consolidations) {
        // Use the core logic from analysis layer
        const prediction = calculateTransitionProbability(marketState, structures, consolidations);

        // Add to history
        this.history.push({
            timestamp: Date.now(),
            ...prediction
        });

        // Keep history manageable
        if (this.history.length > 20) {
            this.history.shift();
        }

        // Calculate trend (is probability increasing?)
        const trend = this._calculateProbabilityTrend();

        return {
            ...prediction,
            trend,
            isImminent: prediction.probability > 75,
            historySize: this.history.length
        };
    }

    /**
     * Calculate if transition probability is increasing
     * @private
     */
    _calculateProbabilityTrend() {
        if (this.history.length < 3) return 'STABLE';

        const last3 = this.history.slice(-3);
        const p1 = last3[0].probability;
        const p2 = last3[1].probability;
        const p3 = last3[2].probability;

        if (p3 > p2 && p2 > p1) return 'INCREASING';
        if (p3 < p2 && p2 < p1) return 'DECREASING';
        return 'STABLE';
    }
}

export const regimeTransitionPredictor = new RegimeTransitionPredictor();
