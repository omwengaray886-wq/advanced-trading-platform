/**
 * Asset Class Adapter
 * Adjusts analysis parameters and strategies based on asset type
 */

export class AssetClassAdapter {
    /**
     * Detect asset class from symbol
     * @param {string} symbol - Trading pair
     * @returns {string} - FOREX, CRYPTO, STOCKS, INDICES
     */
    static detectAssetClass(symbol) {
        // Crypto patterns
        if (symbol.match(/BTC|ETH|SOL|ADA|XRP|DOGE|MATIC|LINK|DOT|AVAX|BNB/i)) {
            return 'CRYPTO';
        }

        // Forex patterns (major pairs and common base/quote currencies)
        if (symbol.match(/EUR|GBP|USD|JPY|CHF|AUD|NZD|CAD/)) {
            return 'FOREX';
        }

        // Indices
        if (symbol.match(/SPX|NDX|DJI|DAX|FTSE|US30|NAS100/i)) {
            return 'INDICES';
        }

        // Metals
        if (symbol.match(/XAU|XAG|GOLD|SILVER|PAXG/i)) {
            return 'METALS';
        }

        // Default to stocks
        return 'STOCKS';
    }

    /**
     * Get asset-specific parameters
     * @param {string} assetClass - Asset class type
     * @param {string} timeframe - Current chart timeframe (e.g., '5m', '1H', '1d')
     * @returns {Object} - Asset-specific parameters
     */
    static getAssetParameters(assetClass, timeframe = '1H') {
        const isScalping = timeframe === '5m' || timeframe === '15m' || timeframe === '5M';
        const scalingFactor = isScalping ? 0.6 : 1.0; // Scale sensitivity for scalping

        const params = {
            FOREX: {
                swingLookback: Math.max(3, Math.round(5 * scalingFactor)),
                volatilityThreshold: 0.015,
                minStructureMove: 0.002 * scalingFactor, // Reduced from 0.005 for better intraday sensitivity
                stopLossMultiplier: 1.5, // Tighter stops for Forex
                sessionBased: true,
                killzonesActive: true,
                fundamentalsWeight: isScalping ? 0.3 : 0.7,
                liquidityFocus: 'HIGH',
                spreadConsideration: true,
                sessionTimings: {
                    asian: { start: 0, end: 9 },
                    london: { start: 8, end: 16 },
                    newYork: { start: 13, end: 22 }
                }
            },
            CRYPTO: {
                swingLookback: Math.max(2, Math.round(3 * scalingFactor)),
                volatilityThreshold: 0.030,
                minStructureMove: 0.015 * scalingFactor,
                stopLossMultiplier: 2.5, // Wider stops for Crypto volatility
                sessionBased: false,
                killzonesActive: false,
                fundamentalsWeight: isScalping ? 0.1 : 0.4,
                liquidityFocus: 'MEDIUM',
                spreadConsideration: isScalping,
                fundingRateRelevant: true,
                onChainMetrics: !isScalping,
                narrativeDriven: true
            },
            INDICES: {
                swingLookback: Math.max(4, Math.round(7 * scalingFactor)),
                volatilityThreshold: 0.010,
                minStructureMove: 0.003 * scalingFactor,
                stopLossMultiplier: 2.0,
                sessionBased: true,
                killzonesActive: false,
                fundamentalsWeight: isScalping ? 0.4 : 0.8,
                liquidityFocus: 'VERY_HIGH',
                spreadConsideration: false
            },
            STOCKS: {
                swingLookback: Math.max(3, Math.round(5 * scalingFactor)),
                volatilityThreshold: 0.020,
                minStructureMove: 0.008 * scalingFactor,
                stopLossMultiplier: 2.2,
                sessionBased: true,
                killzonesActive: false,
                fundamentalsWeight: isScalping ? 0.5 : 0.9,
                liquidityFocus: 'MEDIUM',
                spreadConsideration: true
            },
            METALS: {
                swingLookback: Math.max(2, Math.round(4 * scalingFactor)),
                volatilityThreshold: 0.012,
                minStructureMove: 0.004 * scalingFactor,
                stopLossMultiplier: 2.0,
                sessionBased: true,
                killzonesActive: true,
                fundamentalsWeight: isScalping ? 0.4 : 0.8,
                liquidityFocus: 'HIGH',
                spreadConsideration: true
            }
        };

        return params[assetClass] || params.FOREX;
    }

