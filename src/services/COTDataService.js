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

        // Simulate realistic positioning based on market regime
        const regime = marketState?.regime || 'RANGING';
        const trend = marketState?.currentTrend || 'NEUTRAL';

        // Commercial traders (smart money) typically fade extremes
        const commercials = this._simulateCommercialPositions(profile, regime, trend);

        // Non-commercial (speculators) follow trends
        const nonCommercials = this._simulateSpeculatorPositions(profile, regime, trend);

        // Retail (small traders) are usually wrong at extremes
        const retail = this._simulateRetailPositions(nonCommercials);

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
            weeklyChange: this._calculateWeeklyChange(commercials, nonCommercials)
        };
    }

    /**
     * Simulate commercial trader positions (smart money)
     */
    static _simulateCommercialPositions(profile, regime, trend) {
        // Commercials fade extremes and buy weakness, sell strength
        let netBias = 0;

        if (profile.commercialBias === 'LONG') netBias = 0.2;
        else if (profile.commercialBias === 'SHORT') netBias = -0.2;

        // In trending markets, commercials build counter-trend positions
        if (regime === 'TRENDING' && trend === 'BULLISH') netBias -= 0.15;
        if (regime === 'TRENDING' && trend === 'BEARISH') netBias += 0.15;

        const basePosition = 50000 + Math.random() * 10000;
        const netPosition = basePosition * netBias;

        return {
            long: Math.round(basePosition / 2 + netPosition / 2),
            short: Math.round(basePosition / 2 - netPosition / 2),
            netPosition: Math.round(netPosition),
            percentNet: parseFloat((netPosition / basePosition * 100).toFixed(1))
        };
    }

    /**
     * Simulate speculator positions (trend followers)
     */
    static _simulateSpeculatorPositions(profile, regime, trend) {
        // Speculators follow trends
        let netBias = 0;

        if (regime === 'TRENDING' && trend === 'BULLISH') netBias = 0.3;
        if (regime === 'TRENDING' && trend === 'BEARISH') netBias = -0.3;

        // Add volatility
        netBias += (Math.random() - 0.5) * profile.speculatorVolatility;

        const basePosition = 35000 + Math.random() * 8000;
        const netPosition = basePosition * netBias;

        return {
            long: Math.round(basePosition / 2 + netPosition / 2),
            short: Math.round(basePosition / 2 - netPosition / 2),
            netPosition: Math.round(netPosition),
            percentNet: parseFloat((netPosition / basePosition * 100).toFixed(1))
        };
    }

    /**
     * Simulate retail positions (usually wrong at extremes)
     */
    static _simulateRetailPositions(speculatorPositions) {
        // Retail tends to follow speculators but with lag and less conviction
        const basePosition = 18000 + Math.random() * 4000;
        const netPosition = speculatorPositions.netPosition * 0.6; // Follow but smaller

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

        if (divergence > 20) {
            // Strong divergence - contrarian setup
            if (commNet > 10 && retailSpecAvg < -10) {
                signal = 'CONTRARIAN_BULLISH';
                confidence = Math.min(0.9, 0.6 + divergence / 100);
                summary = `Smart money (commercials) net ${commNet.toFixed(1)}% long while retail/specs net ${retailSpecAvg.toFixed(1)}% short - Strong contrarian bullish signal`;
            } else if (commNet < -10 && retailSpecAvg > 10) {
                signal = 'CONTRARIAN_BEARISH';
                confidence = Math.min(0.9, 0.6 + divergence / 100);
                summary = `Smart money (commercials) net ${Math.abs(commNet).toFixed(1)}% short while retail/specs net ${retailSpecAvg.toFixed(1)}% long - Strong contrarian bearish signal`;
            }
        }
        // Consensus Signal: All groups positioned same way
        else if (Math.abs(commNet - specNet) < 10 && Math.abs(commNet) > 15) {
            if (commNet > 0) {
                signal = 'CONSENSUS_BULLISH';
                confidence = 0.7;
                summary = 'Broad consensus positioning - All groups net long';
            } else {
                signal = 'CONSENSUS_BEARISH';
                confidence = 0.7;
                summary = 'Broad consensus positioning - All groups net short';
            }
        }
        // Neutral
        else {
            signal = 'NEUTRAL';
            confidence = 0.5;
            summary = 'Mixed positioning - No clear COT signal';
        }

        return { signal, confidence, summary };
    }

    /**
     * Calculate week-over-week changes
     * (Simulated - in production would compare to previous report)
     */
    static _calculateWeeklyChange(commercials, nonCommercials) {
        // Simulate realistic weekly changes
        const commChange = (Math.random() - 0.5) * 5000;
        const specChange = (Math.random() - 0.5) * 4000;

        return {
            commercials: Math.round(commChange),
            nonCommercials: Math.round(specChange),
            trend: commChange > 1000 ? 'ACCUMULATING' : commChange < -1000 ? 'DISTRIBUTING' : 'STABLE'
        };
    }

    /**
     * Get COT alignment bonus for strategy scoring
     * @param {string} direction - LONG | SHORT
     * @param {Object} cotData - COT positioning data
     * @returns {number} Bonus points (0-15)
     */
    static getCOTAlignmentBonus(direction, cotData) {
        if (!cotData || cotData.interpretation === 'NEUTRAL') return 0;

        const isAligned =
            (direction === 'LONG' && (cotData.interpretation === 'CONTRARIAN_BULLISH' || cotData.interpretation === 'CONSENSUS_BULLISH')) ||
            (direction === 'SHORT' && (cotData.interpretation === 'CONTRARIAN_BEARISH' || cotData.interpretation === 'CONSENSUS_BEARISH'));

        if (!isAligned) return 0;

        // Contrarian signals get higher bonus
        const bonus = cotData.interpretation.includes('CONTRARIAN') ? 15 : 10;
        return Math.floor(bonus * cotData.confidence);
    }
}
