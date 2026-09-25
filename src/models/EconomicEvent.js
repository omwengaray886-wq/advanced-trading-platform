/**
 * Economic Event Model
 * Represents macroeconomic events that impact markets
 */

export class EconomicEvent {
    constructor(data) {
        this.id = this.generateId();
        this.type = data.type; // INTEREST_RATE, CPI, NFP, GDP, etc.
        this.asset = data.asset; // USD, EUR, BTC, etc.
        this.timestamp = data.timestamp;
        this.impact = data.impact; // LOW, MEDIUM, HIGH
        this.bias = data.bias; // HAWKISH, DOVISH, RISK_ON, RISK_OFF, NEUTRAL
        this.volatilityExpected = data.volatilityExpected; // LOW, MEDIUM, HIGH
        this.actual = data.actual || null;
        this.forecast = data.forecast || null;
        this.previous = data.previous || null;
        this.status = data.status || 'PENDING'; // PENDING, RELEASED
        this.tier = data.tier || null; // TIER 1, TIER 2, TIER 3
        this.description = data.description || '';
    }

    generateId() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `EVT-${timestamp}-${random}`;
    }

    getProximity(currentTimeMs = Date.now()) {
        const eventTimeMs = this.timestamp > 1e11 ? this.timestamp : this.timestamp * 1000;
        return (eventTimeMs - currentTimeMs) / (1000 * 60 * 60);
    }

    /**
     * Check if event is upcoming (within next 48 hours)
     * @returns {boolean}
     */
    isUpcoming() {
        const proximity = this.getProximity();
        return proximity > 0 && proximity <= 48;
    }

    /**
     * Check if event just released (within last 4 hours)
     * @returns {boolean}
     */
    isJustReleased() {
        const proximity = this.getProximity();
        return proximity < 0 && proximity >= -4;
    }

    /**
     * Check if event is released
     */
    isReleased() {
        return this.status === 'RELEASED' || this.getProximity() <= 0;
    }

    /**
     * Check if event is imminent (within 1 hour)
     */
    isImminent() {
        const proximity = this.getProximity();
        return proximity > 0 && proximity <= 1;
    }

    /**
     * Get impact score (0-1)
     * @returns {number}
     */
    getImpactScore() {
        const impactScores = {
            'LOW': 0.3,
            'MEDIUM': 0.6,
            'HIGH': 1.0,
            'VERY_HIGH': 1.2 // Institutional grade weight
        };
        return impactScores[this.impact] || 0;
    }

    /**
     * Get directional bias for technical alignment
     * @returns {string} - BULLISH, BEARISH, NEUTRAL
     */
    getDirectionalBias() {
        const biasMap = {
            'HAWKISH': 'BULLISH', // For USD, other currencies BEARISH
            'DOVISH': 'BEARISH',  // For USD, other currencies BULLISH
            'RISK_ON': 'BULLISH', // For risk assets
            'RISK_OFF': 'BEARISH', // For risk assets
            'NEUTRAL': 'NEUTRAL'
        };
        return biasMap[this.bias] || 'NEUTRAL';
    }

    /**
     * Get event phase
     * @returns {string} - PRE_EVENT, RELEASE_WINDOW, POST_EVENT, NORMAL
     */
    getPhase() {
        const proximity = this.getProximity();

        if (proximity > 0 && proximity <= 24) return 'PRE_EVENT';
        if (proximity >= -2 && proximity <= 2) return 'RELEASE_WINDOW';
        if (proximity < 0 && proximity >= -24) return 'POST_EVENT';
        return 'NORMAL';
    }

    /**
     * Check if actual beat/missed forecast
     * @returns {string|null} - BEAT, MISS, INLINE, null if not released
     */
    getBeatMiss() {
        if (this.status !== 'RELEASED' || this.actual === null || this.forecast === null) {
            return null;
        }

        const threshold = 0.05; // 5% threshold for "inline"
        const diff = (this.actual - this.forecast) / this.forecast;

        if (Math.abs(diff) < threshold) return 'INLINE';

        // For most indicators, higher = hawkish/bullish
        return diff > 0 ? 'BEAT' : 'MISS';
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            asset: this.asset,
            timestamp: this.timestamp,
            impact: this.impact,
            bias: this.bias,
            volatilityExpected: this.volatilityExpected,
            actual: this.actual,
            forecast: this.forecast,
            previous: this.previous,
            status: this.status,
            tier: this.tier,
            tradingBias: this.getTradingBias(),
            description: this.description,
            phase: this.getPhase(),
            proximity: this.getProximity()
        };
    }

    /**
     * Determine trading bias based on Actual vs Forecast
     * @returns {string} - BULLISH, BEARISH, NEUTRAL
     */
    getTradingBias() {
        if (this.status !== 'RELEASED' || !this.actual || !this.forecast) {
            return 'NEUTRAL';
        }

        const beatMiss = this.getBeatMiss();
        if (beatMiss === 'INLINE' || !beatMiss) return 'NEUTRAL';

        const type = (this.type || '').toUpperCase();

        // 1. Indicators where HIGHER is BULLISH (Growth, Inflation, Employment)
        const positiveCorrelation = [
            'NFP', 'PAYROLL', 'GDP', 'CPI', 'PPI', 'RETAIL', 'PMI', 'SURVEY', 'CONFIDENCE'
        ];

        // 2. Indicators where HIGHER is BEARISH (Unemployment, Claims)
        const negativeCorrelation = [
            'UNEMPLOYMENT', 'CLAIMS', 'JOBLESS'
        ];

        const isPositiveType = positiveCorrelation.some(k => type.includes(k));
        const isNegativeType = negativeCorrelation.some(k => type.includes(k));

        if (isPositiveType) {
            return beatMiss === 'BEAT' ? 'BULLISH' : 'BEARISH';
        }

        if (isNegativeType) {
            // Higher unemployment is bad for currency (usually)
            return beatMiss === 'BEAT' ? 'BEARISH' : 'BULLISH';
        }

        // Default: If bias is already set (HAWKISH/DOVISH), use it
        if (this.bias === 'HAWKISH') return 'BULLISH';
        if (this.bias === 'DOVISH') return 'BEARISH';

        return 'NEUTRAL';
    }
}

/**
 * Event type constants
 */
export const EVENT_TYPES = {
    INTEREST_RATE: 'INTEREST_RATE_DECISION',
    CPI: 'CPI',
    PPI: 'PPI',
    NFP: 'NON_FARM_PAYROLLS',
    UNEMPLOYMENT: 'UNEMPLOYMENT_RATE',
    GDP: 'GDP',
    RETAIL_SALES: 'RETAIL_SALES',
    PMI: 'PMI',
    CENTRAL_BANK_SPEECH: 'CENTRAL_BANK_SPEECH',
    FOMC_MINUTES: 'FOMC_MINUTES',
    // Crypto-specific
    ETF_FLOW: 'ETF_FLOW',
    NETWORK_ACTIVITY: 'NETWORK_ACTIVITY',
    FUNDING_RATE: 'FUNDING_RATE'
};
// Tiers based on user requirements
export const IMPACT_TIERS = {
    TIER_1: 'MARKET_MOVER', // US CPI, NFP, FOMC, GDP
    TIER_2: 'HIGH_IMPACT',   // ECB, BOE, BOJ, Core CPI
    TIER_3: 'MODERATE',      // ADP, Confidence, Housing
    SPECIAL: 'SPECIAL'       // Geopolitical, Speeches
};
