/**
 * Probabilistic Forecast Engine
 * 
 * Provides Bayesian probability weighting for market scenarios.
 * Calculates likelihood of continuation, reversal, and liquidity events
 * with time-based confidence decay.
 */

export class ProbabilisticEngine {
    /**
     * Calculate probability of trend continuation
     * @param {Object} marketState - Current market state
     * @param {Object} mtfData - Multi-timeframe data
     * @returns {number} Probability 0-100
     */
    static calculateContinuationProbability(marketState, mtfData) {
        // Bayesian Formula: P(Continuation) = (HTF_Bias * 0.35) + (Structure * 0.25) + (Volume * 0.20) + (Obligation * 0.20)

        // 1. HTF Bias Weight (0-1)
        const htfBiasWeight = this._getHTFBiasWeight(marketState, mtfData);

        // 2. Structure Strength (0-1)
        const structureStrength = this._getStructureStrength(marketState);

        // 3. Volume Confirmation (0-1)
        const volumeConfirmation = this._getVolumeConfirmation(marketState);

        // 4. Market Obligation (0-1) - NEW
        // If market has "unfinished business" (Obligations), it is compelled to move.
        // If "Free Roaming", probability drops.
        const obligationState = marketState.obligations?.state || 'FREE_ROAMING';
        const obligationWeight = obligationState === 'OBLIGATED' ? 1.0 : 0.5;

        // Weighted sum
        const probability = (htfBiasWeight * 0.35) + (structureStrength * 0.25) + (volumeConfirmation * 0.20) + (obligationWeight * 0.20);

        return Math.round(probability * 100);
    }

    /**
     * Calculate probability of reversal
     * @param {Object} marketState - Current market state
     * @param {Array} swingPoints - Swing point history
     * @returns {number} Probability 0-100
     */
    static calculateReversalProbability(marketState, swingPoints) {
        let reversalScore = 0;

        // 1. Divergence Detection (20 points)
        if (marketState.divergence?.detected) {
            reversalScore += 20;
        }

        // 2. Exhaustion Signals (20 points)
        if (marketState.volumeAnalysis?.exhaustion) {
            reversalScore += 20;
        }

        // 3. Major Resistance/Support Hit (30 points)
        const atMajorLevel = this._isAtMajorLevel(marketState.currentPrice, swingPoints);
        if (atMajorLevel) {
            reversalScore += 30;
        }

        // 4. Failed BOS Count (15 points)
        const failedBOS = marketState.structures?.filter(s => s.status === 'FAILED').length || 0;
        reversalScore += Math.min(failedBOS * 5, 15);

        // 5. Overextension (15 points)
        const overextended = this._isOverextended(marketState);
        if (overextended) {
            reversalScore += 15;
        }

        return Math.min(reversalScore, 100);
    }

    /**
     * Calculate probability of liquidity run
     * @param {Array} liquidityPools - Available liquidity pools
     * @param {number} currentPrice - Current market price
     * @returns {Object} { probability, target }
     */
    static calculateLiquidityRunProbability(liquidityPools, currentPrice) {
        if (!liquidityPools || liquidityPools.length === 0) {
            return { probability: 0, target: null };
        }

        // Find nearest high-strength pool
        const sortedPools = liquidityPools
            .map(pool => ({
                ...pool,
                distance: Math.abs(pool.price - currentPrice),
                distancePercent: Math.abs(pool.price - currentPrice) / currentPrice
            }))
            .sort((a, b) => a.distance - b.distance);

        const nearestPool = sortedPools[0];

        // Probability factors
        let probability = 0;

        // 1. Pool strength (40 points)
        const strengthMap = { HIGH: 40, MEDIUM: 25, LOW: 10 };
        probability += strengthMap[nearestPool.strength] || 10;

        // 2. Proximity (30 points) - closer = higher probability
        if (nearestPool.distancePercent < 0.005) probability += 30; // Within 0.5%
        else if (nearestPool.distancePercent < 0.01) probability += 20; // Within 1%
        else if (nearestPool.distancePercent < 0.02) probability += 10; // Within 2%

        // 3. Trend alignment (30 points)
        const trendAligned = (nearestPool.type === 'BUY_SIDE' && nearestPool.price > currentPrice) ||
            (nearestPool.type === 'SELL_SIDE' && nearestPool.price < currentPrice);
        if (trendAligned) probability += 30;

        return {
            probability: Math.min(probability, 100),
            target: nearestPool.price,
            type: nearestPool.type,
            label: nearestPool.label
        };
    }

