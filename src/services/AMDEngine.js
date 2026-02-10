import { calculateOBV } from '../analysis/indicators.js';

/**
 * AMD Engine (Power of 3)
 * Detects Accumulation, Manipulation, and Distribution cycles.
 * Essential for institutional timing and avoiding "Judas Swings".
 */
export class AMDEngine {
    /**
     * Detect current cycle phase based on session and price action
     * @param {Array} candles - Historical candle data
     * @param {Object} sessionInfo - Current session context (from SessionAnalyzer)
     * @returns {Object} Cycle state
     */
    static detectCycle(candles, sessionInfo) {
        if (!candles || candles.length < 50) return { phase: 'UNKNOWN', confidence: 0 };

        const lastCandle = candles[candles.length - 1];
        const recentCandles = candles.slice(-24);
        const volatility = this._calculateVolatility(recentCandles);
        const range = this._calculateRange(recentCandles);

        // Calculate OBV for Divergence checks
        const obv = calculateOBV(candles.slice(-50));

        // 1. Accumulation (Asian Session / Range / Compression)
        // Characterized by low volatility and lack of directional conviction
        const isAsian = sessionInfo.session === 'ASIAN';
        const isCompressed = volatility < 0.0015 && range < 0.008; // Tune thresholds based on asset

        if (isAsian || isCompressed) {
            return {
                phase: 'ACCUMULATION',
                behavior: 'RANGING',
                confidence: isAsian ? 0.9 : 0.75,
                note: 'Institutions building positions (Time/Price Compression)',
                action: 'WAIT_FOR_BREAKOUT'
            };
        }

        // 2. Manipulation (Judas Swing / Stop Hunt)
        // Occurs at Open of London/NY. False breakout against HTF or Range direction.
        const isOpeningWindow = sessionInfo.killzone === 'LONDON_OPEN' || sessionInfo.killzone === 'NY_OPEN';

        if (isOpeningWindow) {
            const judas = this._detectJudasSwing(candles, obv, recentCandles);
            if (judas.detected) {
                return {
                    phase: 'MANIPULATION',
                    behavior: 'JUDAS_SWING',
                    direction: judas.direction, // Direction of the TRAP (e.g. Bullish Trap = Bearish intent)
                    confidence: 0.85,
                    note: `Judas Swing detected. ${judas.type}`,
                    action: 'FADE_THE_MOVE'
                };
            }
        }

        // 3. Distribution (Expansion / Trend)
        // Sustained move after manipulation, or clear trend extension
        const expansion = this._detectExpansion(candles.slice(-10));
        if (expansion.isAggressive) {
            return {
                phase: 'DISTRIBUTION',
                behavior: 'EXPANSION',
                direction: expansion.direction,
                confidence: 0.8,
                note: 'Institutions releasing positions (Trend Expansion)',
                action: 'FOLLOW_TREND'
            };
        }

        return { phase: 'TRANSITION', behavior: 'MIXED', confidence: 0.5 };
    }

    /**
     * Detects "Judas Swing" - False breakout with OBV Divergence
     */
    static _detectJudasSwing(candles, obv, recentContext) {
        const len = candles.length;
        const current = candles[len - 1];
        const prev = candles[len - 2];

        // Look back 20 periods for swing points
        const lookback = candles.slice(-20, -2); // Exclude current and prev
        const high = Math.max(...lookback.map(c => c.high));
        const low = Math.min(...lookback.map(c => c.low));

        // 1. Bearish Trap (Bullish fakeout)
        // Price breaks High, but closes back inside OR OBV makes lower high
        if (current.high > high) {
            // Check for potential SFP (Swing Failure Pattern)
            const closedBackInside = current.close < high;

            // Check OBV Divergence (Price Higher High, OBV Lower High)
            // Simplistic check: compare current OBV peak to previous OBV peak
            // This requires a more robust peak detector, but we'll use a slope proxy
            const priceSlope = (current.high - candles[len - 5].high);
            const obvSlope = (obv[obv.length - 1] - obv[obv.length - 5]);

            const divergence = priceSlope > 0 && obvSlope < 0;

            if (closedBackInside || divergence) {
                return {
                    detected: true,
                    type: divergence ? 'Volume Divergence' : 'Swing Failure',
                    direction: 'BEARISH' // The real move is likely Bearish
                };
            }
        }

        // 2. Bullish Trap (Bearish fakeout)
        if (current.low < low) {
            const closedBackInside = current.close > low;

            const priceSlope = (current.low - candles[len - 5].low);
            const obvSlope = (obv[obv.length - 1] - obv[obv.length - 5]);

            const divergence = priceSlope < 0 && obvSlope > 0;

            if (closedBackInside || divergence) {
                return {
                    detected: true,
                    type: divergence ? 'Volume Divergence' : 'Swing Failure',
                    direction: 'BULLISH' // Real move is Bullish
                };
            }
        }

        return { detected: false };
    }

    /**
     * Detect if price is expanding aggressively
     */
    static _detectExpansion(candles) {
        const start = candles[0].close;
        const end = candles[candles.length - 1].close;
        const percent = (end - start) / start;
        const isAggressive = Math.abs(percent) > 0.003; // Higher threshold

        return {
            isAggressive,
            percent,
            direction: percent > 0 ? 'BULLISH' : 'BEARISH'
        };
    }

    static _calculateVolatility(candles) {
        const returns = [];
        for (let i = 1; i < candles.length; i++) {
            returns.push(Math.abs((candles[i].close - candles[i - 1].close) / candles[i - 1].close));
        }
        return returns.reduce((a, b) => a + b, 0) / returns.length;
    }

    static _calculateRange(candles) {
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        return (Math.max(...highs) - Math.min(...lows)) / candles[0].close;
    }
}
