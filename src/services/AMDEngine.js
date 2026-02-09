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
        if (!candles || candles.length < 24) return { phase: 'UNKNOWN', confidence: 0 };

        const last24 = candles.slice(-24);
        const volatility = this._calculateVolatility(last24);
        const range = this._calculateRange(last24);
        const currentPrice = candles[candles.length - 1].close;

        // 1. Accumulation (Asian Session / Range)
        if (sessionInfo.session === 'ASIAN' || (volatility < 0.001 && range < 0.005)) {
            return {
                phase: 'ACCUMULATION',
                behavior: 'RANGING',
                confidence: 0.8,
                note: 'Institutions building positions'
            };
        }

        // 2. Manipulation (Open of London/NY + Stop Run)
        const isOpeningWindow = sessionInfo.killzone === 'LONDON_OPEN' || sessionInfo.killzone === 'NY_OPEN';
        const recentExpansion = this._detectExpansion(candles.slice(-5));

        if (isOpeningWindow && recentExpansion.isAggressive) {
            // Check if expansion is likely a fakeout (contra-trend to HTF)
            // Or if it just cleared a significant swing high/low
            return {
                phase: 'MANIPULATION',
                behavior: 'JUDAS_SWING',
                direction: recentExpansion.direction,
                confidence: 0.7,
                note: 'Suspected stop hunt / liquidity grab'
            };
        }

        // 3. Distribution (Sustained move after manipulation)
        if (recentExpansion.isAggressive && !isOpeningWindow) {
            return {
                phase: 'DISTRIBUTION',
                behavior: 'EXPANSION',
                direction: recentExpansion.direction,
                confidence: 0.75,
                note: 'Institutions releasing positions'
            };
        }

        return { phase: 'TRANSITION', behavior: 'MIXED', confidence: 0.5 };
    }

    /**
     * Detect if price is expanding aggressively
     */
    static _detectExpansion(candles) {
        const start = candles[0].close;
        const end = candles[candles.length - 1].close;
        const percent = (end - start) / start;
        const isAggressive = Math.abs(percent) > 0.002; // Threshold for expansion

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
