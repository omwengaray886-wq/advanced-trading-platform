/**
 * Genetic Signature Refiner (GSR)
 * Phase 6 Elite Accuracy Upgrade
 * 
 * Captures the "DNA" of successful trades (candle morphology, volume footprint)
 * and verifies if new setups match the characteristics of recent winners.
 */
export class GSRefiner {
    constructor() {
        this.signatures = new Map(); // Store by symbol or globally
        this.DNA_LIMIT = 20; // Keep last 20 winning signatures
    }

    async recordSuccess(symbol, candlesOrDna) {
        if (!candlesOrDna || candlesOrDna.length < 5) return;

        // If it's already DNA (array of objects with bodyRatio), use it. Otherwise extract.
        const dna = (candlesOrDna[0] && candlesOrDna[0].bodyRatio !== undefined)
            ? candlesOrDna
            : this.extractDNA(candlesOrDna.slice(-5));

        if (!this.signatures.has(symbol)) {
            this.signatures.set(symbol, []);
        }

        const library = this.signatures.get(symbol);
        library.push({
            dna,
            timestamp: Date.now()
        });

        // Limit library size
        if (library.length > this.DNA_LIMIT) library.shift();

        console.log(`[GSR Engine] Captured Winning DNA for ${symbol}`);
    }

    /**
     * Extract Candle Morphology DNA
     * Includes wick ratios, body displacement, and relative volume
     */
    extractDNA(candles) {
        return candles.map(c => {
            const range = c.high - c.low || 1;
            const body = Math.abs(c.close - c.open);
            const upperWick = c.high - Math.max(c.open, c.close);
            const lowerWick = Math.min(c.open, c.close) - c.low;

            return {
                bodyRatio: body / range,
                upperWickRatio: upperWick / range,
                lowerWickRatio: lowerWick / range,
                isBullish: c.close >= c.open,
                relativeVolume: 1.0 // This would ideally be normalized against ATR/AvgVol
            };
        });
    }

    /**
     * Analyze a new setup against winning signatures
     * @param {string} symbol 
     * @param {Array} currentCandles 
     * @returns {Object} Compatibility report
     */
    analyzeCompatibility(symbol, currentCandles) {
        if (!this.signatures.has(symbol) || this.signatures.get(symbol).length === 0) {
            return { compatibility: 0.5, rating: 'NEUTRAL', note: 'No winning history for this symbol yet.' };
        }

        const currentDNA = this.extractDNA(currentCandles.slice(-5));
        const library = this.signatures.get(symbol);

        // Find best match in the library
        let maxSimilarity = 0;
        library.forEach(winner => {
            const sim = this._calculateSimilarity(currentDNA, winner.dna);
            if (sim > maxSimilarity) maxSimilarity = sim;
        });

        let rating = 'AVERAGE';
        if (maxSimilarity > 0.85) rating = 'ELITE_MATCH';
        else if (maxSimilarity > 0.70) rating = 'STRONG_MATCH';
        else if (maxSimilarity < 0.40) rating = 'POOR_MATCH';

        return {
            compatibility: parseFloat(maxSimilarity.toFixed(2)),
            rating,
            note: `Current candles are a ${Math.round(maxSimilarity * 100)}% match to recent win signatures.`
        };
    }


    /**
     * Calculate Similarity between two DNA sequences
     * @private
     */
    _calculateSimilarity(dna1, dna2) {
        if (dna1.length !== dna2.length) return 0;

        let totalScore = 0;
        for (let i = 0; i < dna1.length; i++) {
            const c1 = dna1[i];
            const c2 = dna2[i];

            // 1. Direction match
            if (c1.isBullish === c2.isBullish) totalScore += 0.2;

            // 2. Morphology match (0.4 weight)
            const bodyDiff = Math.abs(c1.bodyRatio - c2.bodyRatio);
            const upperDiff = Math.abs(c1.upperWickRatio - c2.upperWickRatio);
            const lowerDiff = Math.abs(c1.lowerWickRatio - c2.lowerWickRatio);

            totalScore += (1 - (bodyDiff + upperDiff + lowerDiff) / 3) * 0.8;
        }

        return totalScore / dna1.length;
    }
}

export const gsRefiner = new GSRefiner();
