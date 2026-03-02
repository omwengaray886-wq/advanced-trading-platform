/**
 * COT Data Service (Commitment of Traders)
 * Analyzes institutional vs retail positioning for contrarian signals
 * 
 * Based on CFTC reports - currently simulated with realistic logic
 * Structure allows easy swap to real CFTC API integration later
 */

export class COTDataService {
    /**
     * COT positioning patterns based on asset characteristics
     * In production, this would fetch from CFTC API
     */
    static positioningProfiles = {
        // Forex Majors
        'EURUSD': { commercialBias: 'NEUTRAL', speculatorVolatility: 0.3 },
        'GBPUSD': { commercialBias: 'SHORT', speculatorVolatility: 0.4 },
        'USDJPY': { commercialBias: 'LONG', speculatorVolatility: 0.25 },

        // Commodities
        'XAUUSD': { commercialBias: 'SHORT', speculatorVolatility: 0.5 }, // Gold
        'BTCUSD': { commercialBias: 'NEUTRAL', speculatorVolatility: 0.7 },

        // Default
        'DEFAULT': { commercialBias: 'NEUTRAL', speculatorVolatility: 0.3 }
    };

    /**
     * Get COT positioning for an asset
     * @param {string} symbol - Trading pair
     * @param {Object} marketState - Current market context
     * @returns {Object} COT analysis
     */
    static getPositioning(symbol, marketState) {
        const profile = this.positioningProfiles[symbol] || this.positioningProfiles['DEFAULT'];

        // Deterministic positioning based on market regime and state
        const regime = marketState?.regime || 'RANGING';
        const trend = marketState?.currentTrend || 'NEUTRAL';
        const rsi = marketState?.indicators?.rsi ? marketState.indicators.rsi[marketState.indicators.rsi.length - 1] : 50;

        // Commercial traders (smart money) typically fade extremes
        const commercials = this._deriveCommercialPositions(profile, regime, trend, rsi);

        // Non-commercial (speculators) follow trends
        const nonCommercials = this._deriveSpeculatorPositions(profile, regime, trend, rsi);

        // Retail (small traders) are usually wrong at extremes
        const retail = this._deriveRetailPositions(nonCommercials, rsi);

        // Interpret positioning
        const interpretation = this._interpretPositioning(commercials, nonCommercials, retail);

        return {
            symbol,
            timestamp: Date.now(),
            commercials, // Hedgers, producers (smart money)
            nonCommercials, // Large speculators (funds, institutions)
            retail, // Small traders (usually contrarian indicator)
            interpretation: interpretation.signal,
            confidence: interpretation.confidence,
            summary: interpretation.summary,
            weeklyChange: this._calculateWeeklyChange(symbol, commercials, nonCommercials)
        };
    }

    /**
     * Derive commercial trader positions (smart money)
     */
    static _deriveCommercialPositions(profile, regime, trend, rsi) {
        // Commercials fade extremes and buy weakness, sell strength
        let netBias = 0;

        if (profile.commercialBias === 'LONG') netBias = 0.2;
        else if (profile.commercialBias === 'SHORT') netBias = -0.2;

        // Counter-trend positioning at extremes (RSI > 70 or RSI < 30)
        if (rsi > 70) netBias -= 0.25;
        if (rsi < 30) netBias += 0.25;

        // In trending markets, commercials build counter-trend positions
        if (regime === 'TRENDING' && trend === 'BULLISH') netBias -= 0.15;
        if (regime === 'TRENDING' && trend === 'BEARISH') netBias += 0.15;

        // Deterministic base based on symbol length/char codes to avoid Math.random()
        const basePosition = 55000 + (profile.commercialBias.length * 100);
        const netPosition = basePosition * netBias;

        return {
            long: Math.round(basePosition / 2 + netPosition / 2),
            short: Math.round(basePosition / 2 - netPosition / 2),
            netPosition: Math.round(netPosition),
            percentNet: parseFloat((netPosition / basePosition * 100).toFixed(1))
        };
    }

    /**
     * Derive speculator positions (trend followers)
     */
    static _deriveSpeculatorPositions(profile, regime, trend, rsi) {
        // Speculators follow trends
        let netBias = 0;

        if (regime === 'TRENDING' && trend === 'BULLISH') netBias = 0.3;
        if (regime === 'TRENDING' && trend === 'BEARISH') netBias = -0.3;

        // Speculators hit extremes harder
        if (rsi > 65) netBias += 0.1;
        if (rsi < 35) netBias -= 0.1;

        const basePosition = 38000 + (regime.length * 500);
        const netPosition = basePosition * netBias;

        return {
            long: Math.round(basePosition / 2 + netPosition / 2),
            short: Math.round(basePosition / 2 - netPosition / 2),
            netPosition: Math.round(netPosition),
            percentNet: parseFloat((netPosition / basePosition * 100).toFixed(1))
        };
    }

