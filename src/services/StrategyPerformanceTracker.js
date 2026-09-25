/**
 * Strategy Performance Tracker
 * 
 * Tracks real-time performance of strategies (Win/Loss, Streaks).
 * Calculates dynamic weights to boost winning strategies and penalize losing ones.
 */

class StrategyPerformanceTracker {
    constructor() {
        this.stats = new Map();
        this.isBrowser = typeof window !== 'undefined';
        this.persistenceKey = 'strategy_performance_stats';

        if (!this.isBrowser) {
            // Lazy load Node-only modules
            this.persistenceFile = 'data/strategy_performance.json';
        }

        this.loadStats();
    }

    /**
     * Load stats from storage/disk
     */
    async loadStats() {
        try {
            if (this.isBrowser) {
                const data = localStorage.getItem(this.persistenceKey);
                if (data) {
                    const json = JSON.parse(data);
                    for (const [key, value] of Object.entries(json)) {
                        this.stats.set(key, value);
                    }
                }
            } else {
                const fs = await import('fs');
                const path = await import('path');
                const fullPath = path.join(process.cwd(), this.persistenceFile);
                if (fs.existsSync(fullPath)) {
                    const data = fs.readFileSync(fullPath, 'utf8');
                    const json = JSON.parse(data);
                    for (const [key, value] of Object.entries(json)) {
                        this.stats.set(key, value);
                    }
                }
            }
        } catch (error) {
            console.warn('[PerformanceTracker] Failed to load stats:', error.message);
        }
    }

    /**
     * Save stats to storage/disk
     */
    async saveStats() {
        try {
            const data = {};
            for (const [key, value] of this.stats.entries()) {
                data[key] = value;
            }

            if (this.isBrowser) {
                localStorage.setItem(this.persistenceKey, JSON.stringify(data));
            } else {
                const fs = await import('fs');
                const path = await import('path');
                const fullPath = path.join(process.cwd(), this.persistenceFile);
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
            }
        } catch (error) {
            console.error('[PerformanceTracker] Failed to save stats:', error.message);
        }
    }

    /**
     * Get dynamic weights for all strategies (Phase 15 Upgrade)
     */
    static async getAllStrategyWeights(regime) {
        const tracker = strategyPerformanceTracker;
        const weights = {};

        // List of core strategies we want to track
        const strategies = [
            'Institutional Continuation',
            'Liquidity Hunter',
            'Market Maker Reversal',
            'Fair Value Gap',
            'Structure Break & Retest',
            'Order Flow Imbalance'
        ];

        strategies.forEach(name => {
            weights[name] = {
                multiplier: tracker.getDynamicWeight(name),
                winRate: tracker._initStats(name).winRate,
                streak: tracker._initStats(name).streak
            };
        });

        return weights;
    }

    /**
     * Get specific strategy performance
     */
    static async getStrategyPerformance(strategyName, regime) {
        const tracker = strategyPerformanceTracker; // Use singleton
        const stats = tracker._initStats(strategyName);
        return {
            winRate: stats.winRate,
            profitFactor: 1.5, // Placeholder
            trades: stats.recentResults.length,
            streak: stats.streak
        };
    }

    /**
     * Initialize stats for a strategy if not exists
     */
    _initStats(strategyId) {
        if (!this.stats.has(strategyId)) {
            this.stats.set(strategyId, {
                wins: 0,
                losses: 0,
                streak: 0,
                winRate: 0.5,
                recentResults: [],
                lastUpdated: Date.now()
            });
        }
        return this.stats.get(strategyId);
    }

    /**
     * Update performance with new trade result
     * @param {string} strategyId 
     * @param {boolean} isWin 
     */
    updatePerformance(strategyId, isWin) {
        const stats = this._initStats(strategyId);

        if (isWin) {
            stats.wins++;
            // If streak was negative, reset to 1, else increment
            stats.streak = stats.streak >= 0 ? stats.streak + 1 : 1;
        } else {
            stats.losses++;
            // If streak was positive, reset to -1, else decrement
            stats.streak = stats.streak <= 0 ? stats.streak - 1 : -1;
        }

        stats.recentResults.push(isWin ? 1 : 0);
        if (stats.recentResults.length > 20) stats.recentResults.shift();

        const recentWins = stats.recentResults.filter(r => r === 1).length;
        stats.winRate = recentWins / stats.recentResults.length;
        stats.lastUpdated = Date.now();

        this.saveStats();
        console.log(`[Performance] ${strategyId}: Streak=${stats.streak}, WR=${(stats.winRate * 100).toFixed(0)}%`);
    }

    /**
     * Calculate dynamic multiplier based on recent performance
     * Range: 0.5 (Cold) to 1.5 (Hot)
     */
    getDynamicWeight(strategyId) {
        const stats = this._initStats(strategyId);
        let multiplier = 1.0;

        // 1. Streak Impact
        if (stats.streak >= 3) multiplier += 0.2;       // Hot hand
        if (stats.streak <= -2) multiplier -= 0.2;      // Cold hand (quicker penalty)

        // 2. Win Rate Impact (Last 20 trades)
        if (stats.recentResults.length >= 5) {
            if (stats.winRate >= 0.7) multiplier += 0.1;
            if (stats.winRate <= 0.3) multiplier -= 0.2;
        }

        // 3. Cap Logic
        return Math.min(Math.max(multiplier, 0.5), 1.5);
    }
}

export const strategyPerformanceTracker = new StrategyPerformanceTracker();
export { StrategyPerformanceTracker };
