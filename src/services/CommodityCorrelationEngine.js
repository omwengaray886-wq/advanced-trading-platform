import { marketData } from './marketData.js';

/**
 * Commodity Correlation Engine
 * Analyzes predictive relationships between commodities and currencies
 * Detects divergences and lead/lag patterns
 */

export class CommodityCorrelationEngine {
    /**
     * Define key commodity-FX relationships
     */
    static correlationPairs = {
        'XAUUSD': { // Gold
            correlations: [
                { symbol: 'DXY', type: 'INVERSE', strength: -0.7, leadLag: 'SYNC' },
                { symbol: 'EURUSD', type: 'POSITIVE', strength: 0.6, leadLag: 'SYNC' },
                { symbol: 'USDJPY', type: 'INVERSE', strength: -0.5, leadLag: 'SYNC' }
            ],
            ratios: ['XAGUSD'] // Gold/Silver ratio
        },
        'XAGUSD': { // Silver
            correlations: [
                { symbol: 'XAUUSD', type: 'POSITIVE', strength: 0.8, leadLag: 'LAG' }
            ]
        },
        'BTCUSD': { // Bitcoin (digital gold)
            correlations: [
                { symbol: 'XAUUSD', type: 'POSITIVE', strength: 0.4, leadLag: 'LEAD' },
                { symbol: 'DXY', type: 'INVERSE', strength: -0.5, leadLag: 'LAG' }
            ]
        },
        'USOIL': { // Crude Oil
            correlations: [
                { symbol: 'USDCAD', type: 'INVERSE', strength: -0.7, leadLag: 'LEAD' },
                { symbol: 'CADJPY', type: 'POSITIVE', strength: 0.6, leadLag: 'LEAD' }
            ]
        },
        'COPPER': { // Copper (Dr. Copper - economic bellwether)
            correlations: [
                { symbol: 'AUDUSD', type: 'POSITIVE', strength: 0.65, leadLag: 'LEAD' },
                { symbol: 'SPX500', type: 'POSITIVE', strength: 0.7, leadLag: 'SYNC' }
            ]
        },
        'EURUSD': {
            correlations: [
                { symbol: 'DXY', type: 'INVERSE', strength: -0.9, leadLag: 'SYNC' }
            ]
        },
        'GBPUSD': {
            correlations: [
                { symbol: 'DXY', type: 'INVERSE', strength: -0.85, leadLag: 'SYNC' }
            ]
        },
        'AUDUSD': { // Aussie (commodity currency)
            correlations: [
                { symbol: 'COPPER', type: 'POSITIVE', strength: 0.65, leadLag: 'LAG' },
                { symbol: 'XAUUSD', type: 'POSITIVE', strength: 0.5, leadLag: 'LAG' }
            ]
        },
        'USDCAD': { // Loonie (oil currency)
            correlations: [
                { symbol: 'USOIL', type: 'INVERSE', strength: -0.7, leadLag: 'LAG' }
            ]
        }
    };

    /**
     * Analyze commodity correlations for a symbol
     * @param {string} symbol - Trading pair
     * @param {Array} candles - Price history
     * @param {Object} marketState - Current market context
     * @returns {Object} Correlation analysis
     */
    static async analyze(symbol, candles, marketState) {
        const config = this.correlationPairs[symbol];
        if (!config || !config.correlations) {
            return {
                hasCorrelations: false,
                pairs: [],
                signals: []
            };
        }

        const results = [];
        const signals = [];

        // Analyze each correlation pair
        for (const pair of config.correlations) {
            try {
                const analysis = await this._analyzePair(symbol, pair, candles);
                results.push(analysis);

                // Generate signals from divergences
                if (analysis.divergence && analysis.divergence.detected) {
                    signals.push({
                        type: 'CORRELATION_DIVERGENCE',
                        pair: `${symbol} vs ${pair.symbol}`,
                        strength: analysis.divergence.strength,
                        direction: analysis.divergence.implication,
                        message: analysis.divergence.message
                    });
                }
            } catch (error) {
                console.warn(`Failed to analyze ${pair.symbol}:`, error.message);
            }
        }

        // Analyze ratios (e.g., Gold/Silver)
        let ratioAnalysis = null;
        if (config.ratios && config.ratios.length > 0) {
            ratioAnalysis = await this._analyzeRatio(symbol, config.ratios[0], candles);
            if (ratioAnalysis.signal) {
                signals.push(ratioAnalysis.signal);
            }
        }

        return {
            hasCorrelations: true,
            pairs: results,
            ratioAnalysis,
            signals,
            summary: this._generateSummary(results, signals)
        };
    }

    /**
     * Analyze a specific correlation pair
     */
    static async _analyzePair(baseSymbol, pairConfig, baseCandles) {
        const { symbol: corrSymbol, type, strength: expectedStrength, leadLag } = pairConfig;

        // Fetch correlated asset data
        // In production, this would be real data. For now, simulate or use cached data
        const corrCandles = await this._fetchCorrelatedData(corrSymbol);

        if (!corrCandles || corrCandles.length < 14) {
            return {
                symbol: corrSymbol,
                correlation: null,
                status: 'NO_DATA'
            };
        }

        // Calculate actual correlation
        const actualCorrelation = this._calculateCorrelation(baseCandles, corrCandles);

        // Detect divergence (correlation breakdown)
        const divergence = this._detectDivergence(
            baseCandles,
            corrCandles,
            type,
            expectedStrength,
            actualCorrelation
        );

        return {
            symbol: corrSymbol,
            expectedType: type,
            expectedStrength,
            actualCorrelation,
            leadLag,
            divergence,
            status: 'ACTIVE'
        };
    }

