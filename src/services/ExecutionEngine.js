/**
 * Execution Engine (Phase 8)
 * 
 * Provides institutional-grade execution logic including Smart Order Routing (SOR) 
 * simulations, VWAP calculations, and dynamic Kelly Criterion sizing.
 */
export class ExecutionEngine {
    /**
     * Calculate Optimal Position Size using Kelly Criterion
     * Formula: K% = W - [(1-W) / R]
     * @param {number} winRate - Historical win rate (0-1)
     * @param {number} riskReward - R:R ratio
     * @param {number} conviction - Normalizing factor based on QuantScore (0.1 - 1.0)
     * @returns {number} - % of capital to risk
     */
    static calculateKellySize(winRate, riskReward, conviction = 1.0) {
        if (winRate <= 0 || riskReward <= 0) return 0.01; // 1% default risk

        // Calculate raw Kelly fraction
        const kelly = winRate - ((1 - winRate) / riskReward);

        // Institutional safety: Use "Fractional Kelly" (25% of theoretical max) 
        // and scale by engine conviction
        const safeKelly = Math.max(0.01, (kelly * 0.25) * conviction);

        // Cap risk at 5% per trade for platform stability
        return Math.min(0.05, safeKelly);
    }

    /**
     * Smart Order Routing (SOR) Simulation
     * Analyzes depth to suggest order splitting to minimize slippage.
     * @param {number} totalSize - Total order amount
     * @param {Object} depth - Order book depth { bids, asks }
     * @param {string} side - 'BUY' | 'SELL'
     * @returns {Object} { tranches, averageSlippage, vwapExecution }
     */
    static simulateSORMapping(totalSize, depth, side) {
        if (!depth || !depth.bids || !depth.asks) return null;

        const levels = side === 'BUY' ? depth.asks : depth.bids;
        let remaining = totalSize;
        const tranches = [];
        let weightedPriceSum = 0;

        for (const level of levels) {
            if (remaining <= 0) break;

            const fillSize = Math.min(remaining, level.quantity);
            tranches.push({
                price: level.price,
                quantity: fillSize,
                percentage: (fillSize / totalSize) * 100
            });

            weightedPriceSum += (fillSize * level.price);
            remaining -= fillSize;
        }

        const avgPrice = weightedPriceSum / (totalSize - remaining);
        const slippage = Math.abs(avgPrice - levels[0].price) / levels[0].price;

        return {
            tranches,
            averagePrice: avgPrice,
            slippage: slippage * 100, // as percentage
            fillRate: ((totalSize - remaining) / totalSize) * 100,
            recommendation: slippage > 0.005 ? 'TWAP_EXECUTION' : 'INSTANT'
        };
    }

    /**
     * Calculate Institutional VWAP (Volume Weighted Average Price)
     * Used as a benchmark for high-quality entries.
     */
    static calculateVWAP(candles) {
        if (!candles || candles.length === 0) return 0;

        let totalVolume = 0;
        let weightedPriceSum = 0;

        candles.forEach(c => {
            const typicalPrice = (c.high + c.low + c.close) / 3;
            weightedPriceSum += (typicalPrice * c.volume);
            totalVolume += c.volume;
        });

        return totalVolume > 0 ? weightedPriceSum / totalVolume : 0;
    }

    /**
     * Get Execution Urgency based on Order Book Imbalance
     * High imbalance in setup direction = High Urgency
     */
    static getExecutionUrgency(imbalance, setupDirection) {
        const isAligned = (setupDirection === 'LONG' && imbalance > 0.3) ||
            (setupDirection === 'SHORT' && imbalance < -0.3);

        return isAligned ? 'HIGH' : 'LOW';
    }

    /**
     * Check Real-Time Spread Health
     * Blocks execution if spread exceeds 10% of ATR (cost of business is too high)
     * @param {number} currentPrice - Market mid-price
     * @param {number} bid - Current Bid
     * @param {number} ask - Current Ask
     * @param {number} atr - Average True Range
     * @returns {Object} { isSafe, spread, spreadToATR, message }
     */
    static checkSpreadHealth(currentPrice, bid, ask, atr) {
        if (!bid || !ask || !atr) return { isSafe: true, message: 'Missing data, assuming safe' };

        const spread = ask - bid;
        const spreadToATR = spread / atr;

        // Safety Threshold: Spread should not exceed 10% of the daily range (ATR)
        // In scalping (low TF), this might need to be 20%, but 10% is a safe institutional baseline.
        const SAFE_THRESHOLD = 0.10;

        if (spreadToATR > SAFE_THRESHOLD) {
            return {
                isSafe: false,
                spread,
                spreadToATR,
                message: `Spread (${spread.toFixed(2)}) is ${(spreadToATR * 100).toFixed(1)}% of ATR. Execution Unsafe.`
            };
        }

        return {
            isSafe: true,
            spread,
            spreadToATR,
            message: 'Spread Nominal'
        };
    }

    /**
     * Get Optimal Order Type based on Volatility
     * @param {Object} volatilityState - { level: 'LOW'|'MEDIUM'|'HIGH'|'EXTREME' }
     * @returns {string} 'LIMIT' | 'STOP_MARKET' | 'MARKET'
     */
    static getOptimalOrderType(volatilityState) {
        const level = volatilityState?.level || 'MEDIUM';

        // 1. Low Volatility (Grinding/Ranging) -> Patient Limit Orders
        // We want to be a maker and capture the spread.
        if (level === 'LOW') {
            return 'LIMIT';
        }

        // 2. Medium Volatility -> Standard Execution
        // Limit orders are still preferred, but we might lean aggressively.
        if (level === 'MEDIUM') {
            return 'LIMIT';
        }

        // 3. High/Extreme Volatility (Breakout/Crash) -> Aggressive Entry
        // Price is moving fast. Limit orders will be left behind. 
        // We use STOP_MARKET to trigger entry only if price keeps moving in our direction.
        if (level === 'HIGH' || level === 'EXTREME') {
            return 'STOP_MARKET';
        }

        return 'LIMIT';
    }
}
