/**
 * Smart Money Concepts (SMC) Analysis Module
 * Centralized detection for Breakers, Mitigation Blocks, and other SMC structures.
 */

export class SmartMoneyConcepts {

    /**
     * Detect Breaker Blocks (Failed Order Blocks)
     * @param {Array} candles - Candlestick data
     * @param {string} direction - 'BULLISH' or 'BEARISH' (The desired reversal direction)
     * @returns {Array} - Array of detected breakers
     */
    static detectBreakers(candles, direction = null) {
        const breakers = [];
        const lookback = 80;
        // Ensure we have enough data
        if (candles.length < lookback) return [];

        const recentCandles = candles.slice(-lookback);

        for (let i = 10; i < recentCandles.length - 10; i++) {
            const current = recentCandles[i];

            // 1. Detect Bullish Breaker (Bearish OB that failed and was broken upwards)
            // It starts as a Supply Zone (Up candle before down move)
            if (!direction || direction === 'BULLISH') {
                const isUpCandle = current.close > current.open;
                const next3 = recentCandles.slice(i + 1, i + 4);
                // Strong move down verifying it was supply
                const isStrongDown = next3.every(c => c.close < current.low);

                if (isUpCandle && isStrongDown) {
                    const highLevel = current.high;
                    const remainingCandles = recentCandles.slice(i + 4);

                    // Price must break ABOVE this supply zone
                    const hasBrokenAbove = remainingCandles.some(c => c.close > highLevel);
                    const currentPrice = recentCandles[recentCandles.length - 1].close;

                    // Mitigation/Retest condition: Price should be above or near the zone
                    // If it was broken above and current price is near or above it
                    if (hasBrokenAbove && currentPrice >= (current.low - (current.high - current.low))) {
                        breakers.push({
                            type: 'BULLISH',
                            high: current.high,
                            low: current.low,
                            timestamp: current.time,
                            brokenAt: remainingCandles.find(c => c.close > highLevel)?.time
                        });
                    }
                }
            }

            // 2. Detect Bearish Breaker (Bullish OB that failed and was broken downwards)
            // It starts as a Demand Zone (Down candle before up move)
            if (!direction || direction === 'BEARISH') {
                const isDownCandle = current.close < current.open;
                const next3Down = recentCandles.slice(i + 1, i + 4);
                // Strong move up verifying it was demand
                const isStrongUp = next3Down.every(c => c.close > current.high);

                if (isDownCandle && isStrongUp) {
                    const lowLevel = current.low;
                    const remainingCandles = recentCandles.slice(i + 4);

                    // Price must break BELOW this demand zone
                    const hasBrokenBelow = remainingCandles.some(c => c.close < lowLevel);
                    const currentPrice = recentCandles[recentCandles.length - 1].close;

                    // If it was broken below and current price is near or below it
                    if (hasBrokenBelow && currentPrice <= (current.high + (current.high - current.low))) {
                        breakers.push({
                            type: 'BEARISH',
                            high: current.high,
                            low: current.low,
                            timestamp: current.time,
                            brokenAt: remainingCandles.find(c => c.close < lowLevel)?.time
                        });
                    }
                }
            }
        }

        return breakers;
    }

