/**
 * Order Flow Analyzer (Phase 5)
 * 
 * Estimates institutional intent via Volume Delta and Absorption Analysis.
 * Validates whether a "Liquidity Sweep" or "BOS" has the underlying 
 * volume commitment required for high-accuracy predictions.
 */
export class OrderFlowAnalyzer {
    /**
     * Analyze recent order flow for a set of candles
     * @param {Array} candles 
     * @returns {Object} { delta, absorption, intensity }
     */
    static analyze(candles) {
        if (!candles || candles.length === 0) return null;

        const recentCandles = candles.slice(-5);
        const results = recentCandles.map(c => this._calculateDelta(c));

        const netDelta = results.reduce((sum, r) => sum + r.net, 0);
        const avgVolume = results.reduce((sum, r) => sum + r.volume, 0) / results.length;

        // 1. Detect Absorption
        // If volume is high (1.5x avg) but range is low, institutions are absorbing.
        const absorption = this._detectAbsorption(recentCandles[recentCandles.length - 1], avgVolume, recentCandles);

        // 2. Identify Climax
        // Extremely high delta in one direction often indicates exhaustion
        const climax = this._detectClimax(results[results.length - 1], avgVolume);

        return {
            currentDelta: results[results.length - 1].net,
            netDelta5: netDelta,
            bias: netDelta > 0 ? 'BULLISH' : 'BEARISH',
            intensity: Math.abs(netDelta) / avgVolume,
            absorption,
            climax,
            isInstitutional: Math.abs(results[results.length - 1].net) > (avgVolume * 0.4) // 40% of volume is directional
        };
    }

    /**
     * Estimate Delta based on Price Action/Volume (OFS - Order Flow Simulation)
     */
    static _calculateDelta(candle) {
        const range = candle.high - candle.low;
        if (range === 0) return { net: 0, volume: candle.volume };

        // Bullish Pressure: How much of the candle is above the Low?
        const bullPressure = (candle.close - candle.low) / range;
        const bearPressure = (candle.high - candle.close) / range;

        const bullVolume = candle.volume * bullPressure;
        const bearVolume = candle.volume * bearPressure;

        return {
            bull: bullVolume,
            bear: bearVolume,
            net: bullVolume - bearVolume,
            volume: candle.volume
        };
    }

    /**
     * Detect Institutional Absorption
     */
    static _detectAbsorption(candle, avgVolume, recentCandles = []) {
        const range = Math.abs(candle.high - candle.low);
        const avgRange = recentCandles.length > 0
            ? recentCandles.reduce((sum, c) => sum + Math.abs(c.high - c.low), 0) / recentCandles.length
            : range;

        // High Volume + Low Range = Absorption
        if (candle.volume > avgVolume * 1.5 && range < avgRange * 0.8) {
            return {
                detected: true,
                type: candle.close > candle.open ? 'BULLISH_ABSORPTION' : 'BEARISH_ABSORPTION',
                note: 'High volume with minimal price movement indicates institutional accumulation/distribution.'
            };
        }
        return { detected: false };
    }

    /**
     * Detect Volume Climax (Exhaustion)
     */
    static _detectClimax(lastDelta, avgVolume) {
        if (Math.abs(lastDelta.net) > avgVolume * 2.0) {
            return {
                detected: true,
                type: lastDelta.net > 0 ? 'BUYING_CLIMAX' : 'SELLING_CLIMAX',
                note: 'Extreme directional volume peak. Beware of reversal/exhaustion.'
            };
        }
        return { detected: false };
    }

    /**
     * Detect Institutional Volume Activity (Phase 6)
     * @param {Array} candles - Candlestick data
     * @param {number} period - Average period for volume (default: 20)
     * @returns {Object} - Volume analysis report
     */
    static detectInstitutionalVolume(candles, period = 20) {
        if (!candles || candles.length < period + 1) {
            return { relativeVolume: 1, isInstitutional: false, type: 'NEUTRAL', score: 0 };
        }

        const recentCandles = candles.slice(-(period + 1));
        const lastCandle = recentCandles[recentCandles.length - 1];
        const prevCandles = recentCandles.slice(0, -1);

        // Calculate Average Volume
        const avgVolume = prevCandles.reduce((sum, c) => sum + (c.volume || 0), 0) / period;
        const currentVolume = lastCandle.volume || 0;

        if (avgVolume === 0) return { relativeVolume: 1, isInstitutional: false, type: 'NEUTRAL', score: 0 };

        const rv = currentVolume / avgVolume;

        // Institutional Thresholds
        let type = 'NORMAL';
        let score = 0;
        let isInstitutional = false;

        if (rv > 2.5) {
            type = 'INSTITUTIONAL_SPIKE';
            score = 100;
            isInstitutional = true;
        } else if (rv > 1.8) {
            type = 'SIGNIFICANT';
            score = 75;
            isInstitutional = true;
        } else if (rv > 1.2) {
            type = 'ABOVE_AVERAGE';
            score = 40;
        }

        // Detect Volume Climax vs Participation
        // If price spread is small but volume is HUGE = Absorption/Climax
        const priceSpread = Math.abs(lastCandle.high - lastCandle.low);
        const atr = this.calculateSimpleATR(candles, 14);

        let subType = 'PARTICIPATION';
        if (rv > 2.0 && priceSpread < atr * 0.5) {
            subType = 'ABSORPTION'; // High volume, little price move = institutional absorption
        } else if (rv > 2.0 && priceSpread > atr * 2.0) {
            subType = 'CLIMAX'; // High volume, massive move = exhaustion/climax
        }

        return {
            relativeVolume: parseFloat(rv.toFixed(2)),
            isInstitutional,
            type,
            subType,
            score,
            rationale: this.generateRationale(rv, type, subType)
        };
    }

