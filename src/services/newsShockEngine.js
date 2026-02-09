import { newsService } from './newsService.js';
import { EconomicEvent } from '../models/EconomicEvent.js';

/**
 * News Shock Engine (Phase 39)
 * Manages the intersection of economic events and execution safety.
 */
class NewsShockEngine {
    /**
     * Get the active news shock status for a symbol
     * @param {string} symbol - e.g., 'BTC/USDT'
     * @returns {Promise<Object|null>} - Active shock info or null
     */
    async getActiveShock(symbol) {
        const currency = this.getRelevantCurrency(symbol);
        const upcoming = await newsService.getUpcomingShocks(24);

        if (!Array.isArray(upcoming)) return null;

        const relevant = upcoming.filter(e => e.asset === currency || e.asset === 'USD');

        for (const event of relevant) {
            const phase = event.getPhase();
            const proximity = event.getProximity(); // in hours

            // Critical window: 30 mins before, 1 hour after
            if (proximity <= 0.5 && proximity >= -1) {
                return {
                    event: event.type,
                    impact: event.impact,
                    phase: phase,
                    proximity: proximity,
                    severity: proximity <= 0.25 ? 'HIGH' : 'MEDIUM',
                    message: proximity > 0 ?
                        `${event.type} in ${Math.round(proximity * 60)} mins` :
                        `${event.type} Released (High Volatility)`
                };
            }
        }

        return null;
    }

    /**
     * Calculate news-based suitability penalty
     */
    async calculateSuitabilityPenalty(symbol, setupDirection) {
        const shock = await this.getActiveShock(symbol);
        if (!shock) return 0;

        // If high impact news is immmintent, penalize heavily
        if (shock.severity === 'HIGH') return 0.5; // 50% drop
        if (shock.severity === 'MEDIUM') return 0.2; // 20% drop

        return 0;
    }

    /**
     * Helper to extract currency from symbol
     */
    getRelevantCurrency(symbol) {
        if (symbol.includes('/')) return symbol.split('/')[0];
        if (symbol.startsWith('BTC')) return 'BTC';
        if (symbol.startsWith('ETH')) return 'ETH';
        return 'USD';
    }
}

export const newsShockEngine = new NewsShockEngine();
