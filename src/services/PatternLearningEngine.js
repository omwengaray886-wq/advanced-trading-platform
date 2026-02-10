/**
 * Pattern Learning Engine
 * 
 * Uses fractal recognition (k-Nearest Neighbors) to find historical price actions
 * that resemble the current market structure.
 * 
 * If the current setup matches a historical "winning" pattern, confidence is boosted.
 */
export class PatternLearningEngine {
    constructor() {
        this.memorySize = 1000; // Look back limit
        this.patternLength = 16; // Number of candles to match
    }

    /**
     * Find similar historical patterns
     * @param {Array} candles - Full history
     * @returns {Object} Match stats
     */
    findSimilarPatterns(candles) {
        if (candles.length < this.memorySize) return null;

        const currentPattern = this._normalize(candles.slice(-this.patternLength));
        const history = candles.slice(0, candles.length - this.patternLength); // Exclude current

        let matches = [];

        // Sliding window search
        // We skip every 4 candles for speed (stride)
        for (let i = 0; i < history.length - this.patternLength; i += 4) {
            const candidate = this._normalize(history.slice(i, i + this.patternLength));
            const similarity = this._correlation(currentPattern, candidate);

            if (similarity > 0.85) { // High correlation threshold
                matches.push({
                    index: i,
                    similarity,
                    outcome: this._assessOutcome(history, i + this.patternLength)
                });
            }
        }

        if (matches.length === 0) return null;

        // Aggregate results
        const bullishOutcomes = matches.filter(m => m.outcome > 0).length;
        const bearishOutcomes = matches.filter(m => m.outcome < 0).length;
        const total = matches.length;

        // Determine predictive bias
        let prediction = 'NEUTRAL';
        let confidence = 0;

        if (bullishOutcomes / total > 0.65) {
            prediction = 'BULLISH';
            confidence = bullishOutcomes / total;
        } else if (bearishOutcomes / total > 0.65) {
            prediction = 'BEARISH';
            confidence = bearishOutcomes / total;
        }

        return {
            matchCount: total,
            prediction,
            confidence,
            bestMatch: matches.sort((a, b) => b.similarity - a.similarity)[0]
        };
    }

    /**
     * Normalize geometric pattern to 0-1 scale (or % change)
     * so that absolute price doesn't matter, only shape.
     */
    _normalize(segment) {
        const min = Math.min(...segment.map(c => c.low));
        const max = Math.max(...segment.map(c => c.high));
        const range = max - min || 1;

        return segment.map(c => (c.close - min) / range);
    }

    /**
     * Pearson correlation coefficient (simplified)
     */
    _correlation(a, b) {
        const n = a.length;
        let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;

        for (let i = 0; i < n; i++) {
            sum1 += a[i];
            sum2 += b[i];
            sum1Sq += a[i] * a[i];
            sum2Sq += b[i] * b[i];
            pSum += a[i] * b[i];
        }

        const num = pSum - (sum1 * sum2 / n);
        const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

        if (den === 0) return 0;
        return num / den;
    }

    /**
     * Check what happened AFTER the pattern
     * Returns +1 for bullish move, -1 for bearish, 0 for chop
     */
    _assessOutcome(FullHistory, endIndex) {
        // Look ahead 10 candles
        if (endIndex + 10 >= FullHistory.length) return 0;

        const startPrice = FullHistory[endIndex].close;
        const future = FullHistory.slice(endIndex + 1, endIndex + 10);
        const maxHigh = Math.max(...future.map(c => c.high));
        const minLow = Math.min(...future.map(c => c.low));

        if (maxHigh > startPrice * 1.01) return 1; // 1% gain
        if (minLow < startPrice * 0.99) return -1; // 1% loss
        return 0;
    }
}
