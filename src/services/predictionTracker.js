import { db } from './db.js';
import { gsRefiner } from './GSRefiner.js';

const statsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class PredictionTracker {
    static async track(prediction, symbol) {
        if (!prediction || !prediction.id || prediction.bias === 'NO_EDGE') return;

        try {
            // Validate snapshot data
            const snapshotPrice = prediction.snapshot?.price || 0;
            const timestamp = prediction.timestamp || Date.now();

            const data = {
                ...prediction,
                timestamp, // Ensure timestamp exists
                symbol,
                outcome: 'PENDING',
                evaluatedAt: null,
                metrics: {
                    maxPriceSeen: snapshotPrice,
                    minPriceSeen: snapshotPrice
                },
                // Fallback for missing fields that Firestore might reject
                snapshot: {
                    ...(prediction.snapshot || {}),
                    price: snapshotPrice
                }
            };

            // Use the db service to save (will need a new method savePrediction)
            await db.savePrediction(prediction.id, data);
            console.log(`[PredictionTracker] Saved: ${prediction.id}`);
        } catch (e) {
            console.error('[PredictionTracker] Error saving prediction:', e);
        }
    }

    /**
     * Evaluate pending predictions based on latest price action
     * @param {string} symbol - Symbol to check
     * @param {Object} currentCandle - Latest candle data
     */
    static async evaluatePending(symbol, currentCandle) {
        try {
            const pending = await db.getPredictions(symbol, 'PENDING', 20);
            const now = Date.now();

            for (const p of pending) {
                let outcome = 'PENDING';
                let reason = '';

                // 1. Check Expiry
                if (now > p.expiresAt) {
                    outcome = 'EXPIRED';
                    reason = 'Time horizon reached without target/invalidation';
                }

                // 2. Check Hit/Fail
                if (p.bias === 'BULLISH') {
                    if (currentCandle.low <= p.invalidation) {
                        outcome = 'FAIL';
                        reason = 'Invalidation level breached';
                    } else if (currentCandle.high >= p.target) {
                        outcome = 'HIT';
                        reason = 'Target level reached';
                    }
                } else if (p.bias === 'BEARISH') {
                    if (currentCandle.high >= p.invalidation) {
                        outcome = 'FAIL';
                        reason = 'Invalidation level breached';
                    } else if (currentCandle.low <= p.target) {
                        outcome = 'HIT';
                        reason = 'Target level reached';
                    }
                }

                if (outcome !== 'PENDING') {
                    await db.updatePrediction(p.id, {
                        outcome,
                        evaluatedAt: now,
                        outcomeReason: reason,
                        finalPrice: currentCandle.close
                    });
                    console.log(`[PredictionTracker] Evaluated ${p.id}: ${outcome}`);

                    // Phase 6 Elite: GSR Learning - Record DNA if it was a HIT
                    if (outcome === 'HIT' && p.dna) {
                        // Reconstruct a pseudo-candle history from the saved DNA for the refiner
                        // In a more robust system, we would store the raw candles, 
                        // but recording the extracted DNA directly is efficient.
                        gsRefiner.recordSuccess(symbol, p.dna);
                    }
                }
            }
        } catch (e) {
            console.error('[PredictionTracker] Error evaluating predictions:', e);
        }
    }

    /**
     * Get performance stats for a symbol
     */
    static async getStats(symbol) {
        // Phase 55: Robustness - Use caching to prevent Firestore rate limiting and analysis lag
        const cached = statsCache.get(symbol);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            return cached.data;
        }

        try {
            const trades = await db.getPredictions(symbol, null, 100);

            const completed = trades.filter(t => t.outcome !== 'PENDING' && t.outcome !== 'EXPIRED');
            if (completed.length === 0) return { accuracy: 0, total: 0 };

            const hits = completed.filter(t => t.outcome === 'HIT').length;
            const accuracy = (hits / completed.length) * 100;

            // Phase 52: Edge Attribution
            const attribution = { premium: 0, strong: 0, tradable: 0 };
            ['PREMIUM EDGE', 'STRONG EDGE', 'TRADABLE'].forEach(label => {
                const group = completed.filter(t => t.edgeLabel === label);
                if (group.length > 0) {
                    const groupHits = group.filter(t => t.outcome === 'HIT').length;
                    attribution[label.split(' ')[0].toLowerCase()] = Math.round((groupHits / group.length) * 100);
                }
            });

            // Phase 52: Strategy-Specific Performance (Granular Learning)
            const strategyPerformance = {};
            const uniqueStrategies = [...new Set(completed.map(t => t.strategy))];

            uniqueStrategies.forEach(strat => {
                if (!strat) return;
                const stratTrades = completed.filter(t => t.strategy === strat);
                const stratHits = stratTrades.filter(t => t.outcome === 'HIT').length;
                strategyPerformance[strat.toLowerCase()] = {
                    accuracy: Math.round((stratHits / stratTrades.length) * 100),
                    total: stratTrades.length,
                    score: stratHits // simple score for sorting
                };
            });

            const stats = {
                accuracy: Math.round(accuracy),
                total: completed.length,
                hits,
                fails: completed.length - hits,
                last10: trades.slice(0, 10).map(t => t.outcome),
                edgeAttribution: attribution,
                strategyPerformance, // NEW: Granular stats for Bayesian Engine
                recentHistory: trades.slice(0, 20) // For the "Audit Receipt" table
            };

            statsCache.set(symbol, { data: stats, timestamp: Date.now() });
            return stats;
        } catch (e) {
            console.error('[PredictionTracker] Error getting stats:', e);
            return null;
        }
    }

    /**
     * Warm the cache for a symbol (Phase 74)
     */
    static async warmCache(symbol) {
        if (!symbol || statsCache.has(symbol)) return;
        console.log(`[PredictionTracker] Warming cache for ${symbol}...`);
        this.getStats(symbol).catch(() => { }); // Fire and forget
    }
}
