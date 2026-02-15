/**
 * Probabilistic Forecast Engine
 * 
 * Provides Bayesian probability weighting for market scenarios.
 * Calculates likelihood of continuation, reversal, and liquidity events
 * with time-based confidence decay and Market Obligation overrides.
 */

import { bayesianEngine } from './BayesianInferenceEngine.js';
import { MarketObligationEngine } from '../analysis/MarketObligationEngine.js';
import { strategyPerformanceTracker } from './StrategyPerformanceTracker.js';

export class ProbabilisticEngine {
    /**
     * Generate combined predictions using Ensemble Consensus (Phase 3)
     * Aggregates votes from 4 independent models: Structural, Volume, Sentiment, Statistical.
     */
    static async generatePredictions(symbol, marketState) {
        const regime = marketState.regime || 'RANGING';

        // 1. Get Statistical Priors (The 'Base Rate')
        const continuationPrior = await bayesianEngine.getPosteriorCredibility(symbol, 'CONTINUATION', regime);
        const reversalPrior = await bayesianEngine.getPosteriorCredibility(symbol, 'REVERSAL', regime);

        // 2. Calculate Ensemble Consensus for each scenario
        const P_Continuation = this.calculateEnsembleProbability('CONTINUATION', marketState, continuationPrior);
        const P_Reversal = this.calculateEnsembleProbability('REVERSAL', marketState, reversalPrior);

        // 3. specialized calculations
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
     * Calculate Ensemble Probability for a given scenario
     * Formula: (Struct * W_S) + (Vol * W_V) + (Sent * W_M) + (Stat * W_B)
     */
    static calculateEnsembleProbability(scenario, marketState, priorStats) {
        const weights = this.getEnsembleWeights(marketState.regime, marketState.volatility);

        // 1. Structural Model (Price Action, HTF, Levels)
        const scoreStruct = this._scoreStructuralModel(scenario, marketState);

        // 2. Volume Model (Order Flow, Delta, Liquidity)
        const scoreVol = this._scoreVolumeModel(scenario, marketState);

        // 3. Sentiment Model (AI Sentiment, COT, Open Interest)
        const scoreSent = this._scoreSentimentModel(scenario, marketState);

        // 4. Statistical Model (Bayesian History)
        const scoreStat = priorStats.probability * 100;

        // Weighted Average
        let ensembleScore = (
            (scoreStruct * weights.structural) +
            (scoreVol * weights.volume) +
            (scoreSent * weights.sentiment) +
            (scoreStat * weights.statistical)
        ) / 100; // weights sum to 100

        // Phase 5: Regime-Adaptive Confidence Modifier
        // Identify the likely strategy based on the scenario
        // CONTINUATION -> Trend Following
        // REVERSAL -> Mean Reversion / Divergence
        let strategyType = 'Institutional Continuation'; // Default
        if (scenario === 'REVERSAL') {
            strategyType = 'Market Maker Reversal';
        }

        // Apply dynamic multiplier from Tracker
        // If "Trend Following" is on a losing streak, this returns < 1.0 (e.g. 0.8)
        const performanceModifier = strategyPerformanceTracker.getDynamicWeight(strategyType);
        ensembleScore *= performanceModifier;

        // Bonus: Full Consensus Boost (If all models > 60%)
        if (scoreStruct > 60 && scoreVol > 60 && scoreSent > 60 && scoreStat > 50) {
            ensembleScore = Math.min(ensembleScore + 10, 99);
        }

        // Penalty: Major Conflict (Structure says Yes, Volume says No)
        if (Math.abs(scoreStruct - scoreVol) > 40) {
            ensembleScore *= 0.8; // Reduce confidence due to conflict
        }

        // Phase 6: Predictive Alpha Boost (Lead-Lag + AI Patterns)
        ensembleScore = this._applyPredictiveAlpha(ensembleScore, scenario, marketState);

        return Math.round(ensembleScore);
    }

    /**
     * Apply modifiers from Phase 6 Engines (Lead-Lag, Patterns)
     */
    static _applyPredictiveAlpha(baseScore, scenario, marketState) {
        let score = baseScore;
        const leadLag = marketState.leadLag;
        const patterns = marketState.patterns;

        // 1. Lead-Lag Influence
        if (leadLag && leadLag.detected) {
            const implication = this._normalizeDirection(leadLag.implication);
            const scDir = (scenario === 'CONTINUATION')
                ? this._normalizeDirection(marketState.trend?.direction)
                : (marketState.trend?.direction === 'BULLISH' ? 'BEARISH' : 'BULLISH'); // Reversal is opposite

            if (implication !== 'NEUTRAL') {
                if (implication === scDir) {
                    score += 15; // "Crystal Ball" confirmation
                } else {
                    score -= 15; // "Crystal Ball" divergence
                }
            }
        }

        // 2. Fractal Pattern Influence
        if (patterns && patterns.prediction !== 'NEUTRAL') {
            const patDir = this._normalizeDirection(patterns.prediction);
            const scDir = (scenario === 'CONTINUATION')
                ? this._normalizeDirection(marketState.trend?.direction)
                : (marketState.trend?.direction === 'BULLISH' ? 'BEARISH' : 'BULLISH');

            if (patDir === scDir) {
                // Boost by confidence (0.6 to 1.0) * 20
                score += (patterns.confidence * 20);
            } else {
                score -= 10;
            }
        }

        return Math.min(Math.max(score, 0), 99);
    }

    /**
     * Dynamic Weights for the Ensemble
     */
    static getEnsembleWeights(regime, volatility) {
        // Default: Balanced
        let weights = { structural: 35, volume: 30, sentiment: 15, statistical: 20 };

        if (regime === 'TRENDING') {
            weights = { structural: 45, volume: 25, sentiment: 10, statistical: 20 };
        } else if (regime === 'RANGING') {
            weights = { structural: 20, volume: 40, sentiment: 10, statistical: 30 }; // Volume/Stats matter more in chop
        }

        if (volatility?.level === 'HIGH') {
            weights.sentiment = 5; // Ignore sentiment in chaos
            weights.volume = 40;   // Trust hard volume
            weights.statistical = 25;
            weights.structural = 30;
        }

        return weights;
    }

    // === SUB-MODELS ===

    static _scoreStructuralModel(scenario, marketState) {
        let score = 50;
        const trendDir = this._normalizeDirection(marketState.trend?.direction);
        const htfDir = this._normalizeDirection(marketState.mtf?.globalBias);

        if (scenario === 'CONTINUATION') {
            // Trend Alignment
            if (trendDir !== 'NEUTRAL') score += 20;
            if (trendDir === htfDir) score += 15;

            // Structure
            const bosCount = marketState.structures?.filter(s => s.markerType === 'BOS' && s.status !== 'FAILED').length || 0;
            score += Math.min(bosCount * 5, 10);
        } else if (scenario === 'REVERSAL') {
            // Reversal Signs
            if (marketState.divergence?.detected) score += 20;
            if (this._isAtMajorLevel(marketState.currentPrice, marketState.swingPoints)) score += 15;
            if (marketState.liquiditySweep) score += 15; // Trap -> Reversal
        }

        return Math.min(Math.max(score, 0), 100);
    }

    static _scoreVolumeModel(scenario, marketState) {
        let score = 50;
        const isInst = marketState.volumeAnalysis?.isInstitutional;
        const exhaustion = marketState.volumeAnalysis?.exhaustion;

        if (scenario === 'CONTINUATION') {
            if (isInst) score += 25; // Big money pushing trend
            if (exhaustion) score -= 20; // Exhaustion is bad for continuation
        } else if (scenario === 'REVERSAL') {
            if (exhaustion) score += 25; // Exhaustion is good for reversal
            if (marketState.liquiditySweep?.isConfirmedByAbsorption) score += 20;
        }

        return Math.min(Math.max(score, 0), 100);
    }

    static _scoreSentimentModel(scenario, marketState) {
        let score = 50;
        const sentiment = marketState.sentiment || { label: 'NEUTRAL', score: 50 };
        const sentDir = this._normalizeDirection(sentiment.label);
        const trendDir = this._normalizeDirection(marketState.trend?.direction);

        if (scenario === 'CONTINUATION') {
            // Sentiment favoring trend
            if (sentDir === trendDir) score += 20;
            else if (sentDir !== 'NEUTRAL') score -= 15;
        } else if (scenario === 'REVERSAL') {
            // Sentiment extreme (Contrarian)
            if (sentiment.score > 80 || sentiment.score < 20) score += 20; // Extreme sentiment often precedes reversal
            if (sentDir !== trendDir) score += 10; // Divergence
        }

        return Math.min(Math.max(score, 0), 100);
    }

    // === EXISTING HELPERS ===

    static _normalizeDirection(d) {
        if (!d) return 'NEUTRAL';
        const upper = d.toUpperCase();
        if (['LONG', 'BULLISH', 'UP'].includes(upper)) return 'BULLISH';
        if (['SHORT', 'BEARISH', 'DOWN'].includes(upper)) return 'BEARISH';
        return 'NEUTRAL';
    }

    static _isAtMajorLevel(currentPrice, swingPoints) {
        if (!swingPoints) return false;
        return swingPoints.some(swing => {
            const distance = Math.abs(swing.price - currentPrice) / currentPrice;
            return distance < 0.002 && (swing.touches >= 3 || swing.isMajor);
        });
    }

    static calculateLiquidityRunProbability(liquidityPools, currentPrice, obligationsState) {
        const primaryOb = obligationsState?.primaryObligation;
        if (primaryOb && primaryOb.type.includes('LIQUIDITY')) {
            return {
                probability: primaryOb.urgency,
                target: primaryOb.price,
                type: primaryOb.type,
                label: `Magnet: ${primaryOb.description}`
            };
        }
        return { probability: 0, target: null };
    }

    static calculateConsolidationProbability(marketState) {
        let score = 0;
        if (marketState.volatility?.state === 'LOW') score += 40;
        if (marketState.regime === 'RANGING') score += 40;
        return Math.min(score, 100);
    }

    static applyConfidenceDecay(initialProbability, timeSinceSetup, halfLifeMs = 4 * 60 * 60 * 1000) {
        const decayRate = Math.log(2) / halfLifeMs;
        const decayedProbability = initialProbability * Math.exp(-decayRate * timeSinceSetup);
        return Math.max(Math.round(decayedProbability), 0);
    }
}