    /**
     * Derive retail positions (usually follow specs but pinned to extremes)
     */
    static _deriveRetailPositions(speculatorPositions, rsi) {
        const basePosition = 20000;
        let retailBias = speculatorPositions.percentNet / 100;

        // Retail gets extremely "caught" at RSI extremes
        if (rsi > 75) retailBias = 0.5; // Max long at top
        if (rsi < 25) retailBias = -0.5; // Max short at bottom

        const netPosition = basePosition * retailBias;

        return {
            long: Math.round(basePosition / 2 + netPosition / 2),
            short: Math.round(basePosition / 2 - netPosition / 2),
            netPosition: Math.round(netPosition),
            percentNet: parseFloat((netPosition / basePosition * 100).toFixed(1))
        };
    }

    /**
     * Interpret COT positioning for trading signals
     */
    static _interpretPositioning(commercials, nonCommercials, retail) {
        const commNet = commercials.percentNet;
        const specNet = nonCommercials.percentNet;
        const retailNet = retail.percentNet;

        let signal = 'NEUTRAL';
        let confidence = 0.5;
        let summary = '';

        // Contrarian Signal: When retail and speculators are heavily positioned one way,
        // and commercials are positioned the opposite way
        const retailSpecAvg = (specNet + retailNet) / 2;
        const divergence = Math.abs(commNet - retailSpecAvg);

        if (divergence > 15) {
            // Strong divergence - contrarian setup
            if (commNet > 5 && retailSpecAvg < -5) {
                signal = 'CONTRARIAN_BULLISH';
                confidence = Math.min(0.95, 0.65 + divergence / 100);
                summary = `Institutional Smart Money (Commercials) net ${commNet.toFixed(1)}% long while Specs/Retail are net ${retailSpecAvg.toFixed(1)}% short.`;
            } else if (commNet < -5 && retailSpecAvg > 5) {
                signal = 'CONTRARIAN_BEARISH';
                confidence = Math.min(0.95, 0.65 + divergence / 100);
                summary = `Institutional Smart Money (Commercials) net ${Math.abs(commNet).toFixed(1)}% short while Specs/Retail are net ${retailSpecAvg.toFixed(1)}% long.`;
            }
        }
        // Consensus Signal
        else if (Math.abs(commNet - specNet) < 8 && Math.abs(commNet) > 12) {
            if (commNet > 0) {
                signal = 'CONSENSUS_BULLISH';
                confidence = 0.75;
                summary = 'Broad market consensus detected - All major buckets net long.';
            } else {
                signal = 'CONSENSUS_BEARISH';
                confidence = 0.75;
                summary = 'Broad market consensus detected - All major buckets net short.';
            }
        }
        else {
            signal = 'NEUTRAL';
            confidence = 0.55;
            summary = 'Mixed institutional positioning. No clear COT divergence.';
        }

        return { signal, confidence, summary };
    }

    /**
     * Calculate week-over-week changes (Deterministic based on symbol)
     */
    static _calculateWeeklyChange(symbol, commercials, nonCommercials) {
        // Use symbol hash to create a stable "weekly" change that doesn't jump randomly
        const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const commChange = (hash % 5000) - 2500;
        const specChange = (hash % 4000) - 2000;

        return {
            commercials: Math.round(commChange),
            nonCommercials: Math.round(specChange),
            trend: commChange > 500 ? 'ACCUMULATING' : commChange < -500 ? 'DISTRIBUTING' : 'STABLE'
        };
    }

    /**
     * Get COT alignment bonus for strategy scoring
     */
    static getCOTAlignmentBonus(direction, cotData) {
        if (!cotData || cotData.interpretation === 'NEUTRAL') return 0;

        const isAligned =
            (direction === 'LONG' && (cotData.interpretation === 'CONTRARIAN_BULLISH' || cotData.interpretation === 'CONSENSUS_BULLISH')) ||
            (direction === 'SHORT' && (cotData.interpretation === 'CONTRARIAN_BEARISH' || cotData.interpretation === 'CONSENSUS_BEARISH'));

        if (!isAligned) return 0;

        const bonus = cotData.interpretation.includes('CONTRARIAN') ? 15 : 10;
        return Math.floor(bonus * cotData.confidence);
    }
}
