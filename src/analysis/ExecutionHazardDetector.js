/**
 * Execution Hazard Detector
 * Identifies high-risk execution environments for institutional-grade trading
 */
export class ExecutionHazardDetector {
    /**
     * Detect execution hazards based on current market state
     * @param {Array} candles - Recent candlestick data
     * @param {Object} marketState - Current market analysis
     * @param {Object} assetParams - Asset-specific parameters
     * @returns {Array} - List of detected hazards
     */
    static detectHazards(candles, marketState, assetParams) {
        const hazards = [];
        const lastCandle = candles[candles.length - 1];
        const atr = marketState.atr || this.calculateATR(candles);

        // 1. High Spread Hazard (Low Liquidity / Session Rollover)
        const hour = new Date(lastCandle.time * 1000).getUTCHours();
        const isSessionTransition = (hour === 21 || hour === 22 || hour === 0); // 5PM - 7PM EST typically

        if (isSessionTransition && assetParams.sessionBased) {
            hazards.push({
                type: 'HIGH_SPREAD_RISK',
                severity: 'HIGH',
                message: 'Low liquidity during session rollover may result in significantly wider spreads.'
            });
        }

        // 2. Slippage Hazard (High Volatility / Momentum)
        const recentReturns = candles.slice(-5).map(c => Math.abs(c.close - c.open) / c.open);
        const avgReturn = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;

        if (avgReturn > assetParams.volatilityThreshold * 1.5) {
            hazards.push({
                type: 'SLIPPAGE_HAZARD',
                severity: 'MEDIUM',
                message: 'Extreme momentum detected. Market orders may experience significant slippage.'
            });
        }

        // 3. Volatility Compression (Breakout Trap Risk)
        const range = Math.max(...candles.slice(-10).map(c => c.high)) - Math.min(...candles.slice(-10).map(c => c.low));
        if (range < atr * 0.5) {
            hazards.push({
                type: 'VOLATILITY_COMPRESSION',
                severity: 'LOW',
                message: 'Market is in tight compression. Watch for fakeouts and stop hunts before expansion.'
            });
        }

        // 4. Institutional Climax (Reversal Risk)
        if (marketState.volumeAnalysis?.subType === 'CLIMAX') {
            hazards.push({
                type: 'EXECUTION_CLIMAX',
                severity: 'MEDIUM',
                message: 'Volume climax detected. Entry here carries high risk of immediate mean reversion.'
            });
        }

        // 5. News Shock Hazard (Phase 39)
        const activeShock = marketState.activeShock;
        if (activeShock) {
            hazards.push({
                type: 'NEWS_SHOCK_RISK',
                severity: activeShock.severity,
                message: activeShock.message,
                event: activeShock.event
            });
        }

        return hazards;
    }

    /**
     * Helper to calculate ATR if not provided
     */
    static calculateATR(candles, period = 14) {
        if (candles.length < period + 1) return 0;
        let trSum = 0;
        for (let i = candles.length - period; i < candles.length; i++) {
            const h = candles[i].high;
            const l = candles[i].low;
            const pc = candles[i - 1].close;
            const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
            trSum += tr;
        }
        return trSum / period;
    }
}