    static calculateSimpleATR(candles, period) {
        if (!candles || candles.length < period) return 0;
        const recent = candles.slice(-period);
        const tr = recent.map(c => c.high - c.low);
        return tr.reduce((sum, val) => sum + val, 0) / period;
    }

    static generateRationale(rv, type, subType) {
        if (rv > 2.5) return `Massive Institutional Spike (${rv}x RV). Strong smart money footprint.`;
        if (rv > 1.8) return `Significant Volume Surge (${rv}x RV). Institutional participation confirmed.`;
        if (rv > 1.2) return `Above average volume (${rv}x RV). Increased interest.`;
        return `Normal volume levels (${rv}x RV).`;
    }

    /**
     * Calculate Heatmap Intensity (Tape Reading)
     * Simulated from price action and volume delta.
     */
    /**
     * Detect Iceberg Orders (Hidden Liquidity)
     * Heuristic: Repeated high volume triggers at a specific price level with minimal displacement.
     * @param {Array} candles - Recent price action
     */
    static detectIceberg(candles) {
        if (!candles || candles.length < 10) return null;

        const levels = {};
        const threshold = this.calculateSimpleATR(candles, 14) * 0.2; // 20% of ATR tolerance

        candles.slice(-10).forEach(c => {
            // Check Highs (Sell Iceberg)
            const highKey = Math.round(c.high / threshold) * threshold;
            if (!levels[highKey]) levels[highKey] = { vol: 0, touches: 0, type: 'SELL_ICEBERG' };

            // Check Lows (Buy Iceberg)
            const lowKey = Math.round(c.low / threshold) * threshold;
            if (!levels[lowKey]) levels[lowKey] = { vol: 0, touches: 0, type: 'BUY_ICEBERG' };

            // Logic: If close is near high/low and volume is high, add stats
            if (Math.abs(c.high - c.close) < threshold) {
                levels[highKey].vol += c.volume;
                levels[highKey].touches++;
            }
            if (Math.abs(c.close - c.low) < threshold) {
                levels[lowKey].vol += c.volume;
                levels[lowKey].touches++;
            }
        });

        // specific price levels with > 3 touches and high volume
        const avgVol = candles.reduce((sum, c) => sum + c.volume, 0) / candles.length;

        const icebergs = Object.entries(levels)
            .filter(([_, data]) => data.touches >= 3 && data.vol > avgVol * 5.0)
            .map(([price, data]) => ({
                price: parseFloat(price),
                type: data.type,
                volume: data.vol,
                strength: (data.vol / avgVol).toFixed(1) + 'x'
            }));

        return icebergs.length > 0 ? icebergs.sort((a, b) => b.volume - a.volume)[0] : null;
    }

    /**
     * Calculate Cumulative Volume Delta (CVD)
     * Tracks the "Tape" sentiment over time.
     */
    static calculateCVD(candles) {
        if (!candles || candles.length === 0) return [];

        let cumulative = 0;
        return candles.map(c => {
            const delta = this._calculateDelta(c).net;
            cumulative += delta;
            return { time: c.time, cvd: cumulative, delta };
        });
    }

    // ... existing helper methods ...
    static calculateHeatmap(candles, rowCount = 50) {
        if (!candles || candles.length === 0) return null;

        const prices = candles.flatMap(c => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice;
        const step = range / rowCount;

        if (step === 0) return null;

        const layers = [];
        for (let i = 0; i < rowCount; i++) {
            const low = minPrice + (i * step);
            const high = low + step;
            layers.push({
                low,
                high,
                center: (low + high) / 2,
                intensity: 0,
                buyPressure: 0,
                sellPressure: 0
            });
        }

        // Aggregate intensity from last 100 candles (visible context)
        const sample = candles.slice(-100);
        sample.forEach(candle => {
            const vol = candle.volume || 0;
            const isUp = candle.close >= candle.open;

            const startIndex = Math.max(0, Math.floor((candle.low - minPrice) / step));
            const endIndex = Math.min(rowCount - 1, Math.floor((candle.high - minPrice) / step));

            for (let i = startIndex; i <= endIndex; i++) {
                layers[i].intensity += vol;
                if (isUp) layers[i].buyPressure += vol;
                else layers[i].sellPressure += vol;
            }
        });

        // Normalize intensity (0-1)
        const maxIntensity = Math.max(...layers.map(l => l.intensity));
        const heatmap = layers.map(l => ({
            ...l,
            intensity: maxIntensity > 0 ? l.intensity / maxIntensity : 0,
            dominance: l.intensity > 0 ? (l.buyPressure - l.sellPressure) / l.intensity : 0
        }));

        // Detect "Liquidity Walls"
        const walls = heatmap
            .filter(h => h.intensity > 0.8)
            .map(h => ({
                price: h.center,
                intensity: h.intensity,
                type: h.dominance > 0 ? 'BUY_WALL' : 'SELL_WALL'
            }));

        return {
            heatmap,
            walls: walls.slice(0, 5),
            maxIntensity
        };
    }
}
