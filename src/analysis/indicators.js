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

/**
 * Calculate On-Balance Volume (OBV)
 * Volume flows based on price closes
 */
export function calculateOBV(candles) {
    if (!candles || candles.length === 0) return [];

    const obv = [candles[0].volume];

    for (let i = 1; i < candles.length; i++) {
        const current = candles[i];
        const prev = candles[i - 1];

        if (current.close > prev.close) {
            obv.push(obv[i - 1] + current.volume);
        } else if (current.close < prev.close) {
            obv.push(obv[i - 1] - current.volume);
        } else {
            obv.push(obv[i - 1]);
        }
    }

    return obv;
}

/**
 * Calculate Money Flow Index (MFI)
 * Volume-weighted RSI
 */
export function calculateMFI(candles, period = 14) {
    if (candles.length < period) return [];

    const mfi = [];
    const typicalPrices = candles.map(c => (c.high + c.low + c.close) / 3);
    const moneyFlow = typicalPrices.map((tp, i) => tp * candles[i].volume);

    for (let i = period - 1; i < candles.length; i++) {
        let positiveFlow = 0;
        let negativeFlow = 0;

        for (let j = 0; j < period; j++) {
            const idx = i - j;
            if (idx === 0) continue;

            if (typicalPrices[idx] > typicalPrices[idx - 1]) {
                positiveFlow += moneyFlow[idx];
            } else if (typicalPrices[idx] < typicalPrices[idx - 1]) {
                negativeFlow += moneyFlow[idx];
            }
        }

        const moneyRatio = negativeFlow === 0 ? 100 : positiveFlow / negativeFlow;
        const mfiValue = 100 - (100 / (1 + moneyRatio));
        mfi[i] = mfiValue;
    }

    return mfi;
}

/**
 * Calculate Chaikin Money Flow (CMF)
 */
export function calculateCMF(candles, period = 20) {
    if (candles.length < period) return [];

    const cmf = [];
    const adl = []; // Accumulation Distribution Line components

    // Calculate Multiplier and Volume for each candle
    for (let i = 0; i < candles.length; i++) {
        const { high, low, close, volume } = candles[i];
        const multiplier = ((close - low) - (high - close)) / (high - low || 1);
        adl[i] = multiplier * volume;
    }

    for (let i = period - 1; i < candles.length; i++) {
        let sumADL = 0;
        let sumVol = 0;

        for (let j = 0; j < period; j++) {
            sumADL += adl[i - j];
            sumVol += candles[i - j].volume;
        }

        cmf[i] = sumVol === 0 ? 0 : sumADL / sumVol;
    }

    return cmf;
}

/**
 * Calculate Anchored VWAP
 * @param {Array} candles 
 * @param {number} anchorIndex - Index to start calculation from
 */
export function calculateAnchoredVWAP(candles, anchorIndex = 0) {
    if (anchorIndex < 0 || anchorIndex >= candles.length) return [];

    const vwap = new Array(candles.length).fill(null);
    let cumulativeTPV = 0; // Typical Price * Volume
    let cumulativeVol = 0;

    for (let i = anchorIndex; i < candles.length; i++) {
        const { high, low, close, volume } = candles[i];
        const typicalPrice = (high + low + close) / 3;

        cumulativeTPV += typicalPrice * volume;
        cumulativeVol += volume;

        vwap[i] = cumulativeVol === 0 ? 0 : cumulativeTPV / cumulativeVol;
    }

    return vwap;
}

/**
 * Calculate Average Directional Index (ADX)
 */
