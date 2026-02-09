/**
 * Sentiment Engine (Phase 6)
 * 
 * Tracks "Large Trader" and "Hedge Fund" positioning via COT (Commitment of Traders) proxy.
 * Since direct COT feeds are premium, we use algorithmic simulation based on price/volume.
 */
export class SentimentEngine {
    /**
     * Analyze macro sentiment for a given asset
     * @param {string} symbol - Asset symbol
     * @param {Array} dailyCandles - Last 90 days of price data
     * @param {string} assetClass - FOREX | CRYPTO | COMMODITY | INDEX
     * @returns {Object} { netPosition, bias, confidence }
     */
    static analyzeSentiment(symbol, dailyCandles, assetClass) {
        if (!dailyCandles || dailyCandles.length < 30) {
            return {
                netPosition: 0,
                bias: 'NEUTRAL',
                confidence: 'LOW',
                reason: 'Insufficient data for COT simulation'
            };
        }

        // 1. Simulate Large Trader Positioning
        const positioning = this._simulateCOT(dailyCandles, assetClass);

        // 2. Determine Macro Bias
        const bias = positioning.netPosition > 15 ? 'BULLISH' :
            positioning.netPosition < -15 ? 'BEARISH' : 'NEUTRAL';

        // 3. Calculate Confidence (based on strength of positioning)
        const confidence = Math.abs(positioning.netPosition) > 30 ? 'HIGH' :
            Math.abs(positioning.netPosition) > 15 ? 'MEDIUM' : 'LOW';

        return {
            netPosition: positioning.netPosition,
            bias,
            confidence,
            longInterest: positioning.longInterest,
            shortInterest: positioning.shortInterest,
            reason: this._generateReason(bias, positioning, assetClass)
        };
    }

    /**
     * Simulate COT positioning based on price/volume behavior
     * Institutional players tend to accumulate during consolidation and distribute during climax.
     */
    static _simulateCOT(dailyCandles, assetClass) {
        const recent60 = dailyCandles.slice(-60);

        let longInterest = 0;
        let shortInterest = 0;

        // Scan for accumulation/distribution signatures
        for (let i = 5; i < recent60.length; i++) {
            const candle = recent60[i];
            const prev5 = recent60.slice(i - 5, i);

            const avgVolume = prev5.reduce((sum, c) => sum + (c.volume || 0), 0) / 5;
            const priceChange = candle.close - prev5[0].open;
            const relativeVolume = (candle.volume || 0) / (avgVolume || 1);

            // Institutional Accumulation: High volume + Tight range + Bullish close
            const range = candle.high - candle.low;
            const avgRange = prev5.reduce((sum, c) => sum + (c.high - c.low), 0) / 5;

            if (relativeVolume > 1.3 && range < avgRange * 0.8 && candle.close > candle.open) {
                longInterest += 2; // Strong accumulation
            } else if (candle.close > candle.open && relativeVolume > 1.0) {
                longInterest += 1; // Weak accumulation
            }

            // Institutional Distribution: High volume + Tight range + Bearish close
            if (relativeVolume > 1.3 && range < avgRange * 0.8 && candle.close < candle.open) {
                shortInterest += 2;
            } else if (candle.close < candle.open && relativeVolume > 1.0) {
                shortInterest += 1;
            }
        }

        // Net positioning (normalized to -100 to +100 scale)
        const netPosition = ((longInterest - shortInterest) / recent60.length) * 100;

        return {
            longInterest,
            shortInterest,
            netPosition: Math.max(-100, Math.min(100, Math.round(netPosition)))
        };
    }

    /**
     * Generate human-readable positioning summary
     */
    static _generateReason(bias, positioning, assetClass) {
        if (bias === 'NEUTRAL') {
            return 'Large traders are balanced. No clear directional bias detected.';
        }

        const strength = Math.abs(positioning.netPosition);
        const direction = bias === 'BULLISH' ? 'long' : 'short';

        if (strength > 30) {
            return `Strong institutional ${direction} positioning detected. Hedge funds are heavily committed to this direction.`;
        } else {
            return `Moderate institutional ${direction} bias. Large traders are leaning ${direction}.`;
        }
    }

    /**
     * Calculate Macro Alignment Bonus for QuantScore
     * @param {string} setupDirection - LONG | SHORT
     * @param {Object} sentiment - Sentiment analysis result
     * @returns {number} Bonus points (0-15)
     */
    static getMacroAlignmentBonus(setupDirection, sentiment) {
        if (!sentiment || sentiment.confidence === 'LOW') return 0;

        const isAligned = (setupDirection === 'LONG' && sentiment.bias === 'BULLISH') ||
            (setupDirection === 'SHORT' && sentiment.bias === 'BEARISH');

        if (!isAligned) return -10; // Penalty for fighting macro positioning

        // Bonus based on confidence
        return sentiment.confidence === 'HIGH' ? 15 :
            sentiment.confidence === 'MEDIUM' ? 10 : 5;
    }
}
