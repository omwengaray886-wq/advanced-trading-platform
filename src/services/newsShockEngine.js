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
        const upcoming = await newsService.getUpcomingShocks(72);

        if (!Array.isArray(upcoming)) return null;

        const relevant = upcoming.filter(e => e.asset === currency || e.asset === 'USD');

        for (const event of relevant) {
            const phase = event.getPhase();
            const proximity = event.getProximity();

            // Critical window: 30 mins before, 1 hour after or imminent
            // For GEOPOLITICAL events, the window is much larger (24h)
            const isGeo = event.category === 'GEOPOLITICAL';
            const shockWindow = isGeo ? 24 : 0.5; // 24 hours for war/terror, 0.5h for data

            if (event.isImminent() || (proximity <= shockWindow && proximity >= -2)) {
                return {
                    event: event.type,
                    impact: event.impact,
                    category: isGeo ? 'GEOPOLITICAL' : 'ECONOMIC',
                    phase: phase,
                    proximity: proximity,
                    severity: (event.isImminent() || proximity <= (isGeo ? 12 : 0.25)) ? 'HIGH' : 'MEDIUM',
                    message: !event.isReleased() ?
                        `${event.type} in ${Math.round(proximity * 60)} mins` :
                        `${event.type} Active (High Risk)`
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

        // GEOPOLITICAL "Flight to Safety" Logic
        if (shock.category === 'GEOPOLITICAL' && shock.severity === 'HIGH') {
            const assetClass = this.detectAssetClass(symbol);

            // Safe Havens: Gold, USD => BOOST (Negative penalty)
            if (['XAU', 'PAXG', 'GOLD'].some(s => symbol.includes(s))) return -0.4; // Boost suitability
            if (['USD', 'USDC', 'DXY'].some(s => symbol.includes(s)) && !symbol.includes('BTC') && !symbol.includes('ETH')) return -0.2;

            // Risk Assets: Crypto, Stocks => PENALTY
            if (assetClass === 'CRYPTO' || assetClass === 'EQUITY') return 0.6; // 60% penalty for risk assets during war

            return 0.3; // Default anxiety penalty
        }

        // Standard Economic Shock Logic
        if (shock.severity === 'HIGH') return 0.5; // 50% drop
        if (shock.severity === 'MEDIUM') return 0.2; // 20% drop

        return 0;
    }

    /**
     * Detect asset class from symbol
     */
    detectAssetClass(symbol) {
        if (['BTC', 'ETH', 'SOL', 'BNB', 'XRP'].some(c => symbol.includes(c))) return 'CRYPTO';
        if (['EUR', 'GBP', 'JPY', 'AUD', 'CAD'].some(c => symbol.includes(c))) return 'FOREX';
        if (['SPX', 'NDX', 'US30', 'AAPL', 'TSLA'].some(c => symbol.includes(c))) return 'EQUITY';
        if (['XAU', 'XAG', 'OIL', 'GOLD'].some(c => symbol.includes(c))) return 'COMMODITY';
        return 'UNKNOWN';
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