    /**
     * Calculate Pearson correlation between two price series
     */
    static _calculateCorrelation(candles1, candles2) {
        const length = Math.min(candles1.length, candles2.length, 50); // Last 50 periods
        const returns1 = [];
        const returns2 = [];

        for (let i = 1; i < length; i++) {
            const idx1 = candles1.length - length + i;
            const idx2 = candles2.length - length + i;

            returns1.push((candles1[idx1].close - candles1[idx1 - 1].close) / candles1[idx1 - 1].close);
            returns2.push((candles2[idx2].close - candles2[idx2 - 1].close) / candles2[idx2 - 1].close);
        }

        const mean1 = returns1.reduce((a, b) => a + b, 0) / returns1.length;
        const mean2 = returns2.reduce((a, b) => a + b, 0) / returns2.length;

        let numerator = 0;
        let sumSq1 = 0;
        let sumSq2 = 0;

        for (let i = 0; i < returns1.length; i++) {
            const diff1 = returns1[i] - mean1;
            const diff2 = returns2[i] - mean2;
            numerator += diff1 * diff2;
            sumSq1 += diff1 * diff1;
            sumSq2 += diff2 * diff2;
        }

        const denominator = Math.sqrt(sumSq1 * sumSq2);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    /**
     * Detect correlation divergence (breakdown or reversal)
     */
    static _detectDivergence(base, corr, expectedType, expectedStrength, actualCorr) {
        const threshold = 0.3; // Significant divergence threshold
        const deviation = Math.abs(actualCorr - expectedStrength);

        if (deviation > threshold) {
            const detected = true;
            const strength = Math.min(1, deviation / 0.5);

            let implication = 'NEUTRAL';
            let message = '';

            // If positive correlation breaks down (or becomes negative)
            if (expectedType === 'POSITIVE' && actualCorr < 0.2) {
                implication = 'BEARISH';
                message = `${base[0].symbol} breaking positive correlation with ${corr[0]?.symbol || 'correlated asset'} - Potential weakness`;
            }
            // If inverse correlation breaks down (becomes positive)
            else if (expectedType === 'INVERSE' && actualCorr > -0.2) {
                implication = 'UNUSUAL';
                message = `Unusual correlation behavior detected - Monitor for regime change`;
            }
            // If correlation strengthening abnormally
            else if (Math.abs(actualCorr) > Math.abs(expectedStrength) + 0.3) {
                implication = actualCorr > 0 ? 'BULLISH' : 'BEARISH';
                message = `Correlation strengthening beyond normal - Momentum confirmation`;
            }

            return {
                detected,
                strength,
                expectedCorr: expectedStrength,
                actualCorr,
                deviation,
                implication,
                message
            };
        }

        return { detected: false, actualCorr };
    }

    /**
     * Analyze price ratios (e.g., Gold/Silver)
     */
    static async _analyzeRatio(numeratorSymbol, denominatorSymbol, numeratorCandles) {
        const denomCandles = await this._fetchCorrelatedData(denominatorSymbol);

        if (!denomCandles || denomCandles.length < 14) {
            return { ratio: null, signal: null };
        }

        // Calculate current ratio
        const numPrice = numeratorCandles[numeratorCandles.length - 1].close;
        const denomPrice = denomCandles[denomCandles.length - 1].close;
        const currentRatio = numPrice / denomPrice;

        // Calculate historical average (simplified)
        const avgRatio = 80; // Gold/Silver historical avg ~80:1
        const deviation = ((currentRatio - avgRatio) / avgRatio) * 100;

        let signal = null;
        if (Math.abs(deviation) > 10) {
            signal = {
                type: 'RATIO_EXTREME',
                ratioName: `${numeratorSymbol}/${denominatorSymbol}`,
                currentRatio: currentRatio.toFixed(2),
                historicalAvg: avgRatio,
                deviation: deviation.toFixed(1) + '%',
                message: deviation > 0
                    ? `Ratio elevated - ${numeratorSymbol} relatively expensive, consider ${denominatorSymbol}`
                    : `Ratio depressed - ${denominatorSymbol} relatively expensive, consider ${numeratorSymbol}`
            };
        }

        return {
            numerator: numeratorSymbol,
            denominator: denominatorSymbol,
            currentRatio,
            historicalAvg: avgRatio,
            deviation,
            signal
        };
    }

    /**
     * Fetch correlated asset data (simulated for now)
     */
    static async _fetchCorrelatedData(symbol) {
        try {
            const data = await marketData.fetchHistory(symbol, '1d', 50);
            return data;
        } catch (error) {
            // Fallback: simulate data based on symbol
            return null;
        }
    }

    /**
     * Generate summary of correlation analysis
     */
    static _generateSummary(results, signals) {
        if (results.length === 0) return 'No correlation data available';

        const activeCorrelations = results.filter(r => r.status === 'ACTIVE').length;
        const divergences = signals.filter(s => s.type === 'CORRELATION_DIVERGENCE').length;

        if (divergences > 0) {
            return `${activeCorrelations} correlations tracked, ${divergences} divergence(s) detected`;
        }

        return `${activeCorrelations} correlations behaving normally`;
    }

    /**
     * Get commodity correlation bonus for strategy scoring
     * @param {string} direction - LONG | SHORT
     * @param {Object} corrData - Commodity correlation data
     * @returns {number} Bonus points (0-10)
     */
    static getCorrelationAlignmentBonus(direction, corrData) {
        if (!corrData || !corrData.signals || corrData.signals.length === 0) return 0;

        let bonus = 0;

        for (const signal of corrData.signals) {
            if (signal.direction === direction ||
                (direction === 'LONG' && signal.direction === 'BULLISH') ||
                (direction === 'SHORT' && signal.direction === 'BEARISH')) {
                bonus += signal.strength * 10;
            }
        }

        return Math.min(10, Math.round(bonus));
    }
}
