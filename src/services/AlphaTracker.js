/**
 * Alpha Tracker (Phase 8)
 * 
 * Quantifies the performance of each analytical engine by correlating 
 * signal presence with trade outcomes.
 */
export class AlphaTracker {
    constructor() {
        this.history = []; // Array of attributed trade results
    }

    trackHistory(attribution) {
        if (!attribution) return;
        this.history.push(attribution);
        if (this.history.length > 100) this.history.shift(); // Keep last 100 attribution points
    }

    getReliability() {
        return AlphaTracker.calculateReliability(this.history);
    }

    /**
     * Attribute a trade result to active analytical engines
     * @param {Object} trade - { symbol, strategy, result (PnL), marketState }
     */
    static attributeTrade(trade) {
        if (!trade.marketState) return null;

        const ms = trade.marketState;
        const attribution = {
            id: Date.now(),
            symbol: trade.symbol,
            pnl: trade.pnl,
            outcome: trade.pnl > 0 ? 'WIN' : 'LOSS',
            activeEngines: []
        };

        // 1. Tag Classic Context Engines
        if (ms.macroSentiment?.bias) attribution.activeEngines.push('SENTIMENT');
        if (ms.darkPools?.length > 0) attribution.activeEngines.push('DARK_POOL');
        if (ms.orderBookDepth?.pressure !== 'NEUTRAL') attribution.activeEngines.push('ORDER_BOOK');
        if (ms.volatility?.regime) attribution.activeEngines.push('VOLATILITY');
        if (ms.smtDivergence) attribution.activeEngines.push('SMT');
        if (ms.relevantGap) attribution.activeEngines.push('FVG');
        if (ms.liquiditySweep) attribution.activeEngines.push('LIQUIDITY_SWEEP');

        // 2. Tag Phase 7 Institutional & Scalping Engines
        if (ms.obligations?.primaryObligation) attribution.activeEngines.push('MARKET_OBLIGATION');
        if (ms.amdCycle?.phase) attribution.activeEngines.push('AMD_CYCLE');
        if (ms.roadmap?.scenarios?.length > 0) attribution.activeEngines.push('PATH_PROJECTION');
        if (ms.basketArbitrage?.divergence !== 0) attribution.activeEngines.push('BASKET_ARBITRAGE');
        if (ms.domStats?.isLive && ms.orderBookDepth?.imbalance !== 0) attribution.activeEngines.push('LIVE_DOM');
        if (ms.clusters?.length > 0) attribution.activeEngines.push('CORRELATION_CLUSTER');

        return attribution;
    }

    /**
     * Calculate Reliability Scores for all engines
     * @param {Array} attributedHistory - List of results from attributeTrade
     * @returns {Object} { engineId: { winRate, impactScore, sampleSize } }
     */
    static calculateReliability(attributedHistory) {
        if (!attributedHistory || attributedHistory.length === 0) return {};

        const stats = {};
        const engines = [
            'SENTIMENT', 'DARK_POOL', 'ORDER_BOOK', 'VOLATILITY',
            'SMT', 'FVG', 'LIQUIDITY_SWEEP',
            'MARKET_OBLIGATION', 'AMD_CYCLE', 'PATH_PROJECTION',
            'BASKET_ARBITRAGE', 'LIVE_DOM', 'CORRELATION_CLUSTER'
        ];

        engines.forEach(engine => {
            const engineTrades = attributedHistory.filter(t => t.activeEngines.includes(engine));
            if (engineTrades.length === 0) return;

            const wins = engineTrades.filter(t => t.outcome === 'WIN').length;
            const winRate = wins / engineTrades.length;

            // Impact Score = WinRate * log10(SampleSize + 1) - normalized
            const impactScore = winRate * (1 + Math.log10(engineTrades.length));

            stats[engine] = {
                winRate: parseFloat((winRate * 100).toFixed(1)),
                sampleSize: engineTrades.length,
                impactScore: parseFloat(impactScore.toFixed(2)),
                status: winRate >= 0.7 ? 'INSTITUTIONAL' : winRate > 0.55 ? 'HIGH_ALPHA' : winRate > 0.4 ? 'STABLE' : 'DEGRADING'
            };
        });

        return stats;
    }

    /**
     * Identify "Alpha Decay" in specific engines
     */
    static detectDecay(stats) {
        return Object.entries(stats)
            .filter(([_, data]) => data.status === 'DEGRADING' && data.sampleSize > 5)
            .map(([engine]) => engine);
    }
}

export const alphaTracker = new AlphaTracker();
