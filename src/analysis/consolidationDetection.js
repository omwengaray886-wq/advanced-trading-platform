/**
 * Consolidation Detection Logic (Phase 5)
 * Detects sideways ranges with multiple touches and tight price action.
 */

export class ConsolidationDetector {
    /**
     * Detect consolidations in candle data
     * @param {Array} candles - OHLC data
     * @param {number} lookback - Number of candles to check (default 20)
     * @param {number} threshold - ATR multiplier for range width (default 1.5)
     * @returns {Array} - Detected consolidation zones
     */
    static detectConsolidations(candles, lookback = 20, threshold = 1.5) {
        if (candles.length < lookback) return [];

        const consolidations = [];
        const atr = this.calculateATR(candles, 14);

        for (let i = lookback; i < candles.length; i++) {
            const window = candles.slice(i - lookback, i);
            const high = Math.max(...window.map(c => c.high));
            const low = Math.min(...window.map(c => c.low));
            const rangeWidth = high - low;

            // Definition: Range width is small relative to average volatility (ATR)
            // And multiple candles stay within this range
            if (rangeWidth < atr * threshold) {
                // Check for "tightness" - standard deviation of closes
                const closes = window.map(c => c.close);
                const mean = closes.reduce((a, b) => a + b) / closes.length;
                const stdDev = Math.sqrt(closes.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / closes.length);

                if (stdDev < (rangeWidth / 4)) {
                    const classification = this.classifyConsolidation(window, atr);
                    consolidations.push({
                        startIndex: i - lookback,
                        endIndex: i - 1,
                        startTime: window[0].time,
                        endTime: window[window.length - 1].time,
                        high,
                        low,
                        type: 'CONSOLIDATION',
                        classification,
                        strength: 1 - (stdDev / (rangeWidth / 2))
                    });

                    // Skip ahead to avoid overlapping detections of the same range
                    i += Math.floor(lookback / 2);
                }
            }
        }

        return this.mergeOverlapping(consolidations);
    }

    /**
     * Classify the type of consolidation
     * Accumulation, Distribution, or Pause
     */
    static classifyConsolidation(window, atr) {
        const closes = window.map(c => c.close);
        const lastPrice = closes[closes.length - 1];
        const firstPrice = closes[0];

        // Calculate simple trend within range
        const innerTrend = (lastPrice - firstPrice) / firstPrice;

        // Use RSI-like logic for accumulation/distribution
        let gains = 0, losses = 0;
        for (let i = 1; i < closes.length; i++) {
            const d = closes[i] - closes[i - 1];
            if (d > 0) gains += d; else losses -= d;
        }
        const rs = losses === 0 ? 100 : gains / losses;
        const rsi = 100 - (100 / (1 + rs));

        let type = 'PAUSE';
        let breakoutBias = 'NEUTRAL';

        if (rsi < 40) {
            type = 'ACCUMULATION';
            breakoutBias = 'BULLISH';
        } else if (rsi > 60) {
            type = 'DISTRIBUTION';
            breakoutBias = 'BEARISH';
        }

        return {
            type,
            breakoutBias,
            fakeoutRisk: rsi > 45 && rsi < 55 ? 'HIGH' : 'LOW',
            volatilityContraction: 1 - (this.calculateATR(window, 5) / atr)
        };
    }

    static calculateATR(candles, period) {
        if (candles.length < 2) return 0;
        let trs = [];
        for (let i = 1; i < candles.length; i++) {
            const h = candles[i].high;
            const l = candles[i].low;
            const pc = candles[i - 1].close;
            trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
        }
        return trs.slice(-Math.min(period, trs.length)).reduce((a, b) => a + b, 0) / Math.min(period, trs.length);
    }

    static mergeOverlapping(zones) {
        if (zones.length <= 1) return zones;

        const merged = [];
        let current = zones[0];

        for (let i = 1; i < zones.length; i++) {
            const next = zones[i];
            if (next.startIndex <= current.endIndex + 5) { // Allow small gaps
                current.endIndex = Math.max(current.endIndex, next.endIndex);
                current.endTime = next.endTime;
                current.high = Math.max(current.high, next.high);
                current.low = Math.min(current.low, next.low);
                current.classification = next.classification; // Use latest classification
                current.strength = (current.strength + next.strength) / 2;
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);
        return merged;
    }
}