    /**
     * Adapt strategy suitability scores for asset class
     * @param {string} strategyName - Strategy name
     * @param {string} assetClass - Asset class
     * @param {number} baseSuitability - Base suitability score
     * @returns {number} - Adjusted suitability
     */
    static adaptStrategySuitability(strategyName, assetClass, baseSuitability) {
        const adjustments = {
            FOREX: {
                'Liquidity Sweep': 1.2,        // Very common in forex
                'Order Block': 1.1,            // Institutional heavy
                'Fair Value Gap': 1.1,         // ICT concepts work well
                'Range Trading': 1.0,
                'Trend Continuation': 1.0,
                'Structure Break & Retest': 1.0
            },
            CRYPTO: {
                'Liquidity Sweep': 1.3,        // Extremely common (stop hunts)
                'Fair Value Gap': 1.2,         // Gaps fill frequently
                'Range Trading': 0.8,          // Less reliable ranges
                'Order Block': 0.9,            // Less institutional
                'Trend Continuation': 1.1,     // Strong trends in crypto
                'Structure Break & Retest': 1.0
            },
            INDICES: {
                'Trend Continuation': 1.2,     // Strong trending
                'Range Trading': 0.7,          // Less ranging
                'Liquidity Sweep': 0.9,
                'Order Block': 1.0,
                'Fair Value Gap': 1.0,
                'Structure Break & Retest': 1.1
            }
        };

        const multiplier = adjustments[assetClass]?.[strategyName] || 1.0;
        return Math.min(baseSuitability * multiplier, 1.0); // Cap at 1.0
    }

    /**
     * Get asset-specific risk parameters
     * @param {string} assetClass - Asset class
     * @returns {Object} - Risk parameters
     */
    static getRiskParameters(assetClass) {
        return {
            FOREX: {
                defaultRiskReward: [2.0, 3.0],
                maxRiskPercent: 1.0,
                partialProfitLevels: [1.5, 2.5],
                trailingStopActivation: 1.5
            },
            CRYPTO: {
                defaultRiskReward: [2.5, 4.0],  // Higher R:R for volatility
                maxRiskPercent: 2.0,            // Higher risk tolerance
                partialProfitLevels: [2.0, 3.5],
                trailingStopActivation: 2.0
            },
            INDICES: {
                defaultRiskReward: [1.5, 2.5],
                maxRiskPercent: 0.5,
                partialProfitLevels: [1.0, 2.0],
                trailingStopActivation: 1.0
            },
            STOCKS: {
                defaultRiskReward: [2.0, 3.0],
                maxRiskPercent: 1.5,
                partialProfitLevels: [1.5, 2.5],
                trailingStopActivation: 1.5
            }
        }[assetClass];
    }

    /**
     * Get asset-specific explanation context
     * @param {string} assetClass - Asset class
     * @returns {string} - Contextual explanation prefix
     */
    static getExplanationContext(assetClass) {
        return {
            FOREX: 'In the forex market, institutional flows and central bank policy drive price action. ',
            CRYPTO: 'In the crypto market, 24/7 trading and high volatility create unique opportunities. ',
            INDICES: 'In the indices market, broad macroeconomic factors dominate price movement. ',
            STOCKS: 'In the equities market, company fundamentals and sector rotation drive trends. '
        }[assetClass] || '';
    }

