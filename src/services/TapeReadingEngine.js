/**
 * Tape Reading Engine (Phase 2)
 * 
 * Reconstructs Tick-Level Aggressiveness and Momentum Ignition.
 * Since we don't have raw tick data, we analyze "Tick Aggression" 
 * using intra-candle Volume Delta dynamics and micro-structure patterns.
 */
export class TapeReadingEngine {

    /**
     * Analyze "Tape" Aggressiveness
     * @param {Array} candles - Recent price action
     * @returns {Object} Tape analysis
     */
    static analyzeTape(candles) {
        if (!candles || candles.length < 5) return { aggression: 'NEUTRAL', score: 0 };

        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];

        // 1. Calculate Buying/Selling Pressure (Micro-Delta)
        const pressure = this._calculatePressure(lastCandle);

        // 2. Detect Momentum Ignition (Acceleration)
        const acceleration = this._detectIgnition(candles);

        // 3. Absorption Check (High Volume, Low Progress)
        const eff = this._calculateEfficiency(lastCandle);

        return {
            aggression: pressure.bias,
            buyPressure: pressure.buy,
            sellPressure: pressure.sell,
            delta: pressure.net,
            efficiency: eff,
            acceleration: acceleration,
            isIgnition: acceleration > 1.5 // 50% increase in velocity/vol
        };
    }

    /**
     * Reconstruct Buy/Sell Pressure from Candle Geometry & Volume
     */
    static _calculatePressure(candle) {
        const range = candle.high - candle.low;
        if (range === 0) return { buy: 0, sell: 0, net: 0, bias: 'NEUTRAL' };

        // Wick analysis tells us about rejection (opposing pressure)
        const upperWick = candle.high - Math.max(candle.open, candle.close);
        const lowerWick = Math.min(candle.open, candle.close) - candle.low;
        const body = Math.abs(candle.close - candle.open);

        // Estimate "Aggressive" Volume
        // Up Candle: Aggressive Buys = Body + Lower Wick (Buying up from lows)
        // Down Candle: Aggressive Sells = Body + Upper Wick (Selling down from highs)

        let buyVolRatio = 0.5; // Default neutral

        if (candle.close > candle.open) {
            // Bullish Candle
            // Buying pressure is dominant.
            // Weakness comes from Upper Wick (Sellers stepping in).
            const effectiveBuy = body + lowerWick;
            buyVolRatio = effectiveBuy / range;
        } else {
            // Bearish Candle
            // Selling pressure is dominant.
            // Weakness comes from Lower Wick (Buyers stepping in).
            const effectiveSell = body + upperWick;
            buyVolRatio = 1 - (effectiveSell / range);
        }

        const buyVolume = candle.volume * buyVolRatio;
        const sellVolume = candle.volume * (1 - buyVolRatio);

        const net = buyVolume - sellVolume;

        return {
            buy: buyVolume,
            sell: sellVolume,
            net: net,
            bias: net > 0 ? 'BULLISH' : 'BEARISH'
        };
    }

    /**
     * Detect Momentum Ignition (Velocity + Volume Surge)
     */
    static _detectIgnition(candles) {
        const last = candles[candles.length - 1];
        const prev = candles[candles.length - 2];

        // Velocity: Price change per minute (or per candle)
        const v1 = Math.abs(last.close - last.open);
        const v2 = Math.abs(prev.close - prev.open);

        // Volume Surge
        const volSurge = last.volume / (prev.volume || 1);

        // Ignition = Increasing Velocity AND Increasing Volume
        if (v1 > v2 && volSurge > 1.2) {
            return (v1 / (v2 || 0.00001)) * volSurge;
        }

        return 0;
    }

    /**
     * Monitor Tape for Whale Activity (Large Prints)
     * @param {Array} candles - Recent candles to establish baseline volume
     * @param {Object} currentTick - Current tick data { price, volume }
     */
    static monitorTape(candles, currentTick) {
        if (!candles || candles.length < 20 || !currentTick) return null;

        // Calculate baseline "Whale Threshold" (e.g., 5x average tick volume)
        // Since we don't have ticks, we estimate avg tick size as (Candle Vol / 100)
        const avgTickVol = (candles.reduce((sum, c) => sum + c.volume, 0) / candles.length) / 50;
        const whaleThreshold = avgTickVol * 10; // 10x normal size

        if (currentTick.volume > whaleThreshold) {
            return {
                isWhale: true,
                size: (currentTick.volume / avgTickVol).toFixed(1) + 'x',
                side: 'UNKNOWN', // Ticks need side inference, usually from price change
                price: currentTick.price,
                message: `WHALE PRINT DETECTED: ${currentTick.volume.toFixed(2)} contracts`
            };
        }
        return null;
    }

    /**
     * Calculate Value/Volume Efficiency
     * Low efficiency = Fighting/Churning (Tape is thick)
     * High efficiency = Slippage/Fast Move (Tape is thin)
     */
    static _calculateEfficiency(candle) {
        const range = candle.high - candle.low;
        // Price movement per unit of volume
        return range / (candle.volume || 1);
    }
}
