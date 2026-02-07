/**
 * Quantitative Analytics Utilities
 */

export const calculateSharpeRatio = (returns, riskFreeRate = 0) => {
    if (!returns || returns.length < 2) return 0;

    const n = returns.length;
    const mean = returns.reduce((a, b) => a + b, 0) / n;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;

    // Annualized Sharpe (assuming 1H candles, ~8760 per year)
    // For simplicity in this terminal, we use the raw sample Sharpe
    return (mean - riskFreeRate) / stdDev;
};

/**
 * Sortino Ratio: Measures risk-adjusted return relative to downside volatility only
 */
export const calculateSortinoRatio = (returns, targetReturn = 0) => {
    if (!returns || returns.length < 2) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const downsideReturns = returns.filter(r => r < targetReturn);

    if (downsideReturns.length < 1) return mean > 0 ? 10 : 0; // High ratio if no downside

    const sumSquaredDownside = downsideReturns.reduce((sum, r) => sum + Math.pow(r - targetReturn, 2), 0);
    const downsideDeviation = Math.sqrt(sumSquaredDownside / returns.length);

    if (downsideDeviation === 0) return 0;
    return (mean - targetReturn) / downsideDeviation;
};

export const calculateProfitFactor = (trades) => {
    let grossProfit = 0;
    let grossLoss = 0;

    trades.forEach(t => {
        if (t.pnl > 0) grossProfit += t.pnl;
        else grossLoss += Math.abs(t.pnl);
    });

    if (grossLoss === 0) return grossProfit > 0 ? 100 : 0; // Avoid division by zero
    return parseFloat((grossProfit / grossLoss).toFixed(2));
};

export const calculateDrawdown = (equityCurve) => {
    if (!equityCurve || equityCurve.length === 0) return { maxDrawdown: 0, currentDrawdown: 0 };

    let maxEquity = -Infinity;
    let maxDD = 0;
    let currentEquity = equityCurve[equityCurve.length - 1];

    equityCurve.forEach(p => {
        if (p > maxEquity) maxEquity = p;
        const dd = (maxEquity - p) / maxEquity;
        if (dd > maxDD) maxDD = dd;
    });

    const currentDD = (maxEquity - currentEquity) / maxEquity;

    return {
        maxDrawdown: parseFloat((maxDD * 100).toFixed(2)),
        currentDrawdown: parseFloat((currentDD * 100).toFixed(2)),
        recoveryFactor: maxDD > 0 ? parseFloat(((equityCurve[equityCurve.length - 1] - equityCurve[0]) / (maxEquity * maxDD)).toFixed(2)) : 0
    };
};

export const calculateWinRate = (trades) => {
    if (!trades || trades.length === 0) return 0;
    const wins = trades.filter(t => t.pnl > 0).length;
    return parseFloat(((wins / trades.length) * 100).toFixed(1));
};
