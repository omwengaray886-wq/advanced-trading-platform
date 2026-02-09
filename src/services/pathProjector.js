/**
 * HTF Path Projection Engine
 * 
 * Projects higher timeframe price paths with if-then conditional logic.
 * Maps liquidity targets and links invalidation to HTF structures.
 */

export class PathProjector {
    /**
     * Project next 1-3 liquidity targets
     * @param {Object} marketState - Current market state
     * @param {Object} htfData - Higher timeframe data (4H, 1D)
     * @returns {Array} Projected liquidity targets
     */
    static projectLiquidityTargets(marketState, htfData) {
        const currentPrice = marketState.currentPrice;
        const liquidityPools = marketState.liquidityPools || [];
        const trend = marketState.trend?.direction || 'NEUTRAL';

        // Separate pools by direction
        const upwardPools = liquidityPools
            .filter(p => p.price > currentPrice)
            .sort((a, b) => a.price - b.price);

        const downwardPools = liquidityPools
            .filter(p => p.price < currentPrice)
            .sort((a, b) => b.price - a.price);

        // Project based on HTF bias
        const htfBias = marketState.mtf?.globalBias || trend;
        const primaryPools = htfBias === 'BULLISH' ? upwardPools :
            htfBias === 'BEARISH' ? downwardPools :
                [...upwardPools.slice(0, 1), ...downwardPools.slice(0, 1)];

        // Take top 3 high-strength pools
        const targets = primaryPools
            .filter(p => p.strength === 'HIGH' || p.strength === 'MEDIUM')
            .slice(0, 3)
            .map((pool, index) => ({
                price: pool.price,
                label: pool.label,
                type: pool.type,
                probability: this._calculateTargetProbability(pool, currentPrice, index, marketState),
                reason: this._getTargetReason(pool, htfData),
                sequence: index + 1
            }));

        return targets;
    }

    /**
     * Create conditional if-then path tree
     * @param {number} currentPrice - Current market price
     * @param {Array} liquidityPools - Available liquidity pools
     * @param {Object} marketState - Market state
     * @returns {Object} Conditional path logic
     */
    static createConditionalPaths(currentPrice, liquidityPools, marketState) {
        const targets = this.projectLiquidityTargets(marketState, marketState.mtf);

        if (targets.length === 0) {
            return { paths: [] };
        }

        const paths = [];

        // Build if-then logic
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i];
            const nextTarget = targets[i + 1];

            const path = {
                condition: `IF price ${target.price > currentPrice ? 'breaks above' : 'breaks below'} ${target.price.toFixed(5)}`,
                then: nextTarget ?
                    `THEN target ${nextTarget.price.toFixed(5)} (${nextTarget.label})` :
                    `THEN monitor for reversal or continuation`,
                probability: target.probability,
                invalidation: this._getPathInvalidation(target, currentPrice, marketState)
            };

