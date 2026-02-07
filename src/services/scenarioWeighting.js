/**
 * Scenario Weighting & Conflict Resolution
 * 
 * Scores and ranks all market scenarios, resolves conflicts,
 * and forces a single dominant bias for clear decision-making.
 */

export class ScenarioWeighting {
    /**
     * Score all scenarios and select dominant one
     * @param {Array} scenarios - Array of scenario objects
     * @param {Object} marketState - Current market state
     * @param {Object} probabilities - Probabilistic engine output
     * @returns {Object} - Dominant scenario with weighted score
     */
    static selectDominantScenario(scenarios, marketState, probabilities) {
        if (!scenarios || scenarios.length === 0) {
            return {
                scenario: null,
                score: 0,
                bias: 'NO_EDGE',
                confidence: 0
            };
        }

        // Score each scenario
        const scoredScenarios = scenarios.map(scenario => ({
            ...scenario,
            score: this.calculateScenarioScore(scenario, marketState, probabilities)
        }));

        // Sort by score descending
        scoredScenarios.sort((a, b) => b.score - a.score);

        // Kill low-probability scenarios (score < 50)
        const viableScenarios = scoredScenarios.filter(s => s.score >= 50);

        if (viableScenarios.length === 0) {
            return {
                scenario: null,
                score: 0,
                bias: 'NO_EDGE',
                confidence: 0,
                reason: 'All scenarios scored below viability threshold (50)'
            };
        }

        // Return highest-scoring scenario as dominant
        const dominant = viableScenarios[0];

        return {
            scenario: dominant,
            score: dominant.score,
            bias: dominant.direction || 'NEUTRAL',
            confidence: dominant.score / 100,
            alternatives: viableScenarios.slice(1, 3), // Keep top 2 alternatives
            killed: scoredScenarios.length - viableScenarios.length
        };
    }

    /**
     * Calculate weighted scenario score
     * Formula: (HTF Bias × 0.40) + (Liquidity Proximity × 0.30) + (Structure × 0.20) - (News Risk × 0.10)
     * @param {Object} scenario - Scenario to score
     * @param {Object} marketState - Market state
     * @param {Object} probabilities - Probabilities from engine
     * @returns {number} - Score 0-100
     */
    static calculateScenarioScore(scenario, marketState, probabilities) {
        // 1. HTF Bias Weight (40 points)
        const htfBiasScore = this._getHTFBiasScore(scenario, marketState) * 40;

        // 2. Liquidity Proximity (30 points)
        const liquidityScore = this._getLiquidityProximityScore(scenario, marketState) * 30;

        // 3. Structure Alignment (20 points)
        const structureScore = this._getStructureAlignmentScore(scenario, marketState) * 20;

        // 4. News Risk Penalty (subtract up to 10 points)
        const newsRiskPenalty = this._getNewsRiskPenalty(marketState) * 10;

        const totalScore = htfBiasScore + liquidityScore + structureScore - newsRiskPenalty;

        return Math.max(Math.min(Math.round(totalScore), 100), 0);
    }

    /**
     * Get HTF bias alignment score
     * @private
     */
    static _getHTFBiasScore(scenario, marketState) {
        const htfBias = marketState.mtf?.globalBias || 'NEUTRAL';
        const scenarioDirection = scenario.direction;

        // Perfect alignment
        if (htfBias === scenarioDirection) return 1.0;

        // HTF neutral but scenario has direction
        if (htfBias === 'NEUTRAL') return 0.5;

        // Conflicting bias
        return 0.2;
    }

    /**
     * Get liquidity proximity score
     * @private
     */
    static _getLiquidityProximityScore(scenario, marketState) {
        const currentPrice = marketState.currentPrice;
        const target = scenario.target;

        if (!target || !currentPrice) return 0.3;

        // Find nearest liquidity pool to target
        const liquidityPools = marketState.liquidityPools || [];
        const nearbyPools = liquidityPools.filter(pool => {
            const distance = Math.abs(pool.price - target) / target;
            return distance < 0.01; // Within 1% of target
        });

        if (nearbyPools.length === 0) return 0.4;

        // Score based on pool strength
        const strongPools = nearbyPools.filter(p => p.strength === 'HIGH');
        if (strongPools.length > 0) return 1.0;

        const mediumPools = nearbyPools.filter(p => p.strength === 'MEDIUM');
        if (mediumPools.length > 0) return 0.7;

        return 0.5;
    }

