/**
 * Micro-Structure Engine (Phase 73)
 * Ultra-precision analysis for 1m/5m scalping
 * Detects order flow imbalances, liquidity sweeps, and sub-5m institutional footprints
 */

export class MicroStructureEngine {
    /**
     * Detect Order Flow Imbalance (Bid/Ask pressure)
     * @param {Object} orderBook - Live order book data
     * @returns {Object} Imbalance metrics
     */
    static detectOrderFlowImbalance(orderBook) {
        if (!orderBook || !orderBook.bids || !orderBook.asks) return null;

        // Calculate bid/ask volumes
        const bidVolume = orderBook.bids.reduce((sum, bid) => sum + bid.quantity, 0);
        const askVolume = orderBook.asks.reduce((sum, ask) => sum + ask.quantity, 0);

        const totalVolume = bidVolume + askVolume;
        const imbalanceRatio = bidVolume / totalVolume;

        // Detect significant imbalance (>65% on one side)
        let signal = null;
        if (imbalanceRatio > 0.65) {
            signal = {
                direction: 'BULLISH',
                strength: (imbalanceRatio - 0.5) * 2, // 0-1 scale
                bidVolume,
                askVolume,
                description: `${(imbalanceRatio * 100).toFixed(0)}% bid pressure`
            };
        } else if (imbalanceRatio < 0.35) {
            signal = {
                direction: 'BEARISH',
                strength: (0.5 - imbalanceRatio) * 2,
                bidVolume,
                askVolume,
                description: `${((1 - imbalanceRatio) * 100).toFixed(0)}% ask pressure`
            };
        }

        return {
            imbalanceRatio,
            signal,
            bidVolume,
            askVolume,
            spreadPercent: orderBook.asks[0] && orderBook.bids[0]
                ? ((orderBook.asks[0].price - orderBook.bids[0].price) / orderBook.bids[0].price) * 100
                : null
        };
    }

    /**
     * Detect Sub-5m Liquidity Sweeps
     * @param {Array} candles - Ultra-short timeframe candles (1m/5m)
     * @param {Array} liquidityPools - Known liquidity zones
     * @returns {Object|null} Sweep signal
     */
    static detectMicroSweep(candles, liquidityPools) {
        if (!candles || candles.length < 3) return null;
        if (!liquidityPools || liquidityPools.length === 0) return null;

        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];

        // Check if last candle swept a liquidity pool
        for (const pool of liquidityPools) {
            // Bullish sweep: Wick down into liquidity, then close higher
            if (lastCandle.low <= pool.price && lastCandle.close > pool.price) {
                const wickPercent = ((lastCandle.close - lastCandle.low) / lastCandle.low) * 100;

                // Require significant wick (>0.3% for crypto, >0.1% for forex)
                if (wickPercent > 0.3) {
                    return {
                        type: 'BULLISH_SWEEP',
                        pool,
                        entry: pool.price + (lastCandle.high - pool.price) * 0.3, // 30% retracement
                        stopLoss: pool.price * 0.997, // 0.3% below
                        target: lastCandle.high + (lastCandle.high - pool.price) * 0.5,
                        wickPercent,
                        confidence: Math.min(wickPercent * 20, 80) // Scale to 0-80
                    };
                }
            }

            // Bearish sweep: Wick up into liquidity, then close lower
            if (lastCandle.high >= pool.price && lastCandle.close < pool.price) {
                const wickPercent = ((lastCandle.high - lastCandle.close) / lastCandle.close) * 100;

                if (wickPercent > 0.3) {
                    return {
                        type: 'BEARISH_SWEEP',
                        pool,
                        entry: pool.price - (pool.price - lastCandle.low) * 0.3,
                        stopLoss: pool.price * 1.003,
                        target: lastCandle.low - (pool.price - lastCandle.low) * 0.5,
                        wickPercent,
                        confidence: Math.min(wickPercent * 20, 80)
                    };
                }
            }
        }

        return null;
    }

    /**
     * Calculate optimal scalp entry based on micro-structure
     * @param {Array} candles - Recent 1m candles
     * @param {Object} imbalance - From detectOrderFlowImbalance()
     * @param {Object} marketState - Current market state
     * @returns {Object|null} Scalp setup
     */
    static generateScalpSetup(candles, imbalance, marketState) {
        if (!candles || candles.length < 10) return null;
        if (!imbalance || !imbalance.signal) return null;

        const lastCandle = candles[candles.length - 1];
        const currentPrice = lastCandle.close;

        // Calculate micro ATR (last 10 candles)
        let microATR = 0;
        for (let i = candles.length - 10; i < candles.length; i++) {
            microATR += candles[i].high - candles[i].low;
        }
        microATR /= 10;

        const direction = imbalance.signal.direction;

        // Define ultra-tight range (0.1-0.2% for crypto)
        const entryOffset = microATR * 0.3;
        const stopOffset = microATR * 0.5; // 0.5x ATR stop
        const targetOffset = microATR * 1.2; // 1.2x ATR target (2.4:1 R:R)

        const setup = {
            type: 'MICRO_SCALP',
            direction,
            entry: direction === 'BULLISH' ? currentPrice - entryOffset : currentPrice + entryOffset,
            stopLoss: direction === 'BULLISH' ? currentPrice - stopOffset : currentPrice + stopOffset,
            target: direction === 'BULLISH' ? currentPrice + targetOffset : currentPrice - targetOffset,
            confidence: imbalance.signal.strength * 100,
            microATR,
            orderFlowStrength: imbalance.signal.description,
            timeframe: '1m'
        };

        // Add session boost if in killzone
        if (marketState.session?.killzone) {
            setup.confidence += 15;
            setup.sessionBoost = true;
        }

        return setup;
    }

    /**
     * Detect rapid momentum candles (institutional entry signatures)
     * @param {Array} candles - Recent candles
     * @returns {Object|null} Momentum burst signal
     */
    static detectMomentumBurst(candles) {
        if (!candles || candles.length < 5) return null;

        const recent = candles.slice(-5);
        const avgRange = recent.reduce((sum, c) => sum + (c.high - c.low), 0) / 5;
        const lastCandle = candles[candles.length - 1];
        const lastRange = lastCandle.high - lastCandle.low;

        // Detect expansion (last candle >2x average range)
        if (lastRange > avgRange * 2) {
            const isBullish = lastCandle.close > lastCandle.open;

            return {
                type: 'MOMENTUM_BURST',
                direction: isBullish ? 'BULLISH' : 'BEARISH',
                expansionRatio: lastRange / avgRange,
                entry: lastCandle.close,
                stopLoss: isBullish ? lastCandle.low : lastCandle.high,
                target: isBullish
                    ? lastCandle.close + (lastCandle.close - lastCandle.low)
                    : lastCandle.close - (lastCandle.high - lastCandle.close),
                confidence: Math.min((lastRange / avgRange - 2) * 30 + 50, 85)
            };
        }

        return null;
    }
}