    /**
     * Apply confidence decay over time
     * @param {number} initialProbability - Original probability (0-100)
     * @param {number} timeSinceSetup - Time in milliseconds since setup formed
     * @param {number} halfLifeMs - Half-life in milliseconds (default 4 hours)
     * @returns {number} Decayed probability
     */
    static applyConfidenceDecay(initialProbability, timeSinceSetup, halfLifeMs = 4 * 60 * 60 * 1000) {
        // Exponential decay: P(t) = P(0) × e^(-λt)
        // where λ = ln(2) / halfLife

        const decayRate = Math.log(2) / halfLifeMs;
        const decayedProbability = initialProbability * Math.exp(-decayRate * timeSinceSetup);

        return Math.max(Math.round(decayedProbability), 0);
    }

    /**
     * Get HTF bias alignment weight
     * @private
     */
    static _getHTFBiasWeight(marketState, mtfData) {
        const globalBias = marketState.mtf?.globalBias || 'NEUTRAL';

        if (globalBias === 'NEUTRAL') return 0.3;

        // Strong bias if HTF and LTF align
        const ltfBias = marketState.trend?.direction || 'NEUTRAL';
        const htfBias = globalBias;

        if (ltfBias === htfBias) return 1.0; // Perfect alignment
        if (ltfBias === 'NEUTRAL') return 0.6; // HTF bias but LTF neutral
        return 0.2; // Conflicting bias
    }

    /**
     * Get structure strength score
     * @private
     */
    static _getStructureStrength(marketState) {
        let strength = 0;

        // BOS confirmed
        const bosCount = marketState.structures?.filter(s => s.markerType === 'BOS' && s.status !== 'FAILED').length || 0;
        strength += Math.min(bosCount * 0.3, 0.6);

        // MTF alignment
        if (marketState.mtfBiasAligned) {
            strength += 0.4;
        }

        return Math.min(strength, 1.0);
    }

    /**
     * Get volume confirmation score
     * @private
     */
    static _getVolumeConfirmation(marketState) {
        if (marketState.volumeAnalysis?.isInstitutional) return 1.0;
        if (marketState.volumeAnalysis?.relativeVolume > 1.5) return 0.7;
        return 0.3;
    }

    /**
     * Check if price is at major swing level
     * @private
     */
    static _isAtMajorLevel(currentPrice, swingPoints) {
        if (!swingPoints || swingPoints.length === 0) return false;

        // Check if within 0.2% of any major swing
        return swingPoints.some(swing => {
            const distance = Math.abs(swing.price - currentPrice) / currentPrice;
            return distance < 0.002 && (swing.touches >= 3 || swing.isMajor);
        });
    }

    /**
     * Check if market is overextended
     * @private
     */
    static _isOverextended(marketState) {
        // Check if price is in extreme premium/discount
        const trend = marketState.trend;
        if (!trend) return false;

        // Simple check: if trend strength > 0.85 for extended period
        return trend.strength > 0.85 && trend.duration > 20;
    }

    /**
     * Calculate consolidation probability
     * @param {Object} marketState - Current market state
     * @returns {number} Probability 0-100
     */
    static calculateConsolidationProbability(marketState) {
        let score = 0;

        // Low volatility (40 points)
        if (marketState.volatility?.state === 'LOW') score += 40;

        // Range regime (40 points)
        if (marketState.regime === 'RANGING') score += 40;

        // Balanced volume (20 points)
        if (!marketState.volumeAnalysis?.isInstitutional) score += 20;

        return Math.min(score, 100);
    }

    /**
     * Generate combined predictions for orchestrator (Phase 50)
     * @param {string} symbol
     * @param {Object} marketState
     * @returns {Object} Combined probabilities
     */
    static generatePredictions(symbol, marketState) {
        return {
            continuation: this.calculateContinuationProbability(marketState, marketState.mtf),
            reversal: this.calculateReversalProbability(marketState, marketState.swingPoints || []),
            liquidityRun: this.calculateLiquidityRunProbability(marketState.liquidityPools, marketState.currentPrice),
            consolidation: this.calculateConsolidationProbability(marketState)
        };
    }
}