    /**
     * Get structure alignment score
     * @private
     */
    static _getStructureAlignmentScore(scenario, marketState) {
        const structures = marketState.structures || [];
        const scenarioDirection = scenario.direction;

        // Count recent BOS in scenario direction
        const recentStructures = structures.slice(-10);
        const alignedBOS = recentStructures.filter(s =>
            s.markerType === 'BOS' &&
            s.status !== 'FAILED' &&
            ((scenarioDirection === 'BULLISH' && s.direction === 'up') ||
                (scenarioDirection === 'BEARISH' && s.direction === 'down'))
        ).length;

        if (alignedBOS >= 3) return 1.0;
        if (alignedBOS >= 2) return 0.75;
        if (alignedBOS >= 1) return 0.5;

        return 0.3;
    }

    /**
     * Get news risk penalty (0-1, higher = worse)
     * @private
     */
    static _getNewsRiskPenalty(marketState) {
        const newsRisk = marketState.news_risk || 'LOW';
        const technicalValidity = marketState.technical_validity || 'NORMAL';

        // High news risk = high penalty
        if (newsRisk === 'HIGH') return 1.0;
        if (newsRisk === 'MEDIUM') return 0.5;

        // Technical validity issues = moderate penalty
        if (technicalValidity === 'DEGRADED') return 0.6;
        if (technicalValidity === 'SUSPENDED') return 1.0;

        return 0.0;
    }

    /**
     * Resolve conflicts between scenarios
     * @param {Array} scenarios - Competing scenarios
     * @param {Object} marketState - Market state
     * @returns {Object} - Resolution result
     */
    static resolveConflicts(scenarios, marketState) {
        if (scenarios.length <= 1) {
            return {
                conflict: false,
                resolution: scenarios[0] || null
            };
        }

        // Check for directional conflict
        const bullishScenarios = scenarios.filter(s => s.direction === 'BULLISH');
        const bearishScenarios = scenarios.filter(s => s.direction === 'BEARISH');

        const hasConflict = bullishScenarios.length > 0 && bearishScenarios.length > 0;

        if (!hasConflict) {
            return {
                conflict: false,
                resolution: scenarios[0]
            };
        }

        // Resolve using HTF bias as tiebreaker
        const htfBias = marketState.mtf?.globalBias || 'NEUTRAL';

        if (htfBias === 'BULLISH') {
            return {
                conflict: true,
                resolution: bullishScenarios[0],
                reason: 'HTF bias favors bullish scenario',
                suppressed: bearishScenarios.length
            };
        } else if (htfBias === 'BEARISH') {
            return {
                conflict: true,
                resolution: bearishScenarios[0],
                reason: 'HTF bias favors bearish scenario',
                suppressed: bullishScenarios.length
            };
        } else {
            // No HTF bias - use highest probability
            const sortedByProb = scenarios.sort((a, b) => (b.probability || 0) - (a.probability || 0));
            return {
                conflict: true,
                resolution: sortedByProb[0],
                reason: 'Highest probability scenario selected',
                suppressed: scenarios.length - 1
            };
        }
    }

    /**
     * Force single dominant bias across all analysis
     * @param {Object} analysis - Full analysis object
     * @returns {string} - BULLISH | BEARISH | NEUTRAL | NO_EDGE
     */
    static forceDominantBias(analysis) {
        const { marketState, setups, scenarios, probabilities } = analysis;

        // 1. Check if prediction already exists (from Phase 1)
        if (analysis.prediction?.bias) {
            return analysis.prediction.bias;
        }

        // 2. Score all setups
        const scoredSetups = setups?.map(setup => ({
            ...setup,
            score: this.calculateScenarioScore({
                direction: setup.direction,
                target: setup.targets?.[0]?.price
            }, marketState, probabilities)
        })) || [];

        scoredSetups.sort((a, b) => b.score - a.score);

        // 3. Kill setups below threshold
        const viableSetups = scoredSetups.filter(s => s.score >= 50);

        if (viableSetups.length === 0) {
            return 'NO_EDGE';
        }

        // 4. Return dominant direction
        return viableSetups[0].direction;
    }
}