    /**
     * Get the current trading session for a given time
     * @param {number} timestamp - Unix timestamp in seconds
     * @returns {string|null} - ASIAN, LONDON, NEW_YORK or null
     */
    static getCurrentSession(timestamp) {
        const date = new Date(timestamp * 1000);
        const hour = date.getUTCHours();

        // Asian: 00:00 - 09:00 UTC
        if (hour >= 0 && hour < 9) return 'ASIAN';

        // London: 08:00 - 16:00 UTC (overlap with Asian and NY)
        if (hour >= 8 && hour < 16) return 'LONDON';

        // New York: 13:00 - 22:00 UTC (overlap with London)
        if (hour >= 13 && hour < 22) return 'NEW_YORK';

        return null;
    }

    /**
     * Get the start/end timestamps for a specific session on a given day
     * @param {number} timestamp - Unix timestamp in seconds
     * @param {string} session - ASIAN, LONDON, NEW_YORK
     * @returns {Object|null} - { start, end } timestamps
     */
    static getSessionWindow(timestamp, session) {
        const date = new Date(timestamp * 1000);
        date.setUTCHours(0, 0, 0, 0);
        const baseTime = date.getTime() / 1000;

        const timings = {
            ASIAN: { start: 0, end: 9 },
            LONDON: { start: 8, end: 16 },
            NEW_YORK: { start: 13, end: 22 }
        };

        const time = timings[session];
        if (!time) return null;

        return {
            start: baseTime + (time.start * 3600),
            end: baseTime + (time.end * 3600)
        };
    }

    /**
     * Calculate Real-World Execution Precision
     * @param {string} assetClass - Asset class
     * @param {string} timeframe - Current timeframe
     * @returns {Object} - Precision metrics { score, spreadImpact, slippageProb }
     */
    static calculateExecutionPrecision(assetClass, timeframe, atr = 0, timestamp = null) {
        const isScalp = timeframe === '5m' || timeframe === '15m' || timeframe === '5M';
        const date = timestamp ? new Date(timestamp * 1000) : new Date();
        const hour = date.getUTCHours();

        const baseMetrics = {
            FOREX: { spreadIdx: 0.1, slippageIdx: 0.2 },
            CRYPTO: { spreadIdx: 0.3, slippageIdx: 0.5 },
            METALS: { spreadIdx: 0.2, slippageIdx: 0.3 },
            INDICES: { spreadIdx: 0.15, slippageIdx: 0.25 },
            STOCKS: { spreadIdx: 0.25, slippageIdx: 0.4 }
        };

        const metrics = baseMetrics[assetClass] || baseMetrics.FOREX;

        // Session Adjustments (Session ends = Wider Spreads)
        let sessionMultiplier = 1.0;
        if (hour >= 21 || hour <= 0) sessionMultiplier = 2.5; // Rollover jump
        else if (hour >= 8 && hour <= 16) sessionMultiplier = 0.8; // Peak London/NY liquidity

        // Scale by timeframe (Lower TF = Higher Impact)
        const tfMultiplier = isScalp ? 2.5 : 1.0;
        const spreadImpact = Math.min(metrics.spreadIdx * tfMultiplier * sessionMultiplier, 1.0);
        const slippageProb = Math.min(metrics.slippageIdx * tfMultiplier * (atr > 0 ? 1.2 : 1.0), 1.0);

        // Precision Score (0-100)
        const score = Math.round((1 - (spreadImpact + slippageProb) / 2) * 100);

        return {
            score,
            spreadImpact: spreadImpact > 0.6 ? 'HIGH' : spreadImpact > 0.3 ? 'MEDIUM' : 'LOW',
            slippageProb: slippageProb > 0.6 ? 'HIGH' : slippageProb > 0.3 ? 'MEDIUM' : 'LOW',
            dynamicBuffer: atr > 0 ? (atr * (spreadImpact * 0.1)) : 0
        };
    }
}
