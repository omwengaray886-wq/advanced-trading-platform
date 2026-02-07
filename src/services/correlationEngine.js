/**
 * Correlation Engine
 * Analyzes relationships between assets to determine macro bias.
 */
import { marketData } from './marketData.js';

export class CorrelationEngine {
    constructor() {
        // Pairs used to simulate DXY (US Dollar Index) if not directly available
        this.dxyProxies = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'];
        this.cryptoBenchmarks = ['BTCUSDT', 'ETHUSDT'];
    }

    /**
     * Get Correlation Bias for a symbol
     * @param {string} symbol - Current symbol
     * @param {string} assetClass - FOREX, CRYPTO, METALS
     * @returns {Promise<Object>} - Correlation bias report
     */
    async getCorrelationBias(symbol, assetClass) {
        try {
            const cleanSymbol = symbol.replace('/', '').toUpperCase();

            if (assetClass === 'CRYPTO') {
                return await this.analyzeCryptoCorrelation(cleanSymbol);
            } else if (assetClass === 'FOREX' || assetClass === 'METALS') {
                return await this.analyzeForexCorrelation(cleanSymbol);
            }

            return { score: 0, bias: 'NEUTRAL', rationale: 'No correlation analysis for this asset class.' };
        } catch (error) {
            console.error('Correlation analysis failed:', error);
            return { score: 0, bias: 'NEUTRAL', rationale: 'Correlation engine error.' };
        }
    }

    /**
     * Analyze Crypto Correlations (Beta to BTC)
     */
    async analyzeCryptoCorrelation(symbol) {
        if (symbol === 'BTCUSDT') {
            return { score: 1.0, bias: 'SELF', rationale: 'Primary benchmark.' };
        }

        const btcData = await marketData.fetchHistory('BTCUSDT', '4h', 20);
        if (!btcData.length) return { score: 0, bias: 'NEUTRAL', rationale: 'BTC data unavailable.' };

        const btcTrend = this.calculateTrendSlope(btcData);

        let bias = 'NEUTRAL';
        let score = 0;
        let rationale = '';

        if (btcTrend > 0.001) {
            bias = 'BULLISH';
            score = 0.8;
            rationale = 'Strong positive correlation with BTC bullish momentum.';
        } else if (btcTrend < -0.001) {
            bias = 'BEARISH';
            score = 0.8;
            rationale = 'Market-wide bearish pressure from BTC downtrend.';
        } else {
            rationale = 'BTC is ranging; altcoins may move independently.';
        }

        return { score, bias, rationale };
    }

    /**
     * Analyze Forex/Metals Correlation (Relationship to USD)
     */
    async analyzeForexCorrelation(symbol) {
        // Simplified DXY logic: EUR/USD is roughly 57% of DXY and is inversely correlated.
        const eurusdData = await marketData.fetchHistory('EURUSDT', '4h', 20);
        if (!eurusdData.length) return { score: 0, bias: 'NEUTRAL', rationale: 'USD benchmark data unavailable.' };

        const usdStrength = -this.calculateTrendSlope(eurusdData); // Inverse of EUR/USD

        const isUsdQuote = symbol.endsWith('USD') || symbol.endsWith('USDT');
        const isUsdBase = symbol.startsWith('USD');

        let bias = 'NEUTRAL';
        let score = 0;
        let rationale = '';

        if (usdStrength > 0.0005) {
            if (isUsdQuote) { bias = 'BEARISH'; score = 0.75; rationale = 'USD Strength exerting bearish pressure on quote pairs.'; }
            if (isUsdBase) { bias = 'BULLISH'; score = 0.75; rationale = 'USD Strength driving base pair bullishness.'; }
        } else if (usdStrength < -0.0005) {
            if (isUsdQuote) { bias = 'BULLISH'; score = 0.75; rationale = 'USD Weakness supporting bullish moves in quote pairs.'; }
            if (isUsdBase) { bias = 'BEARISH'; score = 0.75; rationale = 'USD Weakness weighing on base pair.'; }
        }

        return { score, bias, rationale };
    }

    /**
     * Detect SMT Divergence between sibling assets
     */
    /**
     * @deprecated - Moved to DivergenceEngine.js
     */
    async detectSMTDivergence(symbol, candles) {
        return null;
    }

    calculateTrendSlope(candles) {
        if (candles.length < 10) return 0;
        const prices = candles.map(c => c.close);
        const first = prices[0];
        const last = prices[prices.length - 1];
        return (last - first) / first;
    }
}

export const correlationEngine = new CorrelationEngine();
