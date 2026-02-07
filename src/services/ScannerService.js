import { marketData } from './marketData';
import { AnalysisOrchestrator } from './analysisOrchestrator';

/**
 * Scanner Service
 * Batch processes multiple symbols to find high-probability setups
 */
class ScannerService {
    constructor() {
        this.orchestrator = new AnalysisOrchestrator();
        this.symbols = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XAU/USD', 'EUR/USD', 'GBP/USD', 'SPX/USD', 'DXY'];
        this.results = new Map();
        this.isScanning = false;
    }

    /**
     * Run a full market scan
     */
    async scanAll(onProgress = null) {
        if (this.isScanning) return Array.from(this.results.values());

        this.isScanning = true;
        const scanResults = [];

        for (let i = 0; i < this.symbols.length; i++) {
            const rawSymbol = this.symbols[i];
            const symbol = rawSymbol.replace('/', '');

            try {
                // 1. Fetch data
                const candles = await marketData.fetchHistory(symbol, '1h', 200);

                // 2. Analyze (Using Orchestrator)
                // We pass a 'light' flag if we want to skip heavy scenario generation
                const analysis = await this.orchestrator.analyze(candles, rawSymbol, '1h', null, null, true);

                const result = {
                    symbol: rawSymbol,
                    price: candles[candles.length - 1].close,
                    trend: analysis.marketState.trend.direction,
                    strength: analysis.marketState.trend.strength,
                    structure: analysis.marketState.regime,
                    confidence: analysis.overallConfidence,
                    hasSetup: analysis.setups.length > 0,
                    hasDivergence: (analysis.divergences || []).length > 0,
                    divergences: analysis.divergences || [],
                    primarySetup: analysis.setups[0] || null,
                    timestamp: Date.now()
                };

                this.results.set(rawSymbol, result);
                scanResults.push(result);

                if (onProgress) {
                    onProgress((i + 1) / this.symbols.length, result);
                }

                // Stagger to prevent UI blocking
                await new Promise(r => setTimeout(r, 50));
            } catch (err) {
                console.error(`Scanner failed for ${rawSymbol}:`, err);
            }
        }

        this.isScanning = false;
        return scanResults;
    }

    /**
     * Calculate global market bias
     */
    getGlobalBias() {
        if (this.results.size === 0) return { bias: 'NEUTRAL', bullPercentage: 50 };

        const results = Array.from(this.results.values());
        const bullish = results.filter(r => r.trend === 'BULLISH').length;
        const total = results.length;
        const bullPercentage = Math.round((bullish / total) * 100);

        let bias = 'NEUTRAL';
        if (bullPercentage > 65) bias = 'BULLISH';
        else if (bullPercentage < 35) bias = 'BEARISH';

        return { bias, bullPercentage };
    }

    /**
     * Get the most high-conviction setups
     */
    getTopSetups(limit = 3) {
        return Array.from(this.results.values())
            .filter(r => r.hasSetup)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, limit);
    }
}

export const scannerService = new ScannerService();
