/**
 * Alpha Tracker
 * 
 * Monitors the real-time performance of strategies and engines.
 * Logs trade outcomes (simulated or real) to calculate Win Rate, EV, and Reliability.
 * Feeding this data into AlphaLeakDetector allows the system to self-heal.
 */
export class AlphaTracker {
    constructor() {
        // In-memory log for the session. 
        // In production, this would sync with a database (Firestore/Postgres).
        this.tradeLog = [];
        this.engineStats = {};
    }

    /**
     * Log a trade outcome
     * @param {string} date - ISO timestamp
     * @param {string} strategyId - e.g., 'FVG_Reversal' or 'OrderBlock'
     * @param {string} result - 'WIN', 'LOSS', 'BE'
     * @param {number} rMultiple - Realized R-Multiple (e.g., +2.5 or -1.0)
     * @param {Object} context - Market regime data (e.g., 'TRENDING', 'CHOPPY')
     */
    logTrade(date, strategyId, result, rMultiple, context = {}) {
        const trade = {
            id: Date.now().toString(),
            date,
            strategyId,
            result,
            rMultiple,
            context
        };

        this.tradeLog.push(trade);
        this._updateStats(strategyId, trade);

        return trade;
    }

    /**
     * Get performance stats for a specific strategy/engine
     * @param {string} strategyId 
     */
    getStats(strategyId) {
        return this.engineStats[strategyId] || {
            wins: 0,
            losses: 0,
            winRate: 0,
            ev: 0,
            streak: 0,
            status: 'NEW' // NEW, PERFORMING, DEGRADING, FAILED
        };
    }

    /**
     * Get all stats (Alias for orchestrator compatibility)
     */
    getReliability() {
        return this.engineStats;
    }

    /**
     * Get all stats
     */
    getAllStats() {
        return this.engineStats;
    }

    /**
     * Update running statistics for an engine
     */
    _updateStats(id, trade) {
        if (!this.engineStats[id]) {
            this.engineStats[id] = {
                totalTrades: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                totalR: 0,
                ev: 0,
                streak: 0,
                status: 'NEW'
            };
        }

        const stats = this.engineStats[id];
        stats.totalTrades++;
        stats.totalR += trade.rMultiple;

        if (trade.result === 'WIN') {
            stats.wins++;
            stats.streak = stats.streak > 0 ? stats.streak + 1 : 1;
        } else if (trade.result === 'LOSS') {
            stats.losses++;
            stats.streak = stats.streak < 0 ? stats.streak - 1 : -1;
        }

        stats.winRate = stats.wins / stats.totalTrades;
        stats.ev = stats.totalR / stats.totalTrades;

        // Determine Status based on recent performance
        if (stats.totalTrades > 5) {
            if (stats.streak <= -3 || stats.winRate < 0.3) {
                stats.status = 'DEGRADING';
            } else if (stats.winRate > 0.5 && stats.ev > 0.5) {
                stats.status = 'PERFORMING';
            } else {
                stats.status = 'STABLE';
            }
        }
    }
}

// Singleton instance
export const alphaTracker = new AlphaTracker();
