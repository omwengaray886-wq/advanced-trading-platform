/**
 * Lead-Lag Engine (Phase 6)
 * 
 * Detects time-shifted correlations between assets.
 * Example: Does DXY (Dollar) moves 5 minutes *before* BTC?
 * 
 * Usage:
 * const lead = LeadLagEngine.analyze(btcCandles, dxyCandles);
 * if (lead.leader === 'DXY' && lead.lag === 5) ...
 */

export class LeadLagEngine {

    /**
     * Analyze Lead-Lag relationship between two assets
     * @param {Array} targetCandles - The asset we want to trade (e.g. BTC)
     * @param {Array} indicatorCandles - The potential leading indicator (e.g. DXY)
     * @param {number} maxLag - Max periods to look back (default 10)
     */
    static analyze(targetCandles, indicatorCandles, maxLag = 10) {
        if (!targetCandles || !indicatorCandles || targetCandles.length < 50 || indicatorCandles.length < 50) {
            return null;
        }

        // Align data by time (Map for O(1) lookup)
        const targetMap = new Map(targetCandles.map(c => [c.time, c.close]));
        const indicatorMap = new Map(indicatorCandles.map(c => [c.time, c.close]));

        // Find common timestamps
        const timestamps = targetCandles.map(c => c.time).filter(t => indicatorMap.has(t));
        if (timestamps.length < 50) return null;

        const targetSeries = timestamps.map(t => targetMap.get(t));
        const indicatorSeries = timestamps.map(t => indicatorMap.get(t));

        // Calculate correlation at different lags
        // Lag > 0: Indicator leads Target (Indicator[t-lag] predicts Target[t])
        let maxCorr = -1;
        let bestLag = 0;
        let correlationType = 'NONE'; // POSITIVE or NEGATIVE

        for (let lag = 1; lag <= maxLag; lag++) {
            const corr = this._pearsonCorrelation(targetSeries, indicatorSeries, lag);
            const absCorr = Math.abs(corr);

            if (absCorr > maxCorr) {
                maxCorr = absCorr;
                bestLag = lag;
                correlationType = corr > 0 ? 'POSITIVE' : 'NEGATIVE';
            }
        }

        // Filter weak correlations
        if (maxCorr < 0.3) {
            return {
                detected: false,
                reason: 'No significant correlation found'
            };
        }

        return {
            detected: true,
            leader: 'INDICATOR', // The 2nd arg passed is the 'Leader' candidate
            lag: bestLag,
            correlation: maxCorr,
            type: correlationType,
            implication: this._generateSignal(correlationType, indicatorCandles, bestLag)
        };
    }

    /**
     * Generate a predictive signal based on the leader's recent move
     */
    static _generateSignal(type, indicatorCandles, lag) {
        // Look at what the leader did 'lag' periods ago
        // If Lag=5, we look at the move from t-6 to t-5? 
        // No, if Leader[t-5] predicts Target[t], we need to know what Leader is doing RIGHT NOW
        // to predict what Target will do in 5 periods. 
        // Actually: Correlation(Target_t, Leader_t-L) means Leader happened L periods ago.

        // Wait, "Leading Indicator" means DXY[t] correlates with BTC[t+5].
        // So we look at DXY's *current* move to predict BTC's *future* move.

        // Get recent momentum of leader
        const recent = indicatorCandles.slice(-3);
        const change = (recent[recent.length - 1].close - recent[0].close) / recent[0].close;

        if (Math.abs(change) < 0.0005) return 'NEUTRAL'; // Too small

        if (type === 'NEGATIVE') {
            // Inverse correlation (DXY Up -> BTC Down)
            return change > 0 ? 'BEARISH' : 'BULLISH';
        } else {
            // Positive correlation (SPX Up -> BTC Up)
            return change > 0 ? 'BULLISH' : 'BEARISH';
        }
    }

    /**
     * Calculate Pearson Correlation with time shift
     * @param {Array} y - Target series
     * @param {Array} x - Indicator series
     * @param {number} lag - Shift x by 'lag' periods
     */
    static _pearsonCorrelation(y, x, lag) {
        // x leads y by 'lag'. So we compare y[i] with x[i - lag]
        // Range: i from lag to length-1

        const n = y.length - lag;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (let i = lag; i < y.length; i++) {
            const valY = y[i];
            const valX = x[i - lag]; // The value 'lag' periods ago

            sumX += valX;
            sumY += valY;
            sumXY += valX * valY;
            sumX2 += valX * valX;
            sumY2 += valY * valY;
        }

        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

        if (denominator === 0) return 0;
        return numerator / denominator;
    }
}
