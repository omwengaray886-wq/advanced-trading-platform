/**
 * Pattern Learning Engine
 * Tracks the outcome of technical patterns and adapts detection thresholds
 * based on regime and historical win rate.
 */
import { db } from '../lib/firebase.js';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export class PatternLearningEngine {
    constructor() {
        this.collectionName = 'pattern_outcomes';
        this.baseThresholds = {
            ORDER_BLOCK: { volumeRatio: 1.5, bodyPercent: 0.6 },
            FVG: { minGapSize: 0.001, displacement: 1.2 },
            BREAKER: { sweepRequirement: true, displacement: 1.5 }
        };
    }

    /**
     * Track a pattern outcome
     */
    async trackOutcome(patternId, type, result, metadata = {}) {
        try {
            await addDoc(collection(db, this.collectionName), {
                patternId,
                type,
                result, // 'WIN', 'LOSS', 'INVALIDATED'
                timestamp: Date.now(),
                regime: metadata.regime || 'UNKNOWN',
                symbol: metadata.symbol,
                timeframe: metadata.timeframe,
                context: metadata.context || {}
            });
        } catch (error) {
            console.error('[LearningEngine] Failed to track outcome:', error);
        }
    }

    /**
     * Calculate adaptive thresholds based on historical performance
     */
    async getAdaptiveThresholds(type, regime, timeframe) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('type', '==', type),
                where('regime', '==', regime),
                where('timeframe', '==', timeframe),
                orderBy('timestamp', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            const outcomes = snapshot.docs.map(doc => doc.data());

            if (outcomes.length < 10) return this.baseThresholds[type] || {};

            const winRate = outcomes.filter(o => o.result === 'WIN').length / outcomes.length;

            // Adjust thresholds based on win rate
            // If win rate is low, tighten thresholds (require higher quality)
            // If win rate is high, we can be slightly more permissive
            const adjustment = winRate < 0.4 ? 1.2 : winRate > 0.6 ? 0.9 : 1.0;

            const base = this.baseThresholds[type] || {};
            const adaptive = {};

            Object.keys(base).forEach(key => {
                if (typeof base[key] === 'number') {
                    adaptive[key] = base[key] * adjustment;
                } else {
                    adaptive[key] = base[key];
                }
            });

            return adaptive;
        } catch (error) {
            console.warn(`[LearningEngine] Error calculating adaptive thresholds for ${type}:`, error);
            return this.baseThresholds[type] || {};
        }
    }

    /**
     * Static helper for quick assessment without historical DB call
     */
    static getVolatilityAdjustedThreshold(baseValue, volatility) {
        // Higher volatility requires stricter thresholds to avoid noise
        const volMultiplier = 1 + (volatility * 2);
        return baseValue * volMultiplier;
    }
}

export const patternLearningEngine = new PatternLearningEngine();