    /**
     * Detect Mitigation Blocks (Failed Swing Points without Liquidity Sweep)
     * @param {Array} candles - Candlestick data
     * @param {string} direction - 'BULLISH' or 'BEARISH'
     * @returns {Array} - Array of mitigation blocks
     */
    static detectMitigations(candles, direction = null) {
        const mitigations = [];
        const lookback = 60;
        if (candles.length < lookback) return [];

        const recentCandles = candles.slice(-lookback);

        for (let i = 5; i < recentCandles.length - 15; i++) {
            const current = recentCandles[i];

            // Bullish Mitigation: Down candle (OB) that was broken to the upside
            // Similar to breaker but occurs after a structure failure logic (simplified here for pattern)
            if (!direction || direction === 'BULLISH') {
                if (current.close < current.open) {
                    const next5 = recentCandles.slice(i + 1, i + 6);
                    const isDownMove = next5.some(c => c.close < current.low);

                    if (isDownMove) {
                        const remaining = recentCandles.slice(i + 6);
                        const brokenUp = remaining.some(c => c.close > current.high);
                        const currentPrice = recentCandles[recentCandles.length - 1].close;

                        if (brokenUp && currentPrice >= current.low) {
                            mitigations.push({
                                type: 'BULLISH',
                                high: current.high,
                                low: current.low,
                                timestamp: current.time
                            });
                        }
                    }
                }
            }

            // Bearish Mitigation: Up candle (OB) broken to the downside
            if (!direction || direction === 'BEARISH') {
                if (current.close > current.open) {
                    const next5 = recentCandles.slice(i + 1, i + 6);
                    const isUpMove = next5.some(c => c.close > current.high);

                    if (isUpMove) {
                        const remaining = recentCandles.slice(i + 6);
                        const brokenDown = remaining.some(c => c.close < current.low);
                        const currentPrice = recentCandles[recentCandles.length - 1].close;

                        if (brokenDown && currentPrice <= current.high) {
                            mitigations.push({
                                type: 'BEARISH',
                                high: current.high,
                                low: current.low,
                                timestamp: current.time
                            });
                        }
                    }
                }
            }
        }

        return mitigations;
    }

    /**
     * Detect Impulsive Swing (for OTE and Fibonacci measurements)
     * Finds the significant high/low range in recent price action.
     * @param {Array} candles - Candlestick data
     * @returns {Object|null} - { high, low } or null if not significant
     */
    static detectImpulsiveSwing(candles) {
        // Lookback for the impulse
        const lookback = 40;
        if (candles.length < lookback) return null;

        const recent = candles.slice(-lookback);
        const highs = recent.map(c => c.high);
        const lows = recent.map(c => c.low);

        const absoluteHigh = Math.max(...highs);
        const absoluteLow = Math.min(...lows);

        // Ensure the move is significant (e.g., > 1% move)
        if ((absoluteHigh - absoluteLow) / absoluteLow < 0.01) return null;

        return {
            high: absoluteHigh,
            low: absoluteLow
        };
    }

    /**
     * Calculate Simple ATR (Average True Range)
     */
    static calculateATR(candles, period = 14) {
        if (candles.length < period) return 0;
        const recent = candles.slice(-period);
        const tr = recent.map(c => Math.max(
            c.high - c.low,
            Math.abs(c.high - (candles[candles.indexOf(c) - 1]?.close || c.open)),
            Math.abs(c.low - (candles[candles.indexOf(c) - 1]?.close || c.open))
        ));
        return tr.reduce((sum, val) => sum + val, 0) / period;
    }

    /**
     * Detect Order Blocks (Institutional Footprints)
     * Identifies the last opposite candle before a significant impulsive move.
     * @param {Array} candles - Candlestick data
     * @param {string} direction - 'BULLISH' (Demand) or 'BEARISH' (Supply)
     * @returns {Array} - Detected order blocks
     */
    static detectOrderBlocks(candles, direction = null) {
        const orderBlocks = [];
        const lookback = 80; // Increased lookback for better context
        if (candles.length < lookback) return [];

        const recentCandles = candles.slice(-lookback);
        const atr = this.calculateATR(recentCandles, 14);

        for (let i = 5; i < recentCandles.length - 10; i++) {
            const current = recentCandles[i];
            const next5 = recentCandles.slice(i + 1, i + 6);

            // Bullish Order Block (Demand): Last down candle before strong up move
            if (!direction || direction === 'BULLISH') {
                const isDownCandle = current.close < current.open;

                // Impulse Calculation (Phase 49): Must move at least 1.5x ATR within 5 candles
                const moveUp = next5[next5.length - 1].close - current.high;
                const isStrongImpulse = moveUp > (atr * 1.5);

                if (isDownCandle && isStrongImpulse) {
                    orderBlocks.push({
                        type: 'DEMAND',
                        high: current.high,
                        low: current.low,
                        timestamp: current.time,
                        strength: moveUp > (atr * 3) ? 'EXCEPTIONAL' : 'STRONG'
                    });
                }
            }

            // Bearish Order Block (Supply): Last up candle before strong down move
            if (!direction || direction === 'BEARISH') {
                const isUpCandle = current.close > current.open;

                const moveDown = current.low - next5[next5.length - 1].close;
                const isStrongImpulse = moveDown > (atr * 1.5);

                if (isUpCandle && isStrongImpulse) {
                    orderBlocks.push({
                        type: 'SUPPLY',
                        high: current.high,
                        low: current.low,
                        timestamp: current.time,
                        strength: moveDown > (atr * 3) ? 'EXCEPTIONAL' : 'STRONG'
                    });
                }
            }
        }

        return orderBlocks;
    }

