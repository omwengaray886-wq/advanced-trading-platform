/**
 * Calculate Simple ATR
 */
function calculateATR(candles, period = 14) {
    if (candles.length < period) return 0;
    const recent = candles.slice(-period);
    const tr = recent.map(c => c.high - c.low);
    return tr.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Detect Liquidity Pools with Predictive Logic
 */
export function detectLiquidityPools(candles, structures) {
    if (candles.length < 50) return [];

    const liquidityPools = [];
    const recentCandles = candles.slice(-120);
    const atr = calculateATR(recentCandles, 14);

    const highs = recentCandles.map(c => c.high);
    const lows = recentCandles.map(c => c.low);

    // 1. Detect "Retail Stop Pools" vs "Institutional Pools"
    const significantHighs = findSignificantLocalPeaks(highs, 10, false, atr);
    const significantLows = findSignificantLocalPeaks(lows, 10, true, atr);

    significantHighs.forEach(peak => {
        const duration = recentCandles.length - peak.firstIndex;
        const volumeAtLevel = recentCandles.slice(peak.firstIndex, peak.index).reduce((sum, c) => sum + (c.volume || 0), 0);

        const isInstitutional = peak.count >= 3 || duration > 50;
        const isCompression = detectCompression(recentCandles.slice(peak.index - 10, peak.index));

        liquidityPools.push({
            price: peak.price,
            type: isInstitutional ? 'INSTITUTIONAL_POOL' : 'STOP_POOL',
            side: 'BUY_SIDE',
            strength: isInstitutional ? 'HIGH' : 'MEDIUM',
            label: isInstitutional ? 'Institutional Liquidity Wall' : 'Retail Stops',
            metadata: {
                touches: peak.count,
                duration,
                volume: volumeAtLevel
            },
            predictive: {
                liquidity_pressure: isInstitutional ? 0.92 : 0.6,
                likely_target: isInstitutional ? 'major_draw_on_liquidity' : 'minor_correction',
                sweep_probability: isInstitutional && isCompression ? 0.88 : 0.5
            },
            coordinate: { price: peak.price, time: recentCandles[peak.index].time }
        });
    });

    significantLows.forEach(peak => {
        const duration = recentCandles.length - peak.firstIndex;
        const volumeAtLevel = recentCandles.slice(peak.firstIndex, peak.index).reduce((sum, c) => sum + (c.volume || 0), 0);

        const isInstitutional = peak.count >= 3 || duration > 50;
        const isCompression = detectCompression(recentCandles.slice(peak.index - 10, peak.index));

        liquidityPools.push({
            price: peak.price,
            type: isInstitutional ? 'INSTITUTIONAL_POOL' : 'STOP_POOL',
            side: 'SELL_SIDE',
            strength: isInstitutional ? 'HIGH' : 'MEDIUM',
            label: isInstitutional ? 'Institutional Liquidity Wall' : 'Retail Stops',
            metadata: {
                touches: peak.count,
                duration,
                volume: volumeAtLevel
            },
            predictive: {
                liquidity_pressure: isInstitutional ? 0.92 : 0.6,
                likely_target: isInstitutional ? 'major_draw_on_liquidity' : 'minor_correction',
                sweep_probability: isInstitutional && isCompression ? 0.88 : 0.5
            },
            coordinate: { price: peak.price, time: recentCandles[peak.index].time }
        });
    });

    // 2. Identify "Inducement" Levels
    const inducements = detectInducementLevels(structures);
    liquidityPools.push(...inducements);

    return liquidityPools;
}

/**
 * Detect compression (tight volatility contraction)
 */
function detectCompression(candles) {
    if (candles.length < 5) return false;
    const ranges = candles.map(c => c.high - c.low);
    const avgRange = ranges.reduce((a, b) => a + b) / ranges.length;
    const lastRange = ranges[ranges.length - 1];
    return lastRange < avgRange * 0.7;
}

/**
 * Find significant peaks or valleys with touch counts using ATR tolerance
 */
function findSignificantLocalPeaks(prices, lookback, findLows = false, atr) {
    const peaks = [];
    const tolerance = atr * 0.15; // 15% of ATR as buffer

    for (let i = lookback; i < prices.length - lookback; i++) {
        const current = prices[i];
        const isPeak = findLows ?
            prices.slice(i - lookback, i).every(p => p >= current) && prices.slice(i + 1, i + lookback + 1).every(p => p >= current) :
            prices.slice(i - lookback, i).every(p => p <= current) && prices.slice(i + 1, i + lookback + 1).every(p => p <= current);

        if (isPeak) {
            let found = false;
            for (let p of peaks) {
                if (Math.abs(p.price - current) <= tolerance) {
                    p.count++;
                    p.index = i;
                    found = true;
                    break;
                }
            }
            if (!found) {
                peaks.push({ price: current, index: i, firstIndex: i, count: 1 });
            }
        }
    }
    return peaks;
}

/**
 * Detect Inducement Levels
 */
function detectInducementLevels(structures) {
    const inducements = [];
    if (structures.length < 5) return [];

    const recent = structures.slice(-5);
    const lastStructure = recent[recent.length - 1];

    if (lastStructure.markerType === 'BOS' || lastStructure.markerType === 'CHOCH') {
        const inducementPoint = recent[recent.length - 2];
        if (inducementPoint) {
            inducements.push({
                price: inducementPoint.price,
                type: 'INDUCEMENT',
                side: lastStructure.direction === 'BULLISH' ? 'SELL_SIDE' : 'BUY_SIDE',
                strength: 'MEDIUM',
                label: 'Institutional Inducement',
                predictive: {
                    liquidity_pressure: 0.75,
                    likely_target: 'reversal_trigger',
                    sweep_probability: 0.65
                },
                coordinate: { price: inducementPoint.price, time: inducementPoint.time }
            });
        }
    }

    return inducements;
}

