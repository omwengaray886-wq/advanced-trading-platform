import { PredictionTracker } from './predictionTracker';

export class UserPerformanceService {
    constructor() {
        // No longer generating mock trades by default in production
    }

    /**
     * Get user's real trade history (Audit Receipts)
     */
    async getTradeHistory(limit = 50, symbol = null) {
        try {
            // In Phase 52, we leverage the PredictionTracker's stats retrieval 
            // but extend it for the full history view.
            const stats = await PredictionTracker.getStats(symbol || 'BTC_USDT');
            // Note: In a real system, we'd fetch the raw docs from PredictionTracker here.
            // For the demo/integration, we'll bridge the tracker.
            return stats ? stats.recentHistory || [] : [];
        } catch (e) {
            console.error('[PerformanceService] Error fetching history:', e);
            return [];
        }
    }

    /**
     * Calculate User Metrics
     */
    async getUserMetrics(symbol = 'BTC_USDT', source = 'SIMULATED') {
        // Source can be 'LIVE' or 'SIMULATED' (default)
        if (source === 'LIVE') {
            const { exchangeService } = await import('./exchangeService');
            // Fetch real trades
            const trades = await exchangeService.getTradeHistory(symbol);

            // Calculate real metrics
            const totalTrades = trades.length;
            const wins = trades.filter(t => parseFloat(t.realizedPnl) > 0).length;
            const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';

            const totalPnl = trades.reduce((acc, t) => acc + parseFloat(t.realizedPnl), 0);
            const equityCurve = trades.reduce((acc, t) => {
                const prev = acc.length > 0 ? acc[acc.length - 1] : 0;
                acc.push(prev + parseFloat(t.realizedPnl));
                return acc;
            }, [0]); // Relative equity curve from 0

            return {
                totalTrades,
                winRate,
                profitFactor: 'N/A', // Hard to calc without full risk data
                totalReturn: totalPnl.toFixed(2),
                sharpe: 'N/A',
                maxDrawdown: 'N/A',
                finalBalance: totalPnl,
                equityCurve: equityCurve,
                edgeAttribution: { premium: 0, strong: 0, tradable: 0 },
                byStrategy: [],
                byMarket: [{ name: symbol, setups: totalTrades }]
            };
        }

        const stats = await PredictionTracker.getStats(symbol);

        if (!stats || stats.total === 0) {
            return {
                totalTrades: 0,
                winRate: '0.0',
                profitFactor: '0.00',
                totalReturn: '0.00',
                sharpe: 0,
                maxDrawdown: 0,
                sortino: 0,
                recoveryFactor: 0,
                finalBalance: 10000,
                equityCurve: [10000],
                edgeAttribution: { premium: 0, strong: 0, tradable: 0 },
                byMarket: []
            };
        }

        // Combined real stats from PredictionTracker
        return {
            totalTrades: stats.total,
            winRate: stats.accuracy?.toFixed(1) || '0.0',
            profitFactor: stats.profitFactor?.toFixed(2) || '1.00',
            totalReturn: stats.totalReturn?.toFixed(2) || '0.00',
            sharpe: stats.sharpe || 0,
            maxDrawdown: stats.maxDrawdown || 0,
            finalBalance: 10000 + (stats.totalReturn || 0),
            equityCurve: stats.equityCurve || [10000],
            edgeAttribution: stats.edgeAttribution || { premium: 0, strong: 0, tradable: 0 },
            byStrategy: stats.byStrategy || [],
            byMarket: stats.byMarket || []
        };
    }
}

export const userPerformanceService = new UserPerformanceService();