            paths.push(path);
        }

        return {
            paths,
            primaryTarget: targets[0],
            secondaryTargets: targets.slice(1)
        };
    }

    /**
     * Link invalidation to HTF structures
     * @param {number} stopLoss - Current stop loss
     * @param {Array} htfStructures - HTF structure points
     * @param {Object} marketState - Market state
     * @returns {Object} Enhanced invalidation
     */
    static linkInvalidationToHTF(stopLoss, htfStructures, marketState) {
        const trend = marketState.trend?.direction || 'NEUTRAL';

        // Find nearest HTF structure that serves as invalidation
        const relevantStructures = htfStructures?.filter(s =>
            trend === 'BULLISH' ?
                (s.markerType === 'BOS' && s.price < stopLoss) :
                (s.markerType === 'BOS' && s.price > stopLoss)
        ) || [];

        if (relevantStructures.length === 0) {
            return {
                level: stopLoss,
                htfStructure: null,
                consequence: 'Local setup invalidation'
            };
        }

        const nearestStructure = relevantStructures[0];

        return {
            level: nearestStructure.price,
            htfStructure: nearestStructure.markerType,
            htfTimeframe: nearestStructure.timeframe || '4H',
            consequence: `HTF ${nearestStructure.markerType} invalidation - ${trend === 'BULLISH' ? 'bearish' : 'bullish'} regime shift likely`,
            confidence: 0.85
        };
    }

    /**
     * Calculate probability of reaching a target
     * @private
     */
    static _calculateTargetProbability(pool, currentPrice, sequenceIndex, marketState) {
        let probability = 70; // Base probability

        // Reduce for each subsequent target
        probability -= (sequenceIndex * 15);

        // Increase if HTF aligned
        if (marketState.mtfBiasAligned) {
            probability += 15;
        }

        // Increase for high-strength pools
        if (pool.strength === 'HIGH') {
            probability += 10;
        }

        // Phase 5: Bayesian Booster
        // If probability is already high, Bayesian confirmation pushes it towards certain institutional draw.
        if (marketState.orderFlow?.bias === marketState.mtf?.globalBias) {
            probability += 10;
        }

        // Reduce if far from current price
        const distancePercent = Math.abs(pool.price - currentPrice) / currentPrice;
        if (distancePercent > 0.05) { // > 5% away
            probability -= 20;
        }

        return Math.max(Math.min(probability, 95), 20);
    }

    /**
     * Get target reason based on HTF data
     * @private
     */
    static _getTargetReason(pool, htfData) {
        const reasons = [];

        if (pool.type === 'BUY_SIDE') {
            reasons.push('Buy-side liquidity pool');
        } else if (pool.type === 'SELL_SIDE') {
            reasons.push('Sell-side liquidity pool');
        }

        if (pool.strength === 'HIGH') {
            reasons.push('major institutional level');
        }

        if (pool.label?.includes('Equal')) {
            reasons.push('equal highs/lows formation');
        }

        return reasons.join(', ') || 'Liquidity target';
    }

    /**
     * Get path invalidation level
     * @private
     */
    static _getPathInvalidation(target, currentPrice, marketState) {
        const trend = marketState.trend?.direction || 'NEUTRAL';

        // Invalidation is opposite side of current price
        if (trend === 'BULLISH') {
            // For bullish path, invalidation is below
            const swings = marketState.swingPoints?.filter(s => s.type === 'LOW') || [];
            if (swings.length > 0) {
                return swings[swings.length - 1].price;
            }
        } else if (trend === 'BEARISH') {
            // For bearish path, invalidation is above
            const swings = marketState.swingPoints?.filter(s => s.type === 'HIGH') || [];
            if (swings.length > 0) {
                return swings[swings.length - 1].price;
            }
        }

        return null;
    }

    /**
     * Generate path roadmap (visual description)
     * @param {Object} marketState - Market state
     * @param {Object} htfData - HTF data
     * @returns {Object} Path roadmap
     */
    static generateRoadmap(marketState, htfData) {
        const targets = this.projectLiquidityTargets(marketState, htfData);
        const paths = this.createConditionalPaths(marketState.currentPrice, marketState.liquidityPools, marketState);

        return {
            currentPosition: marketState.currentPrice,
            htfBias: marketState.mtf?.globalBias || 'NEUTRAL',
            targets,
            conditionalPaths: paths.paths,
            primaryObjective: paths.primaryTarget,
            roadmapSummary: this._generateRoadmapSummary(paths, marketState)
        };
    }

    /**
     * Generate human-readable roadmap summary
     * @private
     */
    static _generateRoadmapSummary(paths, marketState) {
        const htfBias = marketState.mtf?.globalBias || 'NEUTRAL';

        if (!paths.primaryTarget) {
            return 'No clear liquidity targets identified. Monitor for directional catalyst.';
        }

        const direction = paths.primaryTarget.price > marketState.currentPrice ? 'upside' : 'downside';
        const summary = `HTF ${htfBias} bias targeting ${direction} liquidity at ${paths.primaryTarget.price.toFixed(5)} (${paths.primaryTarget.label}). `;

        if (marketState.mtfBiasAligned) {
            return summary + `Institutional convergence detected: High-TF draw is in perfect sync with local setup.`;
        }

        if (paths.secondaryTargets.length > 0) {
            return summary + `Extension targets: ${paths.secondaryTargets.map(t => t.price.toFixed(5)).join(', ')}.`;
        }

        return summary + 'Monitor for follow-through or rejection.';
    }
}
