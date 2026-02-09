/**
 * Probabilistic Forecast Engine
 * 
 * Provides Bayesian probability weighting for market scenarios.
 * Calculates likelihood of continuation, reversal, and liquidity events
 * with time-based confidence decay and Market Obligation overrides.
 */

import { bayesianEngine } from './BayesianInferenceEngine.js';
import { MarketObligationEngine } from '../analysis/MarketObligationEngine.js';

export class ProbabilisticEngine {
    /**
     * Generate combined predictions with dynamic Bayesian weighting
     * @param {string} symbol
     * @param {Object} marketState
     * @returns {Object} Combined probabilities
     */
    static async generatePredictions(symbol, marketState) {
        // 1. Get Base Bayesian Priors for this asset/regime
        // This tells us: "How often do breakdowns actually work in this current volatility?"
        const regime = marketState.regime || 'RANGING';
        const continuationPrior = await bayesianEngine.getPosteriorCredibility(symbol, 'CONTINUATION', regime);
        const reversalPrior = await bayesianEngine.getPosteriorCredibility(symbol, 'REVERSAL', regime);

        // 2. Calculate Component Probabilities
        const P_Continuation = this.calculateContinuationProbability(marketState, marketState.mtf, continuationPrior);
        const P_Reversal = this.calculateReversalProbability(marketState, marketState.swingPoints || [], reversalPrior);
        const P_LiquidityRun = this.calculateLiquidityRunProbability(marketState.liquidityPools, marketState.currentPrice, marketState.obligations);
        const P_Consolidation = this.calculateConsolidationProbability(marketState);

        return {
            continuation: P_Continuation,
            reversal: P_Reversal,
            liquidityRun: P_LiquidityRun,
            consolidation: P_Consolidation,
            priors: {
                continuation: continuationPrior,
                reversal: reversalPrior
            }
        };
    }

    /**
     * Get dynamic weights based on market regime and volatility
     * @param {string} regime - RANGING | TRENDING | VOLATILE
     * @param {Object} volatility - Volatility state object
     * @returns {Object} Weight configuration
     */
    static getDynamicWeights(regime, volatility) {
        const volLevel = typeof volatility === 'string' ? volatility : (volatility?.volatilityState?.level || 'MODERATE');

        // Default weights (Balanced)
        let weights = {
            bayesian: 30,
            htf: 20,
            structure: 20,
            volume: 20,
            obligation: 10,
            traps: 20 // for reversal logic
        };

        if (regime === 'TRENDING') {
            weights.bayesian = 25;
            weights.htf = 35;       // Increase weight of HTF alignment
            weights.structure = 25; // Increase weight of BOS/OrderBlocks
            weights.volume = 15;
            weights.obligation = 0; // In strong trends, we don't care about magnets as much
        } else if (regime === 'RANGING') {
            weights.bayesian = 35;
            weights.htf = 10;       // Decrease HTF influence in a range
            weights.structure = 15;
            weights.volume = 25;    // Increase volume profile / exhaustion weight
            weights.obligation = 15; // Magnets are stronger in ranges
            weights.traps = 40;     // Liquidity sweeps are KING in ranges
        }

        // Volatility fine-tuning
        if (volLevel === 'HIGH' || volLevel === 'EXTREME') {
            weights.bayesian = 40;  // Trust history more when it's chaos
            weights.traps += 10;    // More fakeouts in high vol
            weights.htf -= 5;
        }

        return weights;
    }

    /**
     * Calculate probability of trend continuation
     */
    static calculateContinuationProbability(marketState, mtfData, priorStats) {
        const weights = this.getDynamicWeights(marketState.regime, marketState.volatility);

        // Base: Dynamic Bayesian weight
        let probability = priorStats.probability * weights.bayesian;

        // 1. HTF Bias & Structure (Dynamic Weights)
        const htfBiasWeight = this._getHTFBiasWeight(marketState, mtfData);
        const structureStrength = this._getStructureStrength(marketState);
        probability += (htfBiasWeight * weights.htf) + (structureStrength * weights.structure);

        // 2. Volume & Order Flow
        const volumeConfirmation = this._getVolumeConfirmation(marketState);
        probability += (volumeConfirmation * weights.volume);

        // 3. Market Obligation Override
        const obligation = marketState.obligations?.primaryObligation;
        if (obligation && obligation.urgency > 80 && weights.obligation > 0) {
            const trendDir = marketState.trend?.direction || 'NEUTRAL';
            const obligationDir = obligation.price > marketState.currentPrice ? 'BULLISH' : 'BEARISH';

            if (trendDir === obligationDir) {
                probability += weights.obligation + 5; // Bonus for alignment
            } else {
                probability -= weights.obligation * 2; // Penalty for conflict
            }
        }

        return Math.min(Math.round(probability), 100);
    }

