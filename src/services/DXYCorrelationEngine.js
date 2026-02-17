/**
 * DXY Correlation Engine (Inter-Market Vector - IMV)
 * Phase 6 Elite Accuracy Upgrade
 * 
 * Tracks the "Shadow Move" of the US Dollar Index (DXY) against currency pairs
 * to detect institutional divergence before the retail move occurs.
 */
export class DXYCorrelationEngine {
    /**
     * Calculate Inter-Market Vector (IMV)
     * @param {Array} assetCandles - Candles of the primary asset (e.g. EUR/USD)
     * @param {Array} dxyCandles - Candles of the DXY index
     * @returns {Object} IMV results
     */
    static calculateIMV(assetCandles, dxyCandles) {
        if (!assetCandles || !dxyCandles || assetCandles.length < 10 || dxyCandles.length < 10) {
            return { bias: 'NEUTRAL', divergence: 0, strength: 0 };
        }

        const recentAsset = assetCandles.slice(-10);
        const recentDXY = dxyCandles.slice(-10);

        // 1. Calculate Velocities (Rate of Change)
        const assetVelocity = this._calculateVelocity(recentAsset);
        const dxyVelocity = this._calculateVelocity(recentDXY);

        // 2. Detect Vector Divergence
        // Normally, EURUSD and DXY should have a correlation of ~ -1.0
        // If DXY moves and EURUSD stays flat, there's a "Shadow Move" pending.

        const correlation = this._calculateCorrelation(
            recentAsset.map(c => c.close),
            recentDXY.map(c => c.close)
        );

        // 3. Identification of "Institutional Front-Running"
        // If DXY velocity is strong but Asset velocity is weak = Divergence
        const divergence = Math.abs(dxyVelocity) - Math.abs(assetVelocity);

        let bias = 'NEUTRAL';
        let strength = 0;

        // If DXY is dropping fast (Bullish for EURUSD) but EURUSD hasn't reacted:
        if (dxyVelocity < -0.05 && Math.abs(assetVelocity) < 0.02) {
            bias = 'BULLISH_EXPECTED';
            strength = Math.abs(dxyVelocity) * 100;
        }
        // If DXY is climbing fast (Bearish for EURUSD) but EURUSD hasn't reacted:
        else if (dxyVelocity > 0.05 && Math.abs(assetVelocity) < 0.02) {
            bias = 'BEARISH_EXPECTED';
            strength = dxyVelocity * 100;
        }

        return {
            bias,
            correlation: parseFloat(correlation.toFixed(2)),
            divergence: parseFloat(divergence.toFixed(4)),
            strength: Math.min(parseFloat(strength.toFixed(2)), 100),
            rationale: this.generateRationale(bias, divergence, correlation)
        };
    }

    /**
     * Calculate Price Velocity
     * @private
     */
    static _calculateVelocity(candles) {
        const first = candles[0].close;
        const last = candles[candles.length - 1].close;
        return (last - first) / first;
    }

    /**
     * Pearson Correlation Coefficient
     * @private
     */
    static _calculateCorrelation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
        const sumX2 = x.reduce((a, b) => a + b * b, 0);
        const sumY2 = y.reduce((a, b) => a + b * b, 0);

        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        if (denominator === 0) return 0;
        return numerator / denominator;
    }

    static generateRationale(bias, divergence, correlation) {
        if (bias === 'BULLISH_EXPECTED') {
            return `DXY is dropping rapidly (${(divergence * 100).toFixed(2)}% vector) while price remains stagnant. Bullish institutional breakout expected.`;
        }
        if (bias === 'BEARISH_EXPECTED') {
            return `DXY is climbing rapidly (${(divergence * 100).toFixed(2)}% vector) while price remains stagnant. Bearish institutional breakdown expected.`;
        }
        if (correlation > -0.5) {
            return `Inverse correlation breakdown (Current: ${correlation.toFixed(2)}). Market is decoupled or DXY rotation in progress.`;
        }
        return `DXY correlation remains tight (${correlation.toFixed(2)}). Standard Inter-market flow.`;
    }
}
