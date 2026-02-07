import { AnalysisOrchestrator } from './analysisOrchestrator';
import { marketData } from './marketData';
import { calculateSharpeRatio, calculateProfitFactor, calculateDrawdown, calculateWinRate } from './analyticsUtils';

export class BacktestService {
    constructor() {
        this.orchestrator = new AnalysisOrchestrator();
    }

    /**
     * Run a backtest for a specific symbol and strategy
     * @param {string} symbol - e.g., 'BTCUSDT'
     * @param {string} timeframe - e.g., '1H'
     * @param {number} candlesLimit - Length of history to test
     * @param {Object} overrides - Optimization parameters { slMultiplier, tpMultiplier, strategyFilter }
     */
    async runBacktest(symbol, timeframe = '1H', candlesLimit = 500, overrides = {}) {
        console.log(`Starting backtest for ${symbol} with overrides:`, overrides);

        // 1. Fetch full history
        const allCandles = await marketData.fetchHistory(symbol, timeframe, candlesLimit);
        if (!allCandles || allCandles.length < 100) return null;

        const trades = [];
        const equityCurve = [10000]; // Starting balance
        let currentBalance = 10000;
        const returns = [];

        // 2. Sliding window analysis
        const alphaAttribution = {
            fvg: { wins: 0, total: 0 },
            smt: { wins: 0, total: 0 },
            sweep: { wins: 0, total: 0 },
            news: { wins: 0, total: 0 },
            ote: { wins: 0, total: 0 }
        };

        for (let i = 50; i < allCandles.length - 10; i++) {
            const lookbackCandles = allCandles.slice(0, i + 1);
            const analysis = await this.orchestrator.analyze(lookbackCandles, symbol, timeframe);
            const setup = analysis.setups.find(s => s.quantScore > 75);

            if (setup && !this.isAlreadyInTrade(trades, allCandles[i].time)) {
                // Apply Strategy Filters
                if (overrides.strategyFilter && !setup.strategy.includes(overrides.strategyFilter)) {
                    // Skip if looking for specific strategy
                    continue;
                }

                const trade = this.simulateTrade(setup, allCandles.slice(i + 1), overrides);
                if (trade) {
                    // Track Alpha Attribution
                    const factors = {
                        fvg: !!analysis.marketState.relevantGap,
                        smt: !!analysis.marketState.smtDivergence,
                        sweep: !!analysis.marketState.liquiditySweep,
                        news: analysis.marketState.news_risk === 'LOW',
                        ote: !!analysis.annotations.find(a => a.type === 'FIBONACCI')
                    };

                    trades.push({ ...trade, factors });
                    currentBalance += trade.pnl;
                    equityCurve.push(currentBalance);
                    returns.push(trade.pnlPercent);

                    // Update Attribution Stats
                    Object.keys(factors).forEach(f => {
                        if (factors[f]) {
                            alphaAttribution[f].total++;
                            if (trade.outcome === 'TP') alphaAttribution[f].wins++;
                        }
                    });

                    i += 5;
                }
            }
        }

        // 3. Calculate Final Metrics
        const winRate = calculateWinRate(trades);
        const profitFactor = calculateProfitFactor(trades);
        const sharpe = calculateSharpeRatio(returns);
        const drawdown = calculateDrawdown(equityCurve);

        // Calculate Attribution Percentages
        const attributionResults = Object.keys(alphaAttribution).map(key => ({
            factor: key.toUpperCase(),
            winRate: alphaAttribution[key].total > 0
                ? Math.round((alphaAttribution[key].wins / alphaAttribution[key].total) * 100)
                : 0,
            impact: alphaAttribution[key].total
        }));

        return {
            symbol,
            timeframe,
            trades,
            equityCurve,
            alphaAttribution: attributionResults,
            stats: {
                totalTrades: trades.length,
                winRate,
                profitFactor,
                sharpe,
                maxDrawdown: drawdown.maxDrawdown,
                finalBalance: currentBalance,
                totalReturn: ((currentBalance - 10000) / 10000 * 100).toFixed(2)
            }
        };
    }

    /**
     * Simulate a trade outcome searching through future candles
     */
    simulateTrade(setup, futureCandles, overrides = {}) {
        let entry = setup.entryZone.optimal;
        let sl = setup.stopLoss;
        let tp = setup.targets[0].price; // Test TP1 for baseline metrics

        // Apply Optimization Overrides
        const direction = setup.direction;

        if (overrides.slMultiplier && sl) {
            const riskDist = Math.abs(entry - sl);
            const newRiskDist = riskDist * overrides.slMultiplier;
            sl = direction === 'LONG' ? entry - newRiskDist : entry + newRiskDist;
        }

        if (overrides.tpMultiplier && tp) {
            const rewardDist = Math.abs(tp - entry);
            // If tpMultiplier is effectively R:R override (e.g. 2.0 = 2R), recalculate based on risk
            // Or if it's just stretching the existing target distance.
            // Let's assume it stretches the existing target distance for now.
            const newRewardDist = rewardDist * overrides.tpMultiplier;
            tp = direction === 'LONG' ? entry + newRewardDist : entry - newRewardDist;
        }

        // Force minimum R:R check if optimizing? 
        // For now, raw simulation.

        for (let j = 0; j < Math.min(futureCandles.length, 48); j++) { // Max 48 candle hold
            const candle = futureCandles[j];

            if (direction === 'LONG') {
                if (candle.low <= sl) return { pnl: -100, pnlPercent: -0.01, outcome: 'SL', time: candle.time }; // 1% risk per trade assumed
                if (candle.high >= tp) {
                    const rr = (Math.abs(tp - entry) / Math.abs(entry - sl)) || 2;
                    return { pnl: 100 * rr, pnlPercent: 0.01 * rr, outcome: 'TP', time: candle.time };
                }
            } else {
                if (candle.high >= sl) return { pnl: -100, pnlPercent: -0.01, outcome: 'SL', time: candle.time };
                if (candle.low <= tp) {
                    const rr = (Math.abs(tp - entry) / Math.abs(entry - sl)) || 2;
                    return { pnl: 100 * rr, pnlPercent: 0.01 * rr, outcome: 'TP', time: candle.time };
                }
            }
        }

        return null; // Trade timed out or didn't hit levels
    }

    isAlreadyInTrade(trades, currentTime) {
        // Simple logic: don't take a new trade if the last one was within 5 candles
        if (trades.length === 0) return false;
        const lastTrade = trades[trades.length - 1];
        return (currentTime - lastTrade.time) < (3600 * 5);
    }
}

export const backtestService = new BacktestService();
