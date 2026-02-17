/**
 * MTF Equilibrium Tracker
 * Phase 6 Elite Accuracy Upgrade
 * 
 * Tracks the Premium vs. Discount pricing across multiple timeframes.
 * Ensure that we are never buying in a "Premium" (overbought) zone 
 * or selling in a "Discount" (oversold) zone relative to institutional ranges.
 */
export class MTFEquilibriumTracker {
    /**
     * Analyze equilibrium across multiple timeframes
     * @param {Object} marketState 
     * @returns {Object} Equilibrium profile
     */
    static analyze(marketState) {
        const currentPrice = marketState.currentPrice || marketState.price;
        const mtf = marketState.mtf || {};

        const results = {
            '15m': this._getZone(currentPrice, mtf['15m']),
            '1h': this._getZone(currentPrice, mtf['1h']),
            '4h': this._getZone(currentPrice, mtf['4h'])
        };

        // Overall rating: 1.0 (Discount), -1.0 (Premium)
        let aggregateScore = 0;
        Object.values(results).forEach(r => {
            if (r.zone === 'DISCOUNT') aggregateScore += 1;
            else if (r.zone === 'PREMIUM') aggregateScore -= 1;
        });

        return {
            zones: results,
            aggregate: aggregateScore / 3, // -1 to 1
            bias: aggregateScore > 0 ? 'DISCOUNT_FAVORED' : (aggregateScore < 0 ? 'PREMIUM_FAVORED' : 'EQUILIBRIUM'),
            isBalanced: Math.abs(aggregateScore) < 0.3
        };
    }

    /**
     * Determine if price is in Premium or Discount for a range
     * @private
     */
    static _getZone(price, tfData) {
        if (!tfData || !tfData.high || !tfData.low) return { zone: 'UNKNOWN', percentile: 0.5 };

        const range = tfData.high - tfData.low;
        const percentile = (price - tfData.low) / range;

        return {
            zone: percentile > 0.5 ? 'PREMIUM' : 'DISCOUNT',
            percentile: parseFloat(percentile.toFixed(2)),
            distanceFromEq: Math.abs(percentile - 0.5)
        };
    }
}
