/**
 * Relative Strength Engine
 * Compares asset performance against benchmarks to identify leaders and laggards.
 */
import { marketData } from './marketData.js';

export class RelativeStrengthEngine {
    constructor() {
        this.benchmarks = {
            'CRYPTO': 'BTCUSDT',
            'FOREX': 'EURUSDT', // Using EURUSD as a proxy for non-USD strength
            'METALS': 'GC=F',   // Gold Futures if available, else standard Gold
            'INDICES': 'SPY'
        };
    }

    /**
     * Calculate Multi-Timeframe Relative Strength
     * @param {string} symbol - Current symbol
     * @param {string} assetClass - FOREX, CRYPTO, etc.
     * @param {Object} multiCandles - Map of timeframe to candles
     * @returns {Promise<Object>} - MTF Relative strength report
     */
    async calculateMTFRelativeStrength(symbol, assetClass, multiCandles) {
        try {
            const timeframes = ['1h', '4h', '1d'];
            const benchmarkSymbol = this.benchmarks[assetClass];

            if (!benchmarkSymbol || symbol === benchmarkSymbol) {
                return { status: 'NEUTRAL', score: 0, mtf: {} };
            }

            const results = {};
            let totalOutperformance = 0;

            for (const tf of timeframes) {
                const assetCandles = multiCandles[tf];
                if (!assetCandles || assetCandles.length < 20) continue;

                // For simplicity, we fetch benchmark data for each timeframe
                const benchCandles = await marketData.fetchHistory(benchmarkSymbol, tf, 21);
                if (benchCandles.length < 20) continue;

                const assetChange = (assetCandles[assetCandles.length - 1].close - assetCandles[assetCandles.length - 20].close) / assetCandles[assetCandles.length - 20].close;
                const benchChange = (benchCandles[benchCandles.length - 1].close - benchCandles[benchCandles.length - 20].close) / benchCandles[benchCandles.length - 20].close;

                const outperformance = (assetChange - benchChange) * 100;

                // Advanced Risk Adjustment
                const beta = this.calculateBeta(assetCandles, benchCandles);
                const volatility = this.calculateVolatility(assetCandles);

                // Adjust score: Penalize high beta if market is down, reward alpha
                // Alpha approx = Asset Return - (Beta * Benchmark Return)
                const alpha = (assetChange * 100) - (beta * (benchChange * 100));

                results[tf] = {
                    outperformance: parseFloat(outperformance.toFixed(2)),
                    alpha: parseFloat(alpha.toFixed(2)),
                    beta: parseFloat(beta.toFixed(2)),
                    volatility: parseFloat(volatility.toFixed(4)),
                    status: alpha > 0.5 ? 'BULLISH' : alpha < -0.5 ? 'BEARISH' : 'NEUTRAL'
                };
                totalOutperformance += alpha; // Use Alpha instead of raw outperformance for final score
            }

            // Categorization Logic
            const tfCount = Object.keys(results).length;
            if (tfCount === 0) return { status: 'NEUTRAL', score: 0, mtf: {} };

            const h1 = results['1h']?.status;
            const h4 = results['4h']?.status;
            const d1 = results['1d']?.status;

            let status = 'NEUTRAL';
            if (h1 === 'BULLISH' && h4 === 'BULLISH' && d1 === 'BULLISH') status = 'LEADER';
            else if (h1 === 'BEARISH' && h4 === 'BEARISH' && d1 === 'BEARISH') status = 'LAGGARD';
            else if (h1 === 'BULLISH' && (h4 === 'BEARISH' || d1 === 'BEARISH')) status = 'RECOVERING';
            else if (h1 === 'BEARISH' && (h4 === 'BULLISH' || d1 === 'BULLISH')) status = 'FADING';

            const score = Math.round(Math.min(Math.max(totalOutperformance * 5, 0), 100)); // Adjusted scaling for Alpha

            return {
                status,
                score,
                mtf: results,
                benchmark: benchmarkSymbol,
                rationale: this.generateMTFRationale(status, results, benchmarkSymbol)
            };

        } catch (error) {
            console.error('MTF Relative Strength failed:', error);
            return { status: 'NEUTRAL', score: 0, mtf: {} };
        }
    }

    /**
     * Legacy support for single TF calculation
     */
    async calculateRelativeStrength(symbol, assetClass, candles, period = 20) {
        // Reuse internal logic or call it NEUTRAL if no benchmark
        const report = await this.calculateMTFRelativeStrength(symbol, assetClass, { '1h': candles });
        return {
            ...report,
            ratio: 1.0, // Legacy field
            outperformance: report.mtf['1h']?.outperformance || 0
        };
    }

    generateMTFRationale(status, results, benchmark) {
        const tfStrings = Object.entries(results).map(([tf, data]) => `${tf.toUpperCase()}: Alpha ${data.alpha}% (Beta ${data.beta})`);

        switch (status) {
            case 'LEADER':
                return `Strong institutional leadership vs ${benchmark}. Generating pure Alpha on all timeframes: ${tfStrings.join(', ')}.`;
            case 'LAGGARD':
                return `Significant relative weakness vs ${benchmark}. High Beta drag or negative Alpha: ${tfStrings.join(', ')}.`;
            case 'RECOVERING':
                return `Early stages of a strength rotation. Gaining Alpha on lower timeframes while risk is stabilizing.`;
            case 'FADING':
                return `Institutional support is waning. Losing Alpha on lower timeframes despite long-term correlation.`;
            default:
                return `Performance is currently neutral/mixed relative to ${benchmark}.`;
        }
    }

    calculateBeta(assetCandles, benchCandles) {
        // Simple Beta = Covariance(Asset, Bench) / Variance(Bench)
        // Using last 20 periods
        if (!assetCandles || !benchCandles || assetCandles.length < 2 || benchCandles.length < 2) {
            return 1; // Default to market beta if insufficient data
        }

        const len = Math.min(assetCandles.length, benchCandles.length, 20);
        const assetReturns = [];
        const benchReturns = [];

        for (let i = 1; i < len; i++) {
            if (assetCandles[i]?.close && assetCandles[i - 1]?.close &&
                benchCandles[i]?.close && benchCandles[i - 1]?.close) {
                assetReturns.push((assetCandles[i].close - assetCandles[i - 1].close) / assetCandles[i - 1].close);
                benchReturns.push((benchCandles[i].close - benchCandles[i - 1].close) / benchCandles[i - 1].close);
            }
        }

        if (assetReturns.length === 0) return 1;

        const avgAsset = assetReturns.reduce((a, b) => a + b, 0) / assetReturns.length;
        const avgBench = benchReturns.reduce((a, b) => a + b, 0) / benchReturns.length;

        let cov = 0;
        let varBench = 0;

        for (let i = 0; i < assetReturns.length; i++) {
            cov += (assetReturns[i] - avgAsset) * (benchReturns[i] - avgBench);
            varBench += Math.pow(benchReturns[i] - avgBench, 2);
        }

        return varBench === 0 ? 1 : (cov / varBench);
    }

    calculateVolatility(candles) {
        // StdDev of returns
        if (!candles || candles.length < 2) return 0;

        const returns = [];
        for (let i = 1; i < candles.length; i++) {
            if (candles[i]?.close && candles[i - 1]?.close) {
                returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
            }
        }

        if (returns.length === 0) return 0;

        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        return Math.sqrt(variance);
    }
}
