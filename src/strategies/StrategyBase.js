import { AssetClassAdapter } from '../services/assetClassAdapter.js';

/**
 * Base Strategy Class
 * All strategy modules inherit from this class
 */
export class StrategyBase {
    constructor(name, description) {
        this.name = name;
        this.description = description;
    }

    /**
     * Evaluate market suitability for this strategy
     * @param {Object} marketState - Current market analysis
     * @param {string} direction - LONG or SHORT
     * @returns {number} - Suitability score (0-1)
     */
    evaluate(marketState, direction = 'LONG') {
        throw new Error('Strategy must implement evaluate() method');
    }

    /**
     * Generate chart annotations for this strategy
     * @param {Array} candles - Candlestick data
     * @param {Object} marketState - Current market analysis
     * @param {string} direction - LONG or SHORT
     * @returns {Array} - Array of annotations
     */
    generateAnnotations(candles, marketState, direction = 'LONG') {
        throw new Error('Strategy must implement generateAnnotations() method');
    }

    /**
     * Get entry logic explanation
     * @param {Object} analysis - Strategy analysis results
     * @returns {string} - Entry reasoning
     */
    getEntryLogic(analysis) {
        throw new Error('Strategy must implement getEntryLogic() method');
    }

    /**
     * Get invalidation logic explanation
     * @param {Object} analysis - Strategy analysis results
     * @returns {string} - Invalidation reasoning
     */
    getInvalidationLogic(analysis) {
        throw new Error('Strategy must implement getInvalidationLogic() method');
    }

    /**
     * Get risk parameters
     * @param {Object} analysis - Strategy analysis results
     * @returns {Object} - { stopLoss, targets, riskReward }
     */
    getRiskParameters(analysis) {
        throw new Error('Strategy must implement getRiskParameters() method');
    }

    /**
     * Get detailed technical rationale for the strategy "working"
     * @param {Array} candles - Candlestick data
     * @param {Object} marketState - Current market analysis
     * @param {Array} annotations - Strategy-specific annotations
     * @returns {string} - Detailed technical reasoning
     */
    getDetailedRationale(candles, marketState, annotations) {
        return `Analyzing ${this.name} setup based on current market structure and liquidity levels.`;
    }

    /**
     * Get strategy context for AI explanation
     * @param {Object} analysis - Strategy analysis results
     * @returns {Object} - Context for explanation generation
     */
    getContext(analysis) {
        return {
            strategyName: this.name,
            description: this.description,
            institutionalTheme: this.getInstitutionalTheme(),
            analysis
        };
    }

    /**
     * Calculate Average True Range (ATR)
     * Used for volatility-based stops/buffers
     */
    calculateATR(candles, period = 14) {
        if (candles.length < period + 1) return 0;

        let trSum = 0;
        for (let i = candles.length - period; i < candles.length; i++) {
            const h = candles[i].high;
            const l = candles[i].low;
            const pc = candles[i - 1].close;
            const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
            trSum += tr;
        }
        return trSum / period;
    }

    /**
     * Get Volatility Buffer
     * @param {Array} candles - Candlestick data
     * @param {string} assetClass - Asset class (for multiplier)
     * @param {number} overrideMultiplier - Optional multiplier override
     */
    getVolatilityBuffer(candles, assetClass = 'FOREX', overrideMultiplier = null) {
        const atr = this.calculateATR(candles);
        const assetParams = AssetClassAdapter.getAssetParameters(assetClass);
        const multiplier = overrideMultiplier !== null ? overrideMultiplier : (assetParams.stopLossMultiplier || 2.0);
        return atr * multiplier;
    }

    /**
     * Find Structural Invalidation level
     * Searches for the significant pivot that must NOT be broken
     */
    getStructuralInvalidation(candles, direction, marketState) {
        // Use most recent significant swing point
        const swings = marketState.swingPoints || [];
        const relevantSwings = swings.filter(s =>
            direction === 'LONG' ? s.type === 'LOW' : s.type === 'HIGH'
        );

        const assetClass = marketState.assetClass || 'FOREX';
        const buffer = this.getVolatilityBuffer(candles, assetClass);

        if (relevantSwings.length > 0) {
            // Get the most recent one
            const targetSwing = relevantSwings[relevantSwings.length - 1];
            return direction === 'LONG' ?
                targetSwing.price - buffer :
                targetSwing.price + buffer;
        }

        // Fallback: Last 20 candles high/low
        const last20 = candles.slice(-20);
        const low = Math.min(...last20.map(c => c.low));
        const high = Math.max(...last20.map(c => c.high));

        return direction === 'LONG' ? low - buffer : high + buffer;
    }

    /**
     * Generate Standardized Targets
     * @param {number} entry - Entry price
     * @param {number} stopLoss - Stop loss price
     * @param {Array} liquidityPools - Market liquidity pools
     * @param {string} direction - LONG or SHORT
     * @returns {Array} - Array of targets
     */
    generateStandardTargets(entry, stopLoss, liquidityPools, direction) {
        const risk = Math.abs(entry - stopLoss);
        const attractivePools = (liquidityPools || []).filter(p =>
            direction === 'LONG' ? p.price > entry : p.price < entry
        ).sort((a, b) =>
            direction === 'LONG' ? a.price - b.price : b.price - a.price
        );

        // Target 1: First pool or 2.0 R:R
        const t1Price = attractivePools[0]?.price ||
            (direction === 'LONG' ? entry + (risk * 2.0) : entry - (risk * 2.0));

        // Target 2: Second pool or 4.0 R:R
        const t2Price = attractivePools[1]?.price ||
            (direction === 'LONG' ? entry + (risk * 4.0) : entry - (risk * 4.0));

        return [
            {
                price: t1Price,
                riskReward: Math.abs(t1Price - entry) / risk,
                label: attractivePools[0] ? `Liquidity: ${attractivePools[0].label}` : 'Target (1:2 RR)'
            },
            {
                price: t2Price,
                riskReward: Math.abs(t2Price - entry) / risk,
                label: attractivePools[1] ? `Major Pool: ${attractivePools[1].label}` : 'Trend Extension'
            }
        ];
    }

    /**
     * Get the institutional "narrative" theme for this strategy
     */
    getInstitutionalTheme() {
        return 'Market Efficiency & Institutional Flow';
    }
}
