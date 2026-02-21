
/**
 * GeopoliticalEvent Model
 * Represents a significant geopolitical event (War, Sanctions, Election)
 * capable of causing systemic market shock.
 */
export class GeopoliticalEvent {
    /**
     * @param {string} title - Headline
     * @param {string} type - 'WAR', 'SANCTIONS', 'UNREST', 'ELECTION', 'TERRORISM'
     * @param {string} severity - 'HIGH', 'MEDIUM', 'LOW'
     * @param {string} region - 'GLOBAL', 'MIDDLE_EAST', 'EUROPE', 'ASIA', 'US'
     */
    constructor(title, type, severity, region = 'GLOBAL') {
        this.title = title;
        this.type = type;
        this.severity = severity;
        this.region = region;
        this.timestamp = Date.now();
        this.impactDuration = this._estimateDuration(type, severity);
    }

    _estimateDuration(type, severity) {
        // High severity wars/sanctions have long-lasting impact (days/weeks)
        if (severity === 'HIGH' && ['WAR', 'SANCTIONS'].includes(type)) {
            return 72 * 60 * 60 * 1000; // 72 hours initial shock window
        }
        return 24 * 60 * 60 * 1000; // Default 24h
    }

    /**
     * Get the 'Flight to Safety' impact on an asset class
     * @param {string} assetClass - 'CRYPTO', 'FOREX', 'COMMODITY', 'EQUITY'
     * @param {string} symbol - specific symbol for granular checks
     * @returns {number} - Impact multiplier (positive = boost, negative = penalty)
     */
    getImpact(assetClass, symbol) {
        if (this.severity !== 'HIGH') return 0;

        // Safe Havens get a BOOST
        if (symbol === 'XAUUSDT' || symbol === 'PAXGUSDT' || symbol === 'GOLD') return 0.4; // +40% suitability (Gold)
        if (symbol === 'DXY' || symbol === 'USDC' || symbol === 'USDT') return 0.2; // +20% suitability (Cash/Dollar)

        // Risk Assets get a PENALTY
        if (assetClass === 'CRYPTO') return -0.4; // -40% suitability (Crypto is risk-on)
        if (assetClass === 'EQUITY') return -0.3; // -30% suitability

        return 0;
    }
}
