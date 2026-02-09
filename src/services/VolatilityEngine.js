/**
 * Volatility Engine (Phase 6)
 * 
 * Projects volatility surface and calculates expected 1-standard-deviation moves.
 * Uses ATR acceleration as a proxy for Implied Volatility (IV).
 */
export class VolatilityEngine {
    /**
     * Calculate volatility corridor for current market conditions
     * @param {Array} candles - Price data
     * @param {string} timeframe - Current timeframe (15m, 1h, 4h, 1d)
     * @param {number} currentPrice - Current market price
     * @returns {Object} { corridor, expectedMove, volatilityState }
     */
    static calculateVolatilityCorridor(candles, timeframe, currentPrice) {
        if (!candles || candles.length < 30) {
            return null;
        }

        // 1. Calculate Historical Volatility (ATR-based)
        const atr14 = this._calculateATR(candles, 14);
        const atr28 = this._calculateATR(candles, 28);

        // 2. Detect Volatility Regime
        const atrAcceleration = (atr14 - atr28) / atr28;
        const volatilityState = this._classifyVolatility(atrAcceleration, atr14, currentPrice);

        // 3. Project 1-Standard Deviation Move
        const expectedMove = this._calculateExpectedMove(atr14, timeframe, volatilityState);

        // 4. Calculate Volatility Corridor (Bollinger-style bands)
        const corridor = {
            upper: currentPrice + expectedMove,
            lower: currentPrice - expectedMove,
            center: currentPrice,
            width: expectedMove * 2
        };

        return {
            corridor,
            expectedMove,
            volatilityState,
            regime: volatilityState.regime, // Flattened for convenience
            atr: atr14,
            atrAcceleration: parseFloat((atrAcceleration * 100).toFixed(2)), // As percentage
            reason: this._generateVolatilityReason(volatilityState, atrAcceleration)
        };
    }

    /**
     * Calculate Average True Range (ATR)
     */
    static _calculateATR(candles, period) {
        if (candles.length < period) return 0;

        const recent = candles.slice(-period);
        const trueRanges = [];

        for (let i = 1; i < recent.length; i++) {
            const high = recent[i].high;
            const low = recent[i].low;
            const prevClose = recent[i - 1].close;

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );
            trueRanges.push(tr);
        }

        return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
    }

    /**
     * Classify current volatility regime
     */
    static _classifyVolatility(atrAcceleration, atr, currentPrice) {
        const atrPercent = (atr / currentPrice) * 100;

        // Volatility is accelerating
        if (atrAcceleration > 0.2) {
            return {
                regime: 'EXPANDING',
                level: atrPercent > 3 ? 'EXTREME' : atrPercent > 1.5 ? 'HIGH' : 'MODERATE',
                description: 'Volatility is expanding. Expect wider price swings.'
            };
        }
        // Volatility is contracting
        else if (atrAcceleration < -0.2) {
            return {
                regime: 'CONTRACTING',
                level: atrPercent < 0.5 ? 'EXTREME' : atrPercent < 1.0 ? 'LOW' : 'MODERATE',
                description: 'Volatility is contracting. Accumulation phase likely.'
            };
        }
        // Stable volatility
        else {
            return {
                regime: 'STABLE',
                level: 'MODERATE',
                description: 'Volatility is stable. Normal market conditions.'
            };
        }
    }

    /**
     * Calculate expected move based on volatility and timeframe
     */
    static _calculateExpectedMove(atr, timeframe, volatilityState) {
        // Timeframe multipliers (approximate)
        const multipliers = {
            '1m': 0.2,
            '5m': 0.4,
            '15m': 0.7,
            '30m': 1.0,
            '1h': 1.4,
            '4h': 2.5,
            '1d': 5.0
        };

        const baseMultiplier = multipliers[timeframe] || 1.0;

        // Adjust for volatility regime
        let regimeMultiplier = 1.0;
        if (volatilityState.regime === 'EXPANDING') {
            regimeMultiplier = volatilityState.level === 'EXTREME' ? 1.5 : 1.2;
        } else if (volatilityState.regime === 'CONTRACTING') {
            regimeMultiplier = volatilityState.level === 'EXTREME' ? 0.6 : 0.8;
        }

        return atr * baseMultiplier * regimeMultiplier;
    }

    /**
     * Generate volatility explanation
     */
    static _generateVolatilityReason(volatilityState, atrAcceleration) {
        const direction = atrAcceleration > 0 ? 'increasing' : 'decreasing';
        const magnitude = Math.abs(atrAcceleration) > 0.3 ? 'rapidly' : 'gradually';

        return `Market volatility is ${magnitude} ${direction}. ${volatilityState.description}`;
    }

    /**
     * Detect "Vega Shock" (rapid volatility spike)
     * @param {Array} candles - Price data
     * @returns {Object|null} Shock details if detected
     */
    static detectVegaShock(candles) {
        if (candles.length < 20) return null;

        const recent10 = candles.slice(-10);
        const previous10 = candles.slice(-20, -10);

        const recentATR = this._calculateATR(recent10, 10);
        const previousATR = this._calculateATR(previous10, 10);

        const volatilitySpike = (recentATR - previousATR) / previousATR;

        if (volatilitySpike > 0.5) { // 50%+ ATR increase
            return {
                detected: true,
                magnitude: parseFloat((volatilitySpike * 100).toFixed(2)),
                type: 'VEGA_SHOCK',
                warning: `Volatility spike detected: ${(volatilitySpike * 100).toFixed(0)}% increase in ATR. Caution: wider stops required.`
            };
        }

        return null;
    }

    /**
     * Calculate volatility-weighted target distance
     * @param {number} baseDistance - Base TP distance (e.g., R:R ratio)
     * @param {Object} volatilityAnalysis - Result from calculateVolatilityCorridor
     * @returns {number} Adjusted distance
     */
    static adjustTargetForVolatility(baseDistance, volatilityAnalysis) {
        if (!volatilityAnalysis) return baseDistance;

        const { volatilityState, expectedMove } = volatilityAnalysis;

        // Expand targets during high volatility
        if (volatilityState.regime === 'EXPANDING') {
            return baseDistance * 1.3;
        }
        // Tighten targets during low volatility
        else if (volatilityState.regime === 'CONTRACTING') {
            return baseDistance * 0.8;
        }

        return baseDistance;
    }
}