    /**
     * Detect Equal Highs/Lows (Liquidity Pools)
     * @param {Array} candles - Candlestick data
     * @param {string} type - 'highs' or 'lows'
     * @returns {Array} - Levels with multiple touches
     */
    static detectEqualLevels(candles, type) {
        const levels = [];
        const lookback = 100;
        if (candles.length < lookback) return [];

        const recent = candles.slice(-lookback);
        const atr = this.calculateATR(recent, 20);
        const tolerance = atr * 0.2; // 20% of ATR as tolerance for equality

        const prices = type === 'highs' ?
            recent.map(c => c.high) :
            recent.map(c => c.low);

        for (let i = 5; i < prices.length - 5; i++) {
            const currentPrice = prices[i];

            // Local swing detection
            const isSwing = type === 'highs' ?
                recent.slice(i - 3, i + 4).every(c => c.high <= currentPrice) :
                recent.slice(i - 3, i + 4).every(c => c.low >= currentPrice);

            if (isSwing) {
                // Check if this level matches a previous one within ATR tolerance
                const existingLevel = levels.find(l =>
                    Math.abs(currentPrice - l.price) <= tolerance
                );

                if (existingLevel) {
                    existingLevel.count++;
                    existingLevel.touches.push({ index: i, time: recent[i].time });
                    // Average the price for better "line" placement
                    existingLevel.price = (existingLevel.price + currentPrice) / 2;
                } else {
                    levels.push({
                        price: currentPrice,
                        index: i,
                        time: recent[i].time,
                        count: 1,
                        touches: [{ index: i, time: recent[i].time }]
                    });
                }
            }
        }

        // Filter for at least 2 touches
        return levels.filter(l => l.count >= 2);
    }

    /**
     * Detect Volume Climax Candles (Wyckoff)
     * Identifies candles with exceptionally high volume compared to recent average
     * @param {Array} candles - Candlestick data with volume
     * @param {number} lookback - Period for volume comparison
     * @returns {Array} - Climax candles with type (BUYING_CLIMAX or SELLING_CLIMAX)
     */
    static detectVolumeClimax(candles, lookback = 20) {
        const climaxes = [];
        if (candles.length < lookback + 10) return [];

        for (let i = lookback; i < candles.length; i++) {
            const current = candles[i];
            const recentVolumes = candles.slice(i - lookback, i).map(c => c.volume || 0);
            const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / lookback;

            // Climax: Volume is 2x+ average AND wide range candle
            const isHighVolume = (current.volume || 0) > avgVolume * 2;
            const range = current.high - current.low;
            const avgRange = candles.slice(i - lookback, i)
                .reduce((sum, c) => sum + (c.high - c.low), 0) / lookback;
            const isWideRange = range > avgRange * 1.5;

            if (isHighVolume && isWideRange) {
                const isBullish = current.close > current.open;
                climaxes.push({
                    type: isBullish ? 'BUYING_CLIMAX' : 'SELLING_CLIMAX',
                    timestamp: current.time,
                    price: current.close,
                    volume: current.volume,
                    high: current.high,
                    low: current.low
                });
            }
        }

        return climaxes;
    }

