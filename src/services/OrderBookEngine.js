/**
 * Order Book Engine (Phase 7)
 * 
 * Analyzes real-time L2 depth data to identify institutional walls and 
 * order flow imbalance. This provides a leading indicator of execution pressure.
 */
export class OrderBookEngine {
    /**
     * Analyze Order Book Depth
     * @param {Object} depth - { bids: [{price, quantity}], asks: [{price, quantity}] }
     * @param {number} currentPrice - Market mid-price
     * @param {number} customRange - Optional range for imbalance calculation (default: 2%)
     * @returns {Object} Analysis results
     */
    static analyze(depth, currentPrice, customRange = null) {
        if (!depth || !depth.bids || !depth.asks) {
            return { imbalance: 0, walls: [], pressure: 'NEUTRAL' };
        }

        // 1. Detect Buy/Sell Side Walls
        const bidWalls = this._findWalls(depth.bids, 'BUY');
        const askWalls = this._findWalls(depth.asks, 'SELL');

        // 2. Calculate Order Flow Imbalance (within range)
        const range = customRange || currentPrice * 0.02;
        const imbalance = this._calculateImbalance(depth, currentPrice, range);

        // 3. Determine Execution Pressure
        const pressure = imbalance > 0.2 ? 'BULLISH' :
            imbalance < -0.2 ? 'BEARISH' : 'NEUTRAL';

        return {
            imbalance,
            walls: [...bidWalls, ...askWalls],
            pressure,
            summary: this._generateSummary(imbalance, bidWalls, askWalls)
        };
    }

    /**
     * Identify significant liquidity walls (spikes in depth)
     */
    static _findWalls(levels, side) {
        if (levels.length === 0) return [];

        const avgQuantity = levels.reduce((sum, l) => sum + l.quantity, 0) / levels.length;
        const walls = [];

        levels.forEach(level => {
            // A "Wall" is 3x larger than the average depth level
            if (level.quantity > avgQuantity * 3) {
                walls.push({
                    price: level.price,
                    quantity: level.quantity,
                    side: side,
                    strength: level.quantity / avgQuantity,
                    type: 'LIQUIDITY_WALL'
                });
            }
        });

        return walls.sort((a, b) => b.quantity - a.quantity).slice(0, 3);
    }

    /**
     * Calculate Volume Imbalance ratio
     * Ratio = (BidVolume - AskVolume) / (BidVolume + AskVolume)
     */
    static _calculateImbalance(depth, currentPrice, range) {
        const bidVol = depth.bids
            .filter(b => b.price >= currentPrice - range)
            .reduce((sum, b) => sum + b.quantity, 0);

        const askVol = depth.asks
            .filter(a => a.price <= currentPrice + range)
            .reduce((sum, a) => sum + a.quantity, 0);

        if (bidVol + askVol === 0) return 0;
        return (bidVol - askVol) / (bidVol + askVol);
    }

    /**
     * Generate human-readable depth summary
     */
    static _generateSummary(imbalance, bidWalls, askWalls) {
        const bias = imbalance > 0 ? 'bullish' : 'bearish';
        const wallNote = bidWalls.length > 0 || askWalls.length > 0
            ? ` with ${bidWalls.length + askWalls.length} significant walls detected`
            : '';

        return `Order book shows a ${Math.abs(imbalance * 100).toFixed(1)}% ${bias} imbalance${wallNote}.`;
    }

    /**
     * Calculate Order Book Alignment Bonus for QuantScore
     * @param {string} setupDirection - LONG | SHORT
     * @param {Object} depthAnalysis - Result from analyze()
     * @returns {number} Bonus points (0-10)
     */
    static getDepthAlignmentBonus(setupDirection, depthAnalysis) {
        if (!depthAnalysis) return 0;

        const isAligned = (setupDirection === 'LONG' && depthAnalysis.pressure === 'BULLISH') ||
            (setupDirection === 'SHORT' && depthAnalysis.pressure === 'BEARISH');

        if (!isAligned) return 0;

        // Scale bonus by imbalance strength
        const strength = Math.abs(depthAnalysis.imbalance);
        return Math.min(10, Math.floor(strength * 20));
    }
}
