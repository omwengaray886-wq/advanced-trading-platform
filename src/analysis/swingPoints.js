/**
 * Swing Point Detection Algorithm
 * Identifies local highs and lows in price data
 */

/**
 * Detect swing points using N-bar lookback method
 * @param {Array} candles - Array of candlestick data
 * @param {number} lookback - Number of bars to look back/forward (default: 5)
 * @returns {Object} - { highs: [], lows: [] }
 */
export function detectSwingPoints(candles, lookback = 5) {
    const swingHighs = [];
    const swingLows = [];

    for (let i = lookback; i < candles.length - lookback; i++) {
        const currentHigh = candles[i].high;
        const currentLow = candles[i].low;

        // Check if swing high
        let isSwingHigh = true;
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && candles[j].high >= currentHigh) {
                isSwingHigh = false;
                break;
            }
        }

        if (isSwingHigh) {
            swingHighs.push({
                index: i,
                time: candles[i].time,
                price: currentHigh,
                type: 'SWING_HIGH'
            });
        }

        // Check if swing low
        let isSwingLow = true;
        for (let j = i - lookback; j <= i + lookback; j++) {
            if (j !== i && candles[j].low <= currentLow) {
                isSwingLow = false;
                break;
            }
        }

        if (isSwingLow) {
            swingLows.push({
                index: i,
                time: candles[i].time,
                price: currentLow,
                type: 'SWING_LOW'
            });
        }
    }

    return {
        highs: swingHighs,
        lows: swingLows,
        all: [...swingHighs, ...swingLows].sort((a, b) => a.index - b.index)
    };
}

/**
 * Filter swing points by significance
 * @param {Array} swingPoints - Array of swing points
 * @param {number} threshold - Minimum price movement percentage (default: 0.5%)
 * @returns {Array} - Filtered swing points
 */
export function filterSignificantSwings(swingPoints, threshold = 0.005) {
    if (swingPoints.length < 2) return swingPoints;

    const significant = [swingPoints[0]];

    for (let i = 1; i < swingPoints.length; i++) {
        const prev = significant[significant.length - 1];
        const current = swingPoints[i];

        const priceChange = Math.abs(current.price - prev.price) / prev.price;

        if (priceChange >= threshold) {
            significant.push(current);
        }
    }

    return significant;
}

/**
 * Get most recent N swing points
 * @param {Array} swingPoints - Array of swing points
 * @param {number} count - Number of recent points to return
 * @returns {Array} - Most recent swing points
 */
export function getRecentSwings(swingPoints, count = 10) {
    return swingPoints.slice(-count);
}
