/**
 * Backtesting Engine
 * 
 * Tracks prediction vs actual outcomes to calculate model accuracy
 * and feed performance metrics back into probability weighting.
 */

export class BacktestingEngine {
    constructor() {
        this.predictions = new Map(); // key: {symbol}_  {timestamp}, value: prediction object
        this.outcomes = new Map();    // key: {symbol}_{timestamp}, value: actual outcome
        this.performanceMetrics = new Map(); // key: symbol, value: accuracy stats
    }

    /**
     * Record a prediction for later verification
     * @param {string} symbol - Trading pair
     * @param {number} timestamp - Prediction timestamp
     * @param {Object} prediction - Prediction object with probabilities
     */
    recordPrediction(symbol, timestamp, prediction) {
        const key = `${symbol}_${timestamp}`;
        this.predictions.set(key, {
            symbol,
            timestamp,
            dominantScenario: prediction.dominantScenario || prediction.direction,
            probabilities: prediction.probabilities || {
                up: prediction.upProb || 0,
                down: prediction.downProb || 0,
                range: prediction.rangeProb || 0
            },
            currentPrice: prediction.currentPrice,
            regime: prediction.regime,
            setup: prediction.setup
        });

        // Auto-cleanup old predictions (keep last 1000)
        if (this.predictions.size > 1000) {
            const oldestKey = this.predictions.keys().next().value;
            this.predictions.delete(oldestKey);
        }
    }

    /**
     * Verify prediction against actual market movement
     * @param {string} symbol - Trading pair
     * @param {number} predictionTimestamp - Original prediction timestamp
     * @param {number} currentPrice - Current price
     * @param {number} timeHorizonMs - Time elapsed since prediction (default: 4 hours)
     * @returns {Object|null} Verification result
     */
    verifyPrediction(symbol, predictionTimestamp, currentPrice, timeHorizonMs = 4 * 60 * 60 * 1000) {
        const key = `${symbol}_${predictionTimestamp}`;
        const prediction = this.predictions.get(key);

        if (!prediction) return null;

        const timeSincePrediction = Date.now() - predictionTimestamp;
        if (timeSincePrediction < timeHorizonMs) return null; // Too early to verify

        const priceChange = ((currentPrice - prediction.currentPrice) / prediction.currentPrice) * 100;

        // Determine actual direction
        let actualDirection = 'RANGE';
        if (Math.abs(priceChange) > 0.5) { // >0.5% movement qualifies as directional
            actualDirection = priceChange > 0 ? 'UP' : 'DOWN';
        }

        const predictedDirection = prediction.dominantScenario.toUpperCase();
        const isCorrect = actualDirection === predictedDirection;

        const outcome = {
            symbol,
            predictionTimestamp,
            verificationTimestamp: Date.now(),
            predicted: predictedDirection,
            actual: actualDirection,
            priceChange,
            isCorrect,
            confidence: Math.max(
                prediction.probabilities.up,
                prediction.probabilities.down,
                prediction.probabilities.range
            ),
            regime: prediction.regime,
            setup: prediction.setup
        };

        this.outcomes.set(key, outcome);
        this.updatePerformanceMetrics(symbol);

        return outcome;
    }

    /**
     * Update aggregate performance metrics for a symbol
     * @param {string} symbol - Trading pair
     */
    updatePerformanceMetrics(symbol) {
        const symbolOutcomes = Array.from(this.outcomes.values())
            .filter(o => o.symbol === symbol);

        if (symbolOutcomes.length === 0) return;

        const correctPredictions = symbolOutcomes.filter(o => o.isCorrect).length;
        const totalPredictions = symbolOutcomes.length;
        const accuracy = (correctPredictions / totalPredictions) * 100;

        // Calculate regime-specific accuracy
        const regimeStats = {};
        ['TRENDING', 'RANGING', 'VOLATILE'].forEach(regime => {
            const regimeOutcomes = symbolOutcomes.filter(o => o.regime === regime);
            if (regimeOutcomes.length > 0) {
                const regimeCorrect = regimeOutcomes.filter(o => o.isCorrect).length;
                regimeStats[regime] = {
                    accuracy: (regimeCorrect / regimeOutcomes.length) * 100,
                    sampleSize: regimeOutcomes.length
                };
            }
        });

        // Calculate average price change when correct vs incorrect
        const correctAvgChange = symbolOutcomes
            .filter(o => o.isCorrect)
            .reduce((sum, o) => sum + Math.abs(o.priceChange), 0) / correctPredictions || 0;

        const incorrectAvgChange = symbolOutcomes
            .filter(o => !o.isCorrect)
            .reduce((sum, o) => sum + Math.abs(o.priceChange), 0) / (totalPredictions - correctPredictions) || 0;

        this.performanceMetrics.set(symbol, {
            totalPredictions,
            correctPredictions,
            accuracy,
            regimeStats,
            avgCorrectChange: correctAvgChange,
            avgIncorrectChange: incorrectAvgChange,
            lastUpdated: Date.now()
        });
    }

    /**
     * Get performance metrics for a symbol
     * @param {string} symbol - Trading pair
     * @returns {Object|null} Performance metrics
     */
    getPerformanceMetrics(symbol) {
        return this.performanceMetrics.get(symbol) || null;
    }

    /**
     * Get Bayesian adjustment factor based on recent performance
     * @param {string} symbol - Trading pair
     * @param {string} regime - Current regime
     * @returns {number} Confidence multiplier (0.5 to 1.5)
     */
    getConfidenceAdjustment(symbol, regime) {
        const metrics = this.getPerformanceMetrics(symbol);
        if (!metrics || metrics.totalPredictions < 10) return 1.0; // Need at least 10 samples

        const regimeStat = metrics.regimeStats[regime];
        if (!regimeStat || regimeStat.sampleSize < 5) return 1.0; // Need at least 5 regime-specific samples

        // If accuracy > 60%, boost confidence; if < 45%, reduce confidence
        if (regimeStat.accuracy > 60) {
            return 1.0 + ((regimeStat.accuracy - 60) / 100); // Max 1.4x at 100% accuracy
        } else if (regimeStat.accuracy < 45) {
            return 0.5 + (regimeStat.accuracy / 90); // Min 0.5x at 0% accuracy
        }

        return 1.0;
    }

    /**
     * Get all performance metrics for dashboard display
     * @returns {Array} Array of symbol performance objects
     */
    getAllMetrics() {
        return Array.from(this.performanceMetrics.entries()).map(([symbol, metrics]) => ({
            symbol,
            ...metrics
        }));
    }

    /**
     * Reset all tracking data (for testing or fresh start)
     */
    reset() {
        this.predictions.clear();
        this.outcomes.clear();
        this.performanceMetrics.clear();
    }
}

// Singleton instance
export const backtestingEngine = new BacktestingEngine();
