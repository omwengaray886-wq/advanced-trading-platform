/**
 * Order Flow Analyzer
 * Detects institutional volume signatures and relative volume (RV) spikes.
 */
export class OrderFlowAnalyzer {
    /**
     * Detect Institutional Volume Activity
     * @param {Array} candles - Candlestick data
     * @param {number} period - Average period for volume (default: 20)
     * @returns {Object} - Volume analysis report
     */
    static detectInstitutionalVolume(candles, period = 20) {
        if (candles.length < period + 1) {
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
        if (candles.length < period) return 0;
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
