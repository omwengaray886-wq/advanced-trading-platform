/**
 * Basket Arbitrage Engine (Phase 7)
 * 
 * Identifies mean-reversion opportunities by comparing an asset's performance
 * against its correlated basket (e.g., USD majors, Crypto Top 5).
 */
export class BasketArbitrageEngine {
    constructor() {
        this.baskets = {
            'USD_MAJORS': ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCHF', 'USDCAD'],
            'CRYPTO_TOP_5': ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
            'BIG_TECH': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
        };
    }

    /**
     * Analyze symbol for basket divergence
     * @param {string} symbol - Primary symbol to analyze
     * @param {Map} marketPrices - Map of symbol -> { current, open24h }
     * @returns {Object|null} Divergence details
     */
    static calculateBasketDivergence(symbol, marketPrices) {
        const basketKey = this._findBasketForSymbol(symbol);
        if (!basketKey) return null;

        const basket = this.baskets[basketKey];
        const performances = [];

        basket.forEach(s => {
            const data = marketPrices.get(s);
            if (data && data.open24h) {
                const perf = (data.current - data.open24h) / data.open24h;
                // Inverse for USD-base pairs in USD_MAJORS if needed, 
                // but keep it simple: raw % change for now.
                performances.push(perf);
            }
        });

        if (performances.length < 3) return null;

        const basketMean = performances.reduce((a, b) => a + b, 0) / performances.length;
        const targetData = marketPrices.get(symbol);
        if (!targetData || !targetData.open24h) return null;

        const targetPerf = (targetData.current - targetData.open24h) / targetData.open24h;
        const divergence = targetPerf - basketMean;

        // Threshold: 0.5% divergence from basket mean
        const isDivergent = Math.abs(divergence) > 0.005;

        return {
            basket: basketKey,
            basketMean: basketMean * 100,
            symbolPerf: targetPerf * 100,
            divergence: divergence * 100,
            signal: divergence > 0 ? 'LEADER' : 'LAGGARD',
            confidence: Math.abs(divergence) > 0.01 ? 'HIGH' : 'MEDIUM',
            action: divergence > 0 ? 'MEAN_REVERSION_SHORT' : 'MEAN_REVERSION_LONG'
        };
    }

    static _findBasketForSymbol(symbol) {
        // Simple heuristic
        if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('SOL')) return 'CRYPTO_TOP_5';
        if (['EUR', 'GBP', 'AUD', 'NZD', 'JPY', 'CHF', 'CAD'].some(c => symbol.includes(c))) return 'USD_MAJORS';
        return null;
    }

    /**
     * Baskets definition
     */
    static get baskets() {
        return {
            'USD_MAJORS': ['EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDJPY', 'USDCHF', 'USDCAD'],
            'CRYPTO_TOP_5': ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'],
            'BIG_TECH': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
        };
    }
}
