/**
 * Alpha Leak Detector
 * 
 * Identifies regime-specific failure patterns where analytical engines 
 * consistently provide "false alpha" (high confidence signals that fail).
 */
export class AlphaLeakDetector {
    /**
     * Identify potential alpha leaks based on current regime and historical reliability
     * @param {string} regime - Current market regime (e.g., VOLATILE_SIDEWAYS)
     * @param {Object} reliabilityStats - Current reliability stats from AlphaTracker
     * @returns {Array} List of leaked engine IDs with warnings
     */
    static detectLeaks(regime, reliabilityStats) {
        const leaks = [];

        // Define historical "Hazard Regimes" per engine
        const hazardMap = {
            'FVG': ['VOLATILE_SIDEWAYS', 'CHOPPY'],
            'SMT': ['BLOWOFF_TOP', 'CLIMACTIC'],
            'ORDER_BOOK': ['NEWS_DRIVEN', 'HIGH_VOLATILITY'],
            'AMD_CYCLE': ['LOW_VOLATILITY_EXPANSION'],
            'MARKET_OBLIGATION': ['PARABOLIC_TREND']
        };

        Object.entries(reliabilityStats).forEach(([engine, stats]) => {
            const hazards = hazardMap[engine] || [];

            // If engine is in a known hazard regime and reliability is dropping
            if (hazards.includes(regime) && stats.status === 'DEGRADING') {
                leaks.push({
                    engine,
                    severity: 'HIGH',
                    warning: `⚠️ Alpha Leak: ${engine} reliability significantly degraded in ${regime} regimes.`
                });
            } else if (hazards.includes(regime)) {
                leaks.push({
                    engine,
                    severity: 'MEDIUM',
                    warning: `Caution: ${engine} historically shows lower alpha in ${regime} conditions.`
                });
            }
        });

        return leaks;
    }
}
