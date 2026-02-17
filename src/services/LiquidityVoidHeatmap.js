/**
 * Liquidity Void Heatmap (LVH)
 * Phase 6 Elite Accuracy Upgrade
 * 
 * Maps areas of "Price Vacuums" (Fair Value Gaps / Liquidity Voids)
 * where the market has moved so rapidly that institutional liquidity is missing.
 * These zones act as magnets that price must eventually fill.
 */
export class LiquidityVoidHeatmap {
    /**
     * Generate the heatmap of liquidity voids
     * @param {Array} candles 
     * @returns {Array} List of active voids with intensity
     */
    static generateHeatmap(candles) {
        if (!candles || candles.length < 5) return [];

        const voids = [];
        // Look through last 100 candles for unfilled imbalances
        for (let i = candles.length - 2; i > candles.length - 100 && i > 1; i--) {
            const c1 = candles[i - 1]; // Low of previous candle
            const c2 = candles[i];     // The big move
            const c3 = candles[i + 1]; // High of next candle

            // Bullish Void (Gap between C1 High and C3 Low)
            if (c3.low > c1.high) {
                const size = c3.low - c1.high;
                const equilibrium = c1.high + (size / 2);

                // Check if this void has been "filled" (revisited)
                const isFilled = this._checkIfFilled(candles.slice(i + 2), c1.high, c3.low);

                if (!isFilled) {
                    voids.push({
                        type: 'BULLISH_VOID',
                        top: c3.low,
                        bottom: c1.high,
                        equilibrium,
                        intensity: this._calculateIntensity(size, candles),
                        age: candles.length - i
                    });
                }
            }

            // Bearish Void (Gap between C1 Low and C3 High)
            if (c3.high < c1.low) {
                const size = c1.low - c3.high;
                const equilibrium = c3.high + (size / 2);

                const isFilled = this._checkIfFilled(candles.slice(i + 2), c3.high, c1.low);

                if (!isFilled) {
                    voids.push({
                        type: 'BEARISH_VOID',
                        top: c1.low,
                        bottom: c3.high,
                        equilibrium,
                        intensity: this._calculateIntensity(size, candles),
                        age: candles.length - i
                    });
                }
            }
        }

        return voids.sort((a, b) => b.intensity - a.intensity);
    }

    /**
     * Check if a void has been mitigated/filled
     * @private
     */
    static _checkIfFilled(futureCandles, low, high) {
        for (const c of futureCandles) {
            // If any future candle low/high pierces the equilibrium (50% fill), consider it mitigated
            const mid = low + (high - low) / 2;
            if (c.low <= mid && c.high >= mid) return true;
        }
        return false;
    }

    /**
     * Calculate how "magnetic" a void is
     * @private
     */
    static _calculateIntensity(size, candles) {
        const atr = this._calculateATR(candles, 14);
        return Math.min(1.0, size / (atr * 2)); // Larger gaps relative to ATR are more intense
    }

    static _calculateATR(candles, period) {
        if (candles.length < period) return 0;
        let sum = 0;
        for (let i = candles.length - period; i < candles.length; i++) {
            sum += (candles[i].high - candles[i].low);
        }
        return sum / period;
    }
}