    /**
     * Calculate probability of reversal
     */
    static calculateReversalProbability(marketState, swingPoints, priorStats) {
        const weights = this.getDynamicWeights(marketState.regime, marketState.volatility);

        // Base: Dynamic Bayesian weight
        let probability = priorStats.probability * weights.bayesian;

        // 1. Standard Technicals
        if (marketState.divergence?.detected) probability += 15;
        if (marketState.volumeAnalysis?.exhaustion) probability += 15;
        if (this._isAtMajorLevel(marketState.currentPrice, swingPoints)) probability += 10;

        // 2. Failed Patterns (The "Trap" Logic)
        if (marketState.liquiditySweep) {
            probability += weights.traps;

            // Boost if verified by absorption
            if (marketState.liquiditySweep.isConfirmedByAbsorption) {
                probability += 10;
            }
        }

        // 3. Obligation-Driven Reversal
        const obligation = marketState.obligations?.primaryObligation;
        if (obligation && obligation.urgency > 75) {
            const trendDir = marketState.trend?.direction || 'NEUTRAL';
            const obligationDir = obligation.price > marketState.currentPrice ? 'BULLISH' : 'BEARISH';

            if (trendDir !== 'NEUTRAL' && trendDir !== obligationDir) {
                probability += 20;
            }
        }

        return Math.min(Math.round(probability), 100);
    }

    /**
     * Calculate probability of liquidity run
     * Now heavily weighted by Market Obligation Urgency
     */
    static calculateLiquidityRunProbability(liquidityPools, currentPrice, obligationsState) {
        // If we have a calculated "Primary Obligation", use that directly
        const primaryOb = obligationsState?.primaryObligation;

        if (primaryOb && primaryOb.type.includes('LIQUIDITY')) {
            return {
                probability: primaryOb.urgency, // 0-100 derived from ObligationEngine
                target: primaryOb.price,
                type: primaryOb.type,
                label: `Magnet: ${primaryOb.description}`
            };
        }

        // Fallback to minimal logic if no strong obligation
        return { probability: 0, target: null };
    }

    /**
     * Apply confidence decay over time
     */
    static applyConfidenceDecay(initialProbability, timeSinceSetup, halfLifeMs = 4 * 60 * 60 * 1000) {
        const decayRate = Math.log(2) / halfLifeMs;
        const decayedProbability = initialProbability * Math.exp(-decayRate * timeSinceSetup);
        return Math.max(Math.round(decayedProbability), 0);
    }

    // --- Helpers (Same as before, simplified) ---

    static _getHTFBiasWeight(marketState, mtfData) {
        const globalBias = marketState.mtf?.globalBias || 'NEUTRAL';
        if (globalBias === 'NEUTRAL') return 0.5;
        return (marketState.trend?.direction === globalBias) ? 1.0 : 0.2;
    }

    static _getStructureStrength(marketState) {
        const bosCount = marketState.structures?.filter(s => s.markerType === 'BOS' && s.status !== 'FAILED').length || 0;
        return Math.min(bosCount * 0.25, 1.0);
    }

    static _getVolumeConfirmation(marketState) {
        if (marketState.volumeAnalysis?.isInstitutional) return 1.0;
        return marketState.volumeAnalysis?.relativeVolume > 1.5 ? 0.7 : 0.4;
    }

    static _isAtMajorLevel(currentPrice, swingPoints) {
        if (!swingPoints) return false;
        return swingPoints.some(swing => {
            const distance = Math.abs(swing.price - currentPrice) / currentPrice;
            return distance < 0.002 && (swing.touches >= 3 || swing.isMajor);
        });
    }

    static calculateConsolidationProbability(marketState) {
        let score = 0;
        if (marketState.volatility?.state === 'LOW') score += 40;
        if (marketState.regime === 'RANGING') score += 40;
        return Math.min(score, 100);
    }
}

