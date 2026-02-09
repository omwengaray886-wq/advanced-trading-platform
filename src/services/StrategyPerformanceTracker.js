/**
 * Strategy Performance Tracker (Phase 2 Accuracy Upgrade)
 * 
 * Tracks win/loss outcomes for each strategy and auto-adjusts weights
 * based on current market regime performance.
 */

import { db } from '../lib/firebase.js';
import { collection, doc, setDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export class StrategyPerformanceTracker {
    /**
     * Track a strategy outcome
     * @param {Object} outcome - Outcome data
     * @param {string} outcome.strategyName - Strategy name ('OrderBlock', 'FVG', etc.)
     * @param {string} outcome.result - 'WIN' or 'LOSS'
     * @param {string} outcome.marketRegime - Regime at time of signal
     * @param {string} outcome.symbol - Trading symbol
     * @param {number} outcome.confidence - Original confidence score
     */
    static async trackOutcome(outcome) {
        try {
            const outcomeId = `${outcome.symbol}_${Date.now()}`;
            const outcomeRef = doc(collection(db, 'strategyOutcomes'), outcomeId);

            await setDoc(outcomeRef, {
                ...outcome,
                timestamp: Date.now(),
                timestampReadable: new Date().toISOString()
            });

            console.log(`Strategy outcome tracked: ${outcome.strategyName} → ${outcome.result}`);
        } catch (error) {
            console.error('Failed to track strategy outcome:', error);
            // Don't throw - tracking failures should not break the platform
        }
    }

    /**
     * Get performance statistics for a strategy in a specific regime
     * @param {string} strategyName - Strategy name
     * @param {string} marketRegime - Optional regime filter
     * @param {number} lookbackDays - Days to look back (default: 30)
     * @returns {Promise<Object>} Performance stats
     */
    static async getStrategyPerformance(strategyName, marketRegime = null, lookbackDays = 30) {
        try {
            if (!strategyName) {
                console.warn('[StrategyPerformanceTracker] Missing strategyName in getStrategyPerformance');
                return { strategyName: 'UNKNOWN', marketRegime, sampleSize: 0, winRate: 0.5, weightMultiplier: 1.0, confidence: 'INVALID_INPUT' };
            }

            const cutoffTime = Date.now() - (lookbackDays * 24 * 60 * 60 * 1000);
            const outcomesRef = collection(db, 'strategyOutcomes');

            const q = query(
                outcomesRef,
                where('strategyName', '==', strategyName),
                where('timestamp', '>=', cutoffTime),
                orderBy('timestamp', 'desc'),
                limit(100)
            );

            const snapshot = await getDocs(q);
            let outcomes = [];
            snapshot.forEach(doc => outcomes.push(doc.data()));

            // Filter by regime if specified
            if (marketRegime) {
                outcomes = outcomes.filter(o => o.marketRegime === marketRegime);
            }

            if (outcomes.length === 0) {
                return {
                    strategyName,
                    marketRegime,
                    sampleSize: 0,
                    winRate: 0.5,
                    weightMultiplier: 1.0,
                    confidence: 'INSUFFICIENT_DATA'
                };
            }

            // Calculate metrics
            const wins = outcomes.filter(o => o.result === 'WIN').length;
            const losses = outcomes.filter(o => o.result === 'LOSS').length;
            const winRate = wins / (wins + losses);

            // Calculate weight multiplier
            const weightMultiplier = this._calculateWeightMultiplier(winRate);

            return {
                strategyName,
                marketRegime,
                sampleSize: outcomes.length,
                wins,
                losses,
                winRate,
                weightMultiplier,
                confidence: this._getConfidenceLevel(outcomes.length, winRate)
            };
        } catch (error) {
            console.error('Failed to get strategy performance:', error);
            return {
                strategyName,
                marketRegime,
                sampleSize: 0,
                winRate: 0.5,
                weightMultiplier: 1.0,
                confidence: 'ERROR'
            };
        }
    }

    /**
     * Get weight multipliers for all strategies in current regime
     * @param {string} currentRegime - Current market regime
     * @returns {Promise<Object>} Map of strategy names to weight multipliers
     */
    static async getAllStrategyWeights(currentRegime) {
        const strategies = [
            'OrderBlock',
            'FairValueGap',
            'BreakerBlock',
            'LiquiditySweep',
            'OptimalTradeEntry',
            'StructureBreakRetest'
        ];

        const weights = {};

        for (const strategy of strategies) {
            const performance = await this.getStrategyPerformance(strategy, currentRegime);
            weights[strategy] = performance.weightMultiplier;
        }

        return weights;
    }

    /**
     * Calculate weight multiplier based on win rate
     * @private
     */
    static _calculateWeightMultiplier(winRate) {
        if (winRate >= 0.85) return 1.40; // Exceptional performance
        if (winRate >= 0.75) return 1.25; // Excellent
        if (winRate >= 0.65) return 1.10; // Good
        if (winRate >= 0.55) return 1.0;  // Average
        if (winRate >= 0.45) return 0.90; // Below average
        if (winRate >= 0.35) return 0.75; // Poor
        return 0.60; // Very poor - significantly reduce weight
    }

    /**
     * Get confidence level based on sample size and win rate
     * @private
     */
    static _getConfidenceLevel(sampleSize, winRate) {
        if (sampleSize < 10) return 'INSUFFICIENT_DATA';
        if (sampleSize < 20) return 'LOW';
        if (sampleSize >= 50 && winRate >= 0.65) return 'HIGH';
        if (sampleSize >= 30) return 'MEDIUM';
        return 'LOW';
    }

    /**
     * Get recent strategy trends
     * @param {string} strategyName - Strategy name
     * @param {number} limit - Number of recent outcomes to analyze
     * @returns {Promise<Object>} Trend analysis
     */
    static async getStrategyTrend(strategyName, lookbackLimit = 20) {
        try {
            if (!strategyName) {
                console.warn('[StrategyPerformanceTracker] Missing strategyName in getStrategyTrend');
                return { trend: 'UNKNOWN', recentWinRate: 0.5, momentum: 'NEUTRAL' };
            }

            const outcomesRef = collection(db, 'strategyOutcomes');
            const q = query(
                outcomesRef,
                where('strategyName', '==', strategyName),
                orderBy('timestamp', 'desc'),
                limit(lookbackLimit)
            );

            const snapshot = await getDocs(q);
            const outcomes = [];
            snapshot.forEach(doc => outcomes.push(doc.data()));

            if (outcomes.length < 5) {
                return {
                    trend: 'UNKNOWN',
                    recentWinRate: 0.5,
                    momentum: 'NEUTRAL'
                };
            }

            // Calculate recent performance (last 10)
            const recent = outcomes.slice(0, Math.min(10, outcomes.length));
            const recentWins = recent.filter(o => o.result === 'WIN').length;
            const recentWinRate = recentWins / recent.length;

            // Calculate older performance (next 10)
            const older = outcomes.slice(10);
            const olderWins = older.filter(o => o.result === 'WIN').length;
            const olderWinRate = older.length > 0 ? olderWins / older.length : recentWinRate;

            // Determine trend
            const delta = recentWinRate - olderWinRate;
            let trend, momentum;

            if (delta > 0.15) {
                trend = 'IMPROVING';
                momentum = 'STRONG_POSITIVE';
            } else if (delta > 0.05) {
                trend = 'IMPROVING';
                momentum = 'POSITIVE';
            } else if (delta < -0.15) {
                trend = 'DECLINING';
                momentum = 'STRONG_NEGATIVE';
            } else if (delta < -0.05) {
                trend = 'DECLINING';
                momentum = 'NEGATIVE';
            } else {
                trend = 'STABLE';
                momentum = 'NEUTRAL';
            }

            return {
                trend,
                recentWinRate,
                olderWinRate,
                delta,
                momentum,
                sampleSize: outcomes.length
            };
        } catch (error) {
            console.error('Failed to get strategy trend:', error);
            return {
                trend: 'UNKNOWN',
                recentWinRate: 0.5,
                momentum: 'NEUTRAL'
            };
        }
    }
}