export function calculateADX(candles, period = 14) {
    if (candles.length < period * 2) return { adx: [], pdi: [], mdi: [] };

    const tr = [];
    const dmPlus = [];
    const dmMinus = [];

    // 1. Calculate TR, +DM, -DM
    for (let i = 1; i < candles.length; i++) {
        const curr = candles[i];
        const prev = candles[i - 1];

        const hl = curr.high - curr.low;
        const hpc = Math.abs(curr.high - prev.close);
        const lpc = Math.abs(curr.low - prev.close);
        tr[i] = Math.max(hl, hpc, lpc);

        const upMove = curr.high - prev.high;
        const downMove = prev.low - curr.low;

        dmPlus[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
        dmMinus[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
    }

    // Helper for Smoothed Moving Average (Wilder's)
    const smooth = (data, p, startIdx) => {
        const result = new Array(data.length).fill(0);
        let sum = 0;
        // First value is simple sum
        for (let i = startIdx; i < startIdx + p; i++) sum += data[i];
        result[startIdx + p - 1] = sum;

        // Subsequent are smoothed
        for (let i = startIdx + p; i < data.length; i++) {
            result[i] = result[i - 1] - (result[i - 1] / p) + data[i];
        }
        return result;
    }

    const trSmooth = smooth(tr, period, 1);
    const dmPlusSmooth = smooth(dmPlus, period, 1);
    const dmMinusSmooth = smooth(dmMinus, period, 1);

    const pdi = [];
    const mdi = [];
    const dx = [];

    for (let i = period; i < candles.length; i++) {
        if (!trSmooth[i]) continue;

        pdi[i] = (dmPlusSmooth[i] / trSmooth[i]) * 100;
        mdi[i] = (dmMinusSmooth[i] / trSmooth[i]) * 100;

        const sum = pdi[i] + mdi[i];
        const diff = Math.abs(pdi[i] - mdi[i]);
        dx[i] = sum === 0 ? 0 : (diff / sum) * 100;
    }

    const adx = smooth(dx, period, period); // ADX is smoothed DX

    return { adx, pdi, mdi };
}

/**
 * Calculate Ichimoku Cloud
 */
export function calculateIchimoku(candles, config = { conversion: 9, base: 26, spanB: 52, displacement: 26 }) {
    if (candles.length < config.spanB) return null;

    const getDonchian = (idx, len) => {
        let min = Infinity, max = -Infinity;
        const start = Math.max(0, idx - len + 1);
        for (let i = start; i <= idx; i++) {
            min = Math.min(min, candles[i].low);
            max = Math.max(max, candles[i].high);
        }
        return (min + max) / 2;
    };

    const tenkan = []; // Conversion Line
    const kijun = [];  // Base Line
    const senkouA = [];
    const senkouB = [];
    const chikou = []; // Lagging Span

    for (let i = 0; i < candles.length; i++) {
        tenkan[i] = getDonchian(i, config.conversion);
        kijun[i] = getDonchian(i, config.base);

        // Senkou Span A (Shifted forward)
        // (Conversion + Base) / 2
        if (i >= config.base) {
            const val = (tenkan[i] + kijun[i]) / 2;
            if (i + config.displacement < candles.length + config.displacement) {
                // We push to array, but consumers must handle the 'future' shift index
                // Usually we store it aligned: senkouA[i+displacement] = val
                // For simplicity here, we'll store at current i, and strategies must look back 'displacement' candles
                // Actually, standard is: Current Ichi values are plotted at i + displacement
                // So at time 'i', the cloud values are from calculations done 'displacement' periods ago.
            }
        }

        // This is tricky to represent in a flat array without future resizing.
        // We will return the values *as of today* (which projects into future)
        // AND the current interaction values (which come from past)
    }

    // Simplified: Return components aligned to current candle 'i'
    // Senkou A[i] = (Tenkan[i-disp] + Kijun[i-disp]) / 2
    // Senkou B[i] = (Donchian(spanB)[i-disp]) / 2

    for (let i = 0; i < candles.length; i++) {
        const pastIdx = i - config.displacement;
        if (pastIdx >= 0) {
            senkouA[i] = (tenkan[pastIdx] + kijun[pastIdx]) / 2;

            // Re-calc donchian for past index
            let min = Infinity, max = -Infinity;
            const start = Math.max(0, pastIdx - config.spanB + 1);
            for (let j = start; j <= pastIdx; j++) {
                min = Math.min(min, candles[j].low);
                max = Math.max(max, candles[j].high);
            }
            senkouB[i] = (min + max) / 2;

            // Chikou is close[i] plotted at i-disp
            // So Chikou[i] actually represents close[i+disp] ?? No.
            // Chikou[i] = close[i+disp] usually.
            // Let's just expose the lines.
        }
    }

    return { tenkan, kijun, senkouA, senkouB };
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(candles, period = 20, stdDev = 2) {
    if (candles.length < period) return null;

    const sma = [];
    const upper = [];
    const lower = [];

    for (let i = period - 1; i < candles.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += candles[i - j].close;
        const avg = sum / period;
        sma[i] = avg;

        let sumSqDiff = 0;
        for (let j = 0; j < period; j++) {
            sumSqDiff += Math.pow(candles[i - j].close - avg, 2);
        }
        const variance = sumSqDiff / period;
        const sd = Math.sqrt(variance);

        upper[i] = avg + (sd * stdDev);
        lower[i] = avg - (sd * stdDev);
    }

    return { middle: sma, upper, lower };
}

/**
 * Calculate Stochastic Oscillator
 * Measures momentum by comparing closing price to price range over period
 * @param {Array} candles - Price data
 * @param {number} kPeriod - %K period (default 14)
 * @param {number} dPeriod - %D smoothing period (default 3)
 * @returns {Object} { k: [], d: [], signals: [] }
 */
export function calculateStochastic(candles, kPeriod = 14, dPeriod = 3) {
    if (candles.length < kPeriod) return { k: [], d: [], signals: [] };

    const k = []; // Fast stochastic
    const d = []; // Slow stochastic (SMA of %K)
    const signals = [];

    // Calculate %K for each period
    for (let i = kPeriod - 1; i < candles.length; i++) {
        // Find highest high and lowest low in the period
        let highestHigh = -Infinity;
        let lowestLow = Infinity;

        for (let j = 0; j < kPeriod; j++) {
            const candle = candles[i - j];
            highestHigh = Math.max(highestHigh, candle.high);
            lowestLow = Math.min(lowestLow, candle.low);
        }

        // %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) * 100
        const range = highestHigh - lowestLow;
        if (range === 0) {
            k[i] = 50; // Neutral if no range
        } else {
            k[i] = ((candles[i].close - lowestLow) / range) * 100;
        }
    }

    // Calculate %D (SMA of %K)
    for (let i = kPeriod + dPeriod - 2; i < candles.length; i++) {
        let sum = 0;
        for (let j = 0; j < dPeriod; j++) {
            sum += k[i - j];
        }
        d[i] = sum / dPeriod;

        // Generate signals
        const currentK = k[i];
        const currentD = d[i];
        const prevK = k[i - 1];
        const prevD = d[i - 1];

        let signal = null;

        // Oversold zone (<20)
        if (currentK < 20 && currentD < 20) {
            signal = {
                type: 'OVERSOLD',
                strength: (20 - currentK) / 20, // 0-1 scale
                note: 'Potential bullish reversal'
            };
        }
        // Overbought zone (>80)
        else if (currentK > 80 && currentD > 80) {
            signal = {
                type: 'OVERBOUGHT',
                strength: (currentK - 80) / 20,
                note: 'Potential bearish reversal'
            };
        }
        // Bullish crossover (%K crosses above %D)
        else if (prevK <= prevD && currentK > currentD && currentK < 50) {
            signal = {
                type: 'BULLISH_CROSS',
                strength: 0.7,
                note: 'Momentum shift to upside'
            };
        }
        // Bearish crossover (%K crosses below %D)
        else if (prevK >= prevD && currentK < currentD && currentK > 50) {
            signal = {
                type: 'BEARISH_CROSS',
                strength: 0.7,
                note: 'Momentum shift to downside'
            };
        }

        signals[i] = signal;
    }

    return { k, d, signals };
}
