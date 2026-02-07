/**
 * Imbalance Detector
 * Identifies Fair Value Gaps (FVG) and institutional imbalances.
 */
export class ImbalanceDetector {
    /**
     * Detect Fair Value Gaps (FVG) with Context Awareness
     */
    static detectFVGs(candles, marketState = {}) {
        if (!candles || candles.length < 3) return [];

        const fvgs = [];
        const lookback = Math.min(candles.length, 100);

        for (let i = candles.length - lookback; i < candles.length - 1; i++) {
            if (i < 1 || i > candles.length - 2) continue;

            const c1 = candles[i - 1]; // Previous
            const c2 = candles[i];     // Middle (The Gap Candle)
            const c3 = candles[i + 1]; // Next

            let type, top, bottom;

            // Bullish FVG
            if (c3.low > c1.high) {
                type = 'BULLISH_FVG';
                top = c3.low;
                bottom = c1.high;
            }
            // Bearish FVG
            else if (c3.high < c1.low) {
                type = 'BEARISH_FVG';
                top = c1.low;
                bottom = c3.high;
            }

            if (type) {
                const isMitigated = this.checkMitigation(candles, i + 2, bottom, top, type.includes('BULLISH') ? 'BULLISH' : 'BEARISH');

                if (!isMitigated) {
                    const quality = this.calculateFVGQuality({ type, top, bottom, index: i }, candles, marketState);

                    fvgs.push({
                        type,
                        top,
                        bottom,
                        midpoint: (top + bottom) / 2,
                        size: Math.abs((top - bottom) / bottom) * 100,
                        quality,
                        cause: quality.impulsiveness > 0.7 ? 'impulsive_displacement' : 'natural_flow',
                        alignment: marketState.trend?.direction === (type.includes('BULLISH') ? 'BULLISH' : 'BEARISH') ? 'htf_aligned' : 'counter_trend',
                        expectation: quality.score > 0.8 ? 'partial_fill_then_continue' : 'full_retrace_likely',
                        index: i,
                        mitigated: false
                    });
                }
            }
        }

        return fvgs;
    }

    /**
     * Score FVG quality based on institutional context
     */
    static calculateFVGQuality(fvg, candles, marketState) {
        const gapCandle = candles[fvg.index];
        const bodySize = Math.abs(gapCandle.close - gapCandle.open);
        const candleRange = gapCandle.high - gapCandle.low;

        // 1. Displacement Score (Body to Wicks ratio)
        const displacement = bodySize / candleRange;

        // 2. Alignment Score
        const fvgDir = fvg.type.includes('BULLISH') ? 'BULLISH' : 'BEARISH';
        const alignment = marketState.trend?.direction === fvgDir ? 0.4 : 0.1;

        // 3. Significance based on candle size relative to ATR
        const atr = marketState.atr || 0;
        const sizeSignificance = atr > 0 ? Math.min(bodySize / atr, 1.0) * 0.3 : 0.15;

        const score = (displacement * 0.3) + alignment + sizeSignificance;

        return {
            score: Math.min(score, 1.0),
            displacement,
            is_institutional: displacement > 0.7 && sizeSignificance > 0.2
        };
    }

    /**
     * Check if a gap has been filled/mitigated
     */
    static checkMitigation(candles, startIndex, low, high, type) {
        if (startIndex >= candles.length) return false;

        for (let j = startIndex; j < candles.length; j++) {
            const c = candles[j];
            if (type === 'BULLISH') {
                if (c.low <= (high + low) / 2) return true; // High timeframe mitigation often targets 50%
            } else {
                if (c.high >= (high + low) / 2) return true;
            }
        }
        return false;
    }

    /**
     * Get the most relevant (highest quality + closest) unmitigated FVG
     */
    static getMostRelevantFVG(fvgs, currentPrice) {
        if (!fvgs || fvgs.length === 0) return null;

        return fvgs.reduce((best, current) => {
            const dist = Math.abs(current.midpoint - currentPrice);
            const score = current.quality.score / (dist || 1); // Hybrid relevance score

            if (!best || score > (best.quality.score / Math.abs(best.midpoint - currentPrice))) {
                return current;
            }
            return best;
        }, null);
    }
}