    /**
     * Detect Range Formation (Wyckoff Phase B)
     * Identifies consolidation zones where price oscillates within a defined range
     * @param {Array} candles - Candlestick data
     * @param {number} minDuration - Minimum number of candles for valid range
     * @returns {Object|null} - Range object with support/resistance or null
     */
    static detectRangeFormation(candles, minDuration = 15) {
        if (candles.length < minDuration + 10) return null;

        const recentCandles = candles.slice(-50);
        const highs = recentCandles.map(c => c.high);
        const lows = recentCandles.map(c => c.low);

        // Calculate potential range boundaries
        const maxHigh = Math.max(...highs);
        const minLow = Math.min(...lows);
        const rangeSize = maxHigh - minLow;

        // Define tolerance bands
        const upperBand = maxHigh - (rangeSize * 0.1);
        const lowerBand = minLow + (rangeSize * 0.1);

        // Count how many candles stay within the range
        const candlesInRange = recentCandles.filter(c =>
            c.high <= upperBand && c.low >= lowerBand
        ).length;

        const rangePercentage = candlesInRange / recentCandles.length;

        // Valid range: 60%+ of candles stay within bounds
        if (rangePercentage > 0.6 && recentCandles.length >= minDuration) {
            return {
                support: lowerBand,
                resistance: upperBand,
                duration: recentCandles.length,
                strength: rangePercentage,
                startTime: recentCandles[0].time,
                endTime: recentCandles[recentCandles.length - 1].time
            };
        }

        return null;
    }

    /**
     * Detect Spring (Wyckoff Phase C - Accumulation)
     * A false breakdown below support that quickly reverses
     * @param {Array} candles - Candlestick data
     * @param {Object} range - Range object from detectRangeFormation
     * @returns {Object|null} - Spring event or null
     */
    static detectSpring(candles, range) {
        if (!range || candles.length < 5) return null;

        const recentCandles = candles.slice(-10);

        for (let i = 0; i < recentCandles.length - 2; i++) {
            const current = recentCandles[i];

            // Spring: Breaks below support briefly
            const breaksSupport = current.low < range.support;

            if (breaksSupport) {
                // Must close back inside the range (showing strength)
                const closesInside = current.close > range.support;

                // Next candles should rally
                const next2 = recentCandles.slice(i + 1, i + 3);
                const ralliesAfter = next2.every(c => c.close > range.support);

                if (closesInside && ralliesAfter) {
                    return {
                        type: 'SPRING',
                        timestamp: current.time,
                        lowPoint: current.low,
                        support: range.support,
                        penetrationDepth: range.support - current.low
                    };
                }
            }
        }

        return null;
    }

    /**
     * Detect UTAD (Upthrust After Distribution - Wyckoff Phase C)
     * A false breakout above resistance that quickly reverses
     * @param {Array} candles - Candlestick data
     * @param {Object} range - Range object from detectRangeFormation
     * @returns {Object|null} - UTAD event or null
     */
    static detectUTAD(candles, range) {
        if (!range || candles.length < 5) return null;

        const recentCandles = candles.slice(-10);

        for (let i = 0; i < recentCandles.length - 2; i++) {
            const current = recentCandles[i];

            // UTAD: Breaks above resistance briefly
            const breaksResistance = current.high > range.resistance;

            if (breaksResistance) {
                // Must close back inside the range (showing weakness)
                const closesInside = current.close < range.resistance;

                // Next candles should decline
                const next2 = recentCandles.slice(i + 1, i + 3);
                const declinesAfter = next2.every(c => c.close < range.resistance);

                if (closesInside && declinesAfter) {
                    return {
                        type: 'UTAD',
                        timestamp: current.time,
                        highPoint: current.high,
                        resistance: range.resistance,
                        penetrationDepth: current.high - range.resistance
                    };
                }
            }
        }

        return null;
    }
}
