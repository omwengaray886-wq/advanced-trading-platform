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
    static detectMicroSweep(candles, liquidityPools, marketState = null) {
        if (!candles || candles.length < 3) return null;
        if (!liquidityPools || liquidityPools.length === 0) return null;

        const lastCandle = candles[candles.length - 1];

        // Step 1: Dynamic ATR-Based Thresholds (Phase 4 Perfection)
        // Use marketState ATR if available, otherwise calculate Micro ATR
        const atr = marketState?.atr ||
            (candles.slice(-14).reduce((sum, c) => sum + (c.high - c.low), 0) / 14);

        const threshold = atr * 1.5;

        // Check if last candle swept a liquidity pool
        for (const pool of liquidityPools) {
            // Bullish sweep: Wick down into liquidity, then close higher
            if (lastCandle.low <= pool.price && lastCandle.close > pool.price) {
                const wickSize = lastCandle.close - lastCandle.low;

                // Threshold check: Reject noisy minor wicks
                if (wickSize > threshold) {
                    return {
                        type: 'BULLISH_SWEEP',
                        pool,
                        entry: lastCandle.close,
                        stopLoss: lastCandle.low - (atr * 0.1),
                        target: lastCandle.close + (wickSize * 2.0), // 2R target based on rejection magnitude
                        wickSize,
                        confidence: Math.min((wickSize / threshold) * 20 + 60, 95)
                    };
                }
            }

            // Bearish sweep: Wick up into liquidity, then close lower
            if (lastCandle.high >= pool.price && lastCandle.close < pool.price) {
                const wickSize = lastCandle.high - lastCandle.close;

                if (wickSize > threshold) {
                    return {
                        type: 'BEARISH_SWEEP',
                        pool,
                        entry: lastCandle.close,
                        stopLoss: lastCandle.high + (atr * 0.1),
                        target: lastCandle.close - (wickSize * 2.0),
                        wickSize,
                        confidence: Math.min((wickSize / threshold) * 20 + 60, 95)
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

        // Calculate micro ATR
        const microATR = marketState?.atr || (candles.slice(-10).reduce((sum, c) => sum + (c.high - c.low), 0) / 10);
        const direction = imbalance.signal.direction;

        // Step 2: Target Sync with Order Book Clusters (Phase 4 Perfection)
        let target = direction === 'BULLISH' ? currentPrice + (microATR * 2) : currentPrice - (microATR * 2);
        let clusterSynced = false;

        // If we have OrderBook walls, use them as institutional magnets for the scalp target
        const depth = marketState.orderBookDepth;
        if (depth && depth.walls) {
            // Find resistance walls for LONGs, support walls for SHORTs
            const relevantWalls = depth.walls.filter(w =>
                direction === 'BULLISH' ? w.side === 'SELL' : w.side === 'BUY'
            ).sort((a, b) =>
                direction === 'BULLISH' ? a.price - b.price : b.price - a.price
            );

            if (relevantWalls.length > 0) {
                // Find closest significant wall
                const closestWall = relevantWalls[0];
                const wallDist = Math.abs(closestWall.price - currentPrice) / currentPrice;

                // If wall is within a reasonable scalping distance (1% max), sync target
                if (wallDist < 0.01) {
                    target = closestWall.price;
                    clusterSynced = true;
                }
            }
        }

        const setup = {
            type: 'MICRO_SCALP',
            direction: direction === 'BULLISH' ? 'LONG' : 'SHORT',
            entry: currentPrice,
            stopLoss: direction === 'BULLISH' ? currentPrice - (microATR * 0.6) : currentPrice + (microATR * 0.6),
            target,
            confidence: imbalance.signal.strength * 100,
            microATR,
            orderFlowStrength: imbalance.signal.description,
            timeframe: '1m',
            isClusterSynced: clusterSynced
        };

        // Add session + cycle boost
        if (marketState.session?.killzone) setup.confidence += 10;
        if (marketState.amdCycle?.phase === 'DISTRIBUTION') setup.confidence += 10;

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
