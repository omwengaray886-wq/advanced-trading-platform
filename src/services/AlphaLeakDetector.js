import { alphaTracker } from './AlphaTracker.js';

/**
 * Alpha Leak Detector
 * 
 * Identifies regime-specific failure patterns where analytical engines 
 * consistently provide "false alpha" (high confidence signals that fail).
 */
export class AlphaLeakDetector {
    /**
     * Identify potential alpha leaks based on current regime and real-time reliability
     * @param {string} regime - Current market regime (e.g., VOLATILE_SIDEWAYS)
     * @param {Object} stats - Optional pre-fetched stats
     * @returns {Array} List of leaked engine IDs with warnings
     */
    static detectLeaks(regime, stats = null) {
        const leaks = [];
        const realTimeStats = stats || alphaTracker.getAllStats();

        // Define historical "Hazard Regimes" per engine (Static Knowledge)
        const hazardMap = {
            'FVG': ['VOLATILE_SIDEWAYS', 'CHOPPY'],
            'SMT': ['BLOWOFF_TOP', 'CLIMACTIC'],
            'ORDER_BOOK': ['NEWS_DRIVEN', 'HIGH_VOLATILITY'],
            'AMD_CYCLE': ['LOW_VOLATILITY_EXPANSION'], // Don't use cycle logic during breakout
            'MARKET_OBLIGATION': ['PARABOLIC_TREND']
        };

        // 1. Check Real-Time Performance Degradation
        Object.entries(realTimeStats).forEach(([engine, stats]) => {
            if (stats.status === 'DEGRADING' || stats.status === 'FAILED') {
                leaks.push({
                    engine,
                    severity: 'HIGH',
                    warning: `⚠️ CRITICAL LEAK: ${engine} is actively failing (Win Rate: ${(stats.winRate * 100).toFixed(1)}%). disabling.`
                });
            }
        });

        // 2. Check Static Regime Hazards
        Object.keys(hazardMap).forEach(engine => {
            const hazards = hazardMap[engine];
            if (hazards.includes(regime)) {
                // If it's a known hazard, we warn even if stats are okay (precautionary)
                leaks.push({
                    engine,
                    severity: 'MEDIUM',
                    warning: `Caution: ${engine} historically underperforms in ${regime} conditions.`
                });
            }
        });

        return leaks;
    }
}

