/**
 * Correlation Engine
 * Analyzes relationships between assets to determine macro bias.
 */
import { marketData } from './marketData.js';

export class CorrelationEngine {
    constructor() {
        // Pairs used to simulate DXY (US Dollar Index) if not directly available
        this.dxyProxies = ['EURUSD', 'PAXGUSDT', 'BTCUSDT'];
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
     * Phase 2: Check multi-asset correlation alignment
     * Validates prediction against sibling assets
     */
    /**
     * Phase 2: Check multi-asset correlation alignment
     * Validates prediction against sibling assets
     */
    async checkMultiAssetAlignment(symbol, predictedDirection, timeframe) {
        const correlationGroups = {
            'BTCUSDT': ['ETHUSDT', 'SOLUSDT', 'BNBUSDT'],
            'ETHUSDT': ['BTCUSDT', 'SOLUSDT', 'AVAXUSDT'],
            'EURUSD': ['PAXGUSDT', 'BTCUSDT'], // EUR vs Gold/BTC as macro siblings
            'XAUUSD': ['EURUSD', 'BTCUSDT']
        };

        const siblings = correlationGroups[symbol] || [];
        if (siblings.length === 0) {
            return { alignment: 0.5, recommendation: 'NEUTRAL', confidenceAdjustment: 1.0 };
        }

        let alignedCount = 0;
        let totalChecked = 0;
        const siblingDetails = {};

        for (const sibling of siblings) {
            try {
                const candles = await marketData.fetchHistory(sibling, timeframe, 20);
                if (!candles || candles.length < 10) continue;

                const trend = this.calculateTrendSlope(candles);
                const siblingDirection = trend > 0 ? 'BULLISH' : trend < 0 ? 'BEARISH' : 'NEUTRAL';

                totalChecked++;
                if (siblingDirection === predictedDirection) {
                    alignedCount++;
                }

                siblingDetails[sibling] = { direction: siblingDirection, strength: Math.abs(trend) };
            } catch (error) {
                console.warn(`[CorrelationEngine] Failed to fetch sibling ${sibling}:`, error);
            }
        }

        const alignmentScore = totalChecked > 0 ? alignedCount / totalChecked : 0.5;

        let confidenceAdjustment = 1.0;
        let recommendation = 'NEUTRAL';

        if (alignmentScore >= 0.75) {
            confidenceAdjustment = 1.15;
            recommendation = 'STRONG_CONFIRMATION';
        } else if (alignmentScore <= 0.3) {
            confidenceAdjustment = 0.85;
            recommendation = 'DIVERGENCE_ALERT';
        }

        return {
            alignment: alignmentScore,
            recommendation,
            confidenceAdjustment,
            details: siblingDetails
        };
    }

    /**
     * Calculate Correlation Strength between two assets
     */
    async calculateCorrelationStrength(symbolA, symbolB, timeframe = '4h') {
        try {
            const [dataA, dataB] = await Promise.all([
                marketData.fetchHistory(symbolA, timeframe, 50),
                marketData.fetchHistory(symbolB, timeframe, 50)
            ]);

            if (dataA.length < 20 || dataB.length < 20) return 0.5;

            // Pearson Correlation Coefficient calculation
            const returnsA = this.calculateReturns(dataA);
            const returnsB = this.calculateReturns(dataB);

            const minLen = Math.min(returnsA.length, returnsB.length);
            const sliceA = returnsA.slice(-minLen);
            const sliceB = returnsB.slice(-minLen);

            const meanA = sliceA.reduce((a, b) => a + b, 0) / minLen;
            const meanB = sliceB.reduce((a, b) => a + b, 0) / minLen;

            let num = 0;
            let denA = 0;
            let denB = 0;

            for (let i = 0; i < minLen; i++) {
                const diffA = sliceA[i] - meanA;
                const diffB = sliceB[i] - meanB;
                num += (diffA * diffB);
                denA += (diffA * diffA);
                denB += (diffB * diffB);
            }

            return num / Math.sqrt(denA * denB);
        } catch (error) {
            console.error('[CorrelationEngine] Strength calculation failed:', error);
            return 0.5;
        }
    }

    calculateReturns(candles) {
        const returns = [];
        for (let i = 1; i < candles.length; i++) {
            returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
        }
        return returns;
    }

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

    /**
     * Analyze Event Risk (Macro)
     * Checks for high-impact news events that could disrupt correlation or increase volatility.
     * @param {Object} newsService - Reference to news service
     */
    async analyzeEventRisk(newsService) {
        try {
            // Get upcoming high impact events for next 24h
            const shocks = await newsService.getUpcomingShocks(24);
            const highImpact = shocks.filter(s => s.impact === 'HIGH' || s.impact === 'CRITICAL');

            if (highImpact.length === 0) {
                return { score: 0, level: 'LOW', warning: null };
            }

            // Calculate Risk Score (0-100)
            // Closer event = Higher risk
            const now = Date.now();
            let maxRisk = 0;
            let closestEvent = null;

            highImpact.forEach(event => {
                const timeUntil = event.timestamp - now;
                const hoursUntil = timeUntil / (1000 * 60 * 60);

                let risk = 0;
                if (hoursUntil < 1) risk = 100; // Imminent
                else if (hoursUntil < 4) risk = 80;
                else if (hoursUntil < 12) risk = 50;
                else risk = 20;

                if (risk > maxRisk) {
                    maxRisk = risk;
                    closestEvent = event;
                }
            });

            return {
                score: maxRisk,
                level: maxRisk > 75 ? 'CRITICAL' : maxRisk > 40 ? 'HIGH' : 'MODERATE',
                warning: closestEvent ? `Upcoming ${closestEvent.title} in ${(closestEvent.timestamp - now) / 3600000 | 0}h` : null,
                closestEvent
            };

        } catch (error) {
            console.error('Event risk analysis failed:', error);
            return { score: 0, level: 'UNKNOWN', warning: null };
        }
    }
}

export const correlationEngine = new CorrelationEngine();
