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

        return `Order book shows a ${Math.abs((imbalance || 0) * 100).toFixed(1)}% ${bias} imbalance${wallNote}.`;
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

    /**
     * Calculate Detailed Order Book Imbalance (Phase 4)
     * Provides granular pressure measurement at multiple depth levels
     * @param {Object} depth - Order book depth
     * @param {number} currentPrice - Current market price
     * @returns {Object} Detailed imbalance analysis
     */
    static calculateDetailedImbalance(depth, currentPrice) {
        if (!depth || !depth.bids || !depth.asks) {
            return {
                overall: 0,
                near: 0,
                mid: 0,
                far: 0,
                pressure: 'NEUTRAL',
                signals: []
            };
        }

        // Calculate imbalance at 3 depth levels
        const nearRange = currentPrice * 0.005; // 0.5%
        const midRange = currentPrice * 0.01;   // 1%
        const farRange = currentPrice * 0.02;   // 2%

        const nearImb = this._calculateImbalance(depth, currentPrice, nearRange);
        const midImb = this._calculateImbalance(depth, currentPrice, midRange);
        const farImb = this._calculateImbalance(depth, currentPrice, farRange);
        const overall = (nearImb + midImb + farImb) / 3;

        // Determine pressure and generate signals
        let pressure = 'NEUTRAL';
        const signals = [];

        if (overall > 0.3) {
            pressure = 'STRONG_BUY';
            signals.push({
                type: 'DOM_SUPPORT',
                strength: overall,
                message: 'Heavy buy-side depth - Strong institutional support'
            });
        } else if (overall > 0.15) {
            pressure = 'BUY';
        } else if (overall < -0.3) {
            pressure = 'STRONG_SELL';
            signals.push({
                type: 'DOM_RESISTANCE',
                strength: Math.abs(overall),
                message: 'Heavy sell-side depth - Strong institutional resistance'
            });
        } else if (overall < -0.15) {
            pressure = 'SELL';
        }

        // Detect divergence (near vs far imbalance mismatch)
        if (nearImb > 0.2 && farImb < -0.1) {
            signals.push({
                type: 'FAKE_SUPPORT',
                strength: 0.6,
                message: 'Near support, far resistance - Potential trap'
            });
        } else if (nearImb < -0.2 && farImb > 0.1) {
            signals.push({
                type: 'FAKE_RESISTANCE',
                strength: 0.6,
                message: 'Near resistance, far support - Potential trap'
            });
        }

        return {
            overall: parseFloat((overall || 0).toFixed(3)),
            near: parseFloat((nearImb || 0).toFixed(3)),
            mid: parseFloat((midImb || 0).toFixed(3)),
            far: parseFloat((farImb || 0).toFixed(3)),
            pressure,
            signals
        };
    }
    /**
     * Detect Iceberg Orders (Hidden Liquidity) - Phase 4 Upgrade
     * Identifies price levels where execution volume exceeds visible depth
     * @param {Array} recentTrades - Stream of recent trades
     * @param {Object} depthSnapshot - Current order book depth
     */
    static detectIcebergs(recentTrades, depthSnapshot) {
        if (!recentTrades || recentTrades.length < 50) return [];

        const icebergs = [];
        const volumeAtLevel = {};

        // 1. Aggregate Volume per Price Level
        recentTrades.forEach(t => {
            const p = t.price.toFixed(2);
            if (!volumeAtLevel[p]) volumeAtLevel[p] = { buy: 0, sell: 0, total: 0 };
            volumeAtLevel[p].total += t.size;
            if (t.side === 'BUY') volumeAtLevel[p].buy += t.size;
            else volumeAtLevel[p].sell += t.size;
        });

        // 2. Compare against Visible Depth (if matched)
        // Simplified: Look for abnormally high ratio of Aggressor Vol vs Price Displacement
        // Or simple "Replenishing Limit" logic: Big volume, no move.

        Object.keys(volumeAtLevel).forEach(price => {
            const data = volumeAtLevel[price];
            if (data.total > 500000) { // arbitrary 'Whale' threshold simulation
                // In a real engine, we'd check if price moved. 
                // Assumption: If all this volume hit and price is still here, it's an iceberg.

                const type = data.buy > data.sell ? 'SELL_ICEBERG' : 'BUY_ICEBERG'; // Aggressor Buy hit Passive Sell
                icebergs.push({
                    price: parseFloat(price),
                    type,
                    size: data.total,
                    strength: 'EXTREME'
                });
            }
        });

        return icebergs;
    }

    /**
     * Analyze Absorption (Delta Divergence) - Phase 4 Upgrade
     * Detects when aggressive volume is absorbed by passive limits
     */
    static analyzeAbsorption(candles) {
        if (!candles || candles.length < 3) return null;

        const last = candles[candles.length - 1];
        const prev = candles[candles.length - 2];

        // Mocking Delta for logic (in real app, delta is on the candle)
        // Check if High Volume + Small Candle Body
        const isHighVol = last.volume > (prev.volume * 1.5);
        const isSmallBody = Math.abs(last.close - last.open) < (last.high - last.low) * 0.3;

        if (isHighVol && isSmallBody) {
            // Absorption Detected
            // If close is near top -> Buying Absorption (bullish)
            // If close is near bottom -> Selling Absorption (bearish)
            const closePos = (last.close - last.low) / (last.high - last.low);

            if (closePos > 0.7) {
                return { type: 'BUYING_ABSORPTION', strength: 'HIGH' };
            } else if (closePos < 0.3) {
                return { type: 'SELLING_ABSORPTION', strength: 'HIGH' };
            }
        }

        return null;
    }
}
