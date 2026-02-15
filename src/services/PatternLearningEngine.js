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
    /**
     * Dynamic Time Warping (DTW) Distance
     * Lower is better (0 = identical).
     * Allows matching "stretched" or "compressed" patterns.
     */
    _dtwDistance(s1, s2) {
        const n = s1.length;
        const m = s2.length;

        // Initialize distance matrix with Infinity
        const dtw = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
        dtw[0][0] = 0;

        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                const cost = Math.abs(s1[i - 1] - s2[j - 1]);
                dtw[i][j] = cost + Math.min(
                    dtw[i - 1][j],    // Insertion
                    dtw[i][j - 1],    // Deletion
                    dtw[i - 1][j - 1]   // Match
                );
            }
        }

        return dtw[n][m];
    }

    /**
     * Find similar historical patterns using DTW
     */
    findSimilarPatterns(candles) {
        if (candles.length < this.memorySize) return null;

        const currentPattern = this._normalize(candles.slice(-this.patternLength));
        const history = candles.slice(0, candles.length - this.patternLength);

        let matches = [];
        const windowSize = this.patternLength;

        // Sliding window with flexible length (0.8x to 1.2x stretching)
        // For Phase 6 MVP, we stick to fixed length but use DTW distance metric instead of correlation

        for (let i = 0; i < history.length - windowSize; i += 4) {
            const candidateRaw = history.slice(i, i + windowSize);
            const candidate = this._normalize(candidateRaw);

            // DTW returns cumulative distance.
            const dist = this._dtwDistance(currentPattern, candidate);

            // Normalize by pattern length to get "Average Error per Candle"
            // Since data is normalized 0-1, an avg error of 0.1 means 10% deviation
            const avgError = dist / this.patternLength;

            // Similarity: 1.0 means identical. 0.0 means completely different (avg error >= 1.0)
            const similarity = Math.max(0, 1 - avgError);

            if (similarity > 0.80) { // Allow up to 20% average deviation
                matches.push({
                    index: i,
                    similarity,
                    outcome: this._assessOutcome(history, i + windowSize)
                });
            }
        }

        if (matches.length === 0) return null;

        // Aggregate results
        const bullishOutcomes = matches.filter(m => m.outcome > 0).length;
        const bearishOutcomes = matches.filter(m => m.outcome < 0).length;
        const total = matches.length;

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
     * Normalize geometric pattern to 0-1 scale
     */
    _normalize(segment) {
        const min = Math.min(...segment.map(c => c.low));
        const max = Math.max(...segment.map(c => c.high));
        const range = max - min || 1;
        return segment.map(c => (c.close - min) / range);
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
