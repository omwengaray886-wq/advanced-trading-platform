/**
 * Liquidity Sweep Detector
 * Identifies institutional "Wick Sweeps" of major liquidity pools.
 */
export class LiquiditySweepDetector {
    /**
     * Detect Liquidity Sweeps in real-time
     * @param {Array} candles - Market candles
     * @param {Array} liquidityPools - Identified liquidity pools (STOP_POOL, INDUCEMENT)
     * @returns {Object} - Detected sweep information
     */
    static detectSweeps(candles, liquidityPools) {
        if (!candles || candles.length < 5 || !liquidityPools || liquidityPools.length === 0) {
            return null;
        }

        const currentCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];
        // Volume Climax calculation: Current volume should be significantly higher than average
        const avgVolume = candles.slice(-20, -1).reduce((sum, c) => sum + (c.volume || 0), 0) / 19;
        const volumeSurge = currentCandle.volume > (avgVolume * 1.5);

        for (const pool of liquidityPools) {
            const price = pool.price;

            // Bullish Sweep: Price wicks below a Sell-Side Liquidity Pool but closes above it
            if (pool.side === 'SELL_SIDE') {
                const sweptLevel = currentCandle.low < price;
                const closedAbove = currentCandle.close > price;
                const prevAbove = prevCandle.low > price;

                if (sweptLevel && closedAbove && prevAbove) {
                    return {
                        type: 'BULLISH_SWEEP',
                        sweptPrice: price,
                        poolType: pool.type,
                        strength: pool.strength,
                        isConfirmedByVolume: volumeSurge,
                        relativeDepth: ((price - currentCandle.low) / price) * 100,
                        label: `Sweep of ${pool.label}`,
                        rationale: `Price manipulated below ${price.toFixed(5)} before closing back inside. ${volumeSurge ? 'Confirmed by institutional volume surge.' : 'Moderate volume participation.'}`
                    };
                }
            }

            // Bearish Sweep: Price wicks above a Buy-Side Liquidity Pool but closes below it
            if (pool.side === 'BUY_SIDE') {
                const sweptLevel = currentCandle.high > price;
                const closedBelow = currentCandle.close < price;
                const prevBelow = prevCandle.high < price;

                if (sweptLevel && closedBelow && prevBelow) {
                    return {
                        type: 'BEARISH_SWEEP',
                        sweptPrice: price,
                        poolType: pool.type,
                        strength: pool.strength,
                        isConfirmedByVolume: volumeSurge,
                        relativeDepth: ((currentCandle.high - price) / price) * 100,
                        label: `Sweep of ${pool.label}`,
                        rationale: `Price manipulated above ${price.toFixed(5)} before closing back inside. ${volumeSurge ? 'Confirmed by institutional volume surge.' : 'Moderate volume participation.'}`
                    };
                }
            }
        }

        return null;
    }
}
