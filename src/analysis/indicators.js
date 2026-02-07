/**
 * Indicators Utility
 * Centralized math for common technical indicators
 */

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(candles, period) {
    if (candles.length < period) return [];

    const k = 2 / (period + 1);
    const ema = [];

    // Start with SMA for first value
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += candles[i].close;
    }
    ema[period - 1] = sum / period;

    for (let i = period; i < candles.length; i++) {
        ema[i] = (candles[i].close - ema[i - 1]) * k + ema[i - 1];
    }

    return ema;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(candles, period = 14) {
    if (candles.length <= period) return [];

    const rsi = [];
    let gains = 0;
    let losses = 0;

    // First RSI
    for (let i = 1; i <= period; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    rsi[period] = 100 - (100 / (1 + (avgGain / (avgLoss || 1))));

    for (let i = period + 1; i < candles.length; i++) {
        const diff = candles[i].close - candles[i - 1].close;
        const currentGain = diff >= 0 ? diff : 0;
        const currentLoss = diff < 0 ? -diff : 0;

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

        rsi[i] = 100 - (100 / (1 + (avgGain / (avgLoss || 1))));
    }

    return rsi;
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(candles, fast = 12, slow = 26, signal = 9) {
    const fastEMA = calculateEMA(candles, fast);
    const slowEMA = calculateEMA(candles, slow);

    const macdLine = [];
    const signalLine = [];
    const histogram = [];

    for (let i = 0; i < candles.length; i++) {
        if (fastEMA[i] && slowEMA[i]) {
            macdLine[i] = fastEMA[i] - slowEMA[i];
        }
    }

    // Calculate Signal Line (EMA of MACD Line)
    const validMACDLines = macdLine.map(v => ({ close: v || 0 })).filter((_, i) => macdLine[i] !== undefined);
    const signalEMA = calculateEMA(validMACDLines, signal);

    let signalIdx = 0;
    for (let i = 0; i < candles.length; i++) {
        if (macdLine[i] !== undefined) {
            if (signalIdx < signalEMA.length) {
                signalLine[i] = signalEMA[signalIdx];
                histogram[i] = macdLine[i] - signalLine[i];
                signalIdx++;
            }
        }
    }

    return { macdLine, signalLine, histogram };
}

/**
 * Detect Candlestick Patterns
 */
export function detectCandlePatterns(candles) {
    if (candles.length < 2) return [];

    const patterns = [];

    for (let i = 1; i < candles.length; i++) {
        const curr = candles[i];
        const prev = candles[i - 1];

        const body = Math.abs(curr.close - curr.open);
        const range = curr.high - curr.low;
        const upWick = curr.high - Math.max(curr.open, curr.close);
        const downWick = Math.min(curr.open, curr.close) - curr.low;

        // 1. PIN BAR (Hammer / Inverted Hammer)
        if (range > 0 && body / range < 0.3 && (upWick / range > 0.6 || downWick / range > 0.6)) {
            patterns.push({
                time: curr.time,
                type: 'PIN_BAR',
                direction: downWick > upWick ? 'BULLISH' : 'BEARISH',
                price: curr.close
            });
        }

        // 2. ENGULFING
        const prevBody = Math.abs(prev.close - prev.open);
        if (body > prevBody && curr.high >= prev.high && curr.low <= prev.low) {
            patterns.push({
                time: curr.time,
                type: 'ENGULFING',
                direction: curr.close > curr.open ? 'BULLISH' : 'BEARISH',
                price: curr.close
            });
        }

        // 3. DOJI
        if (range > 0 && body / range < 0.1) {
            let dojiType = 'DOJI';
            if (upWick / range > 0.7) dojiType = 'GRAVESTONE_DOJI';
            else if (downWick / range > 0.7) dojiType = 'DRAGONFLY_DOJI';

            patterns.push({
                time: curr.time,
                type: dojiType,
                direction: 'NEUTRAL',
                price: curr.close
            });
        }

        // 4. HARAMI (Inside Bar)
        if (curr.high < prev.high && curr.low > prev.low) {
            patterns.push({
                time: curr.time,
                type: 'HARAMI',
                direction: curr.close > curr.open ? 'BULLISH' : 'BEARISH',
                price: curr.close
            });
        }

        // 5. TWEEZERS
        const highDiff = Math.abs(curr.high - prev.high) / curr.high;
        const lowDiff = Math.abs(curr.low - prev.low) / curr.low;

        if (highDiff < 0.0005) {
            patterns.push({
                time: curr.time,
                type: 'TWEEZERS_TOP',
                direction: 'BEARISH',
                price: curr.high
            });
        } else if (lowDiff < 0.0005) {
            patterns.push({
                time: curr.time,
                type: 'TWEEZERS_BOTTOM',
                direction: 'BULLISH',
                price: curr.low
            });
        }

        // 6. MORNING / EVENING STAR (3-Candle patterns)
        if (i >= 2) {
            const prev2 = candles[i - 2];
            const prev2Body = Math.abs(prev2.close - prev2.open);
            const prev2Dir = prev2.close > prev2.open ? 'BULLISH' : 'BEARISH';

            // Morning Star (Bearish -> Tiny -> Bullish)
            if (prev2Dir === 'BEARISH' && prev2Body > range * 1.5 &&
                prevBody < prev2Body * 0.3 && curr.close > curr.open &&
                curr.close > (prev2.open + prev2.close) / 2) {
                patterns.push({
                    time: curr.time,
                    type: 'MORNING_STAR',
                    direction: 'BULLISH',
                    price: curr.close
                });
            }

            // Evening Star (Bullish -> Tiny -> Bearish)
            if (prev2Dir === 'BULLISH' && prev2Body > range * 1.5 &&
                prevBody < prev2Body * 0.3 && curr.close < curr.open &&
                curr.close < (prev2.open + prev2.close) / 2) {
                patterns.push({
                    time: curr.time,
                    type: 'EVENING_STAR',
                    direction: 'BEARISH',
                    price: curr.close
                });
            }
        }
    }

    return patterns;
}
