/**
 * Parameter Optimizer (Phase 6)
 * 
 * Automated Hyperparameter Tuning.
 * Tests different indicator settings on recent history to find the "best fit" for the current regime.
 * 
 * Usage:
 * const optimized = await ParameterOptimizer.optimizeRSI(candles);
 * // Returns { period: 9, score: 0.85 }
 */

import { calculateRSI, calculateMACD } from '../analysis/indicators.js';

export class ParameterOptimizer {

    /**
     * Find best RSI period for recent price action
     * @param {Array} candles - Recent history (e.g. last 500 bars)
     */
    static optimizeRSI(candles) {
        if (!candles || candles.length < 200) return { period: 14 }; // Default fallback

        const variations = [9, 14, 21, 25];
        let bestParams = { period: 14, score: -Infinity };

        for (const period of variations) {
            const rsi = calculateRSI(candles, period);
            const score = this._backtestMeanReversion(candles, rsi, 30, 70); // Test standard levels

            if (score > bestParams.score) {
                bestParams = { period, score };
            }
        }

        console.log(`[Optimizer] Best RSI Period: ${bestParams.period} (Score: ${bestParams.score.toFixed(2)})`);
        return bestParams;
    }

    /**
     * Simple Backtest: Buy < 30, Sell > 70
     * Returns "Profit Factor" or "Win Rate" score
     */
    static _backtestMeanReversion(candles, indicator, lower, upper) {
        let signals = 0;
        let wins = 0;

        // Skip first 50 candles (warmup)
        for (let i = 50; i < candles.length - 5; i++) {
            const val = indicator[i];
            const prev = indicator[i - 1];

            if (!val || !prev) continue;

            const price = candles[i].close;
            const future = candles[i + 5].close; // Look 5 bars ahead

            // Long Signal: Cross above lower
            if (prev < lower && val >= lower) {
                signals++;
                if (future > price * 1.001) wins++; // +0.1% gain
            }

            // Short Signal: Cross below upper
            if (prev > upper && val <= upper) {
                signals++;
                if (future < price * 0.999) wins++; // +0.1% gain (drop)
            }
        }

        if (signals < 3) return 0; // Not enough signals to judge
        return (wins / signals); // Simple Win Rate
    }
}
