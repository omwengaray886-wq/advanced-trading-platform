
/**
 * Smart Execution Router (The "Hands")
 * 
 * Decides HOW to execute a trade to minimize slippage and maximize fill rate.
 * Analyzes Spread, Volatility, and Order Size relative to Liquidity.
 */
export class SmartExecutionRouter {
    constructor() {
        this.MAX_SLIPPAGE_TOLERANCE = 0.005; // 0.5% max allows slippage for high urgency
        this.ICEBERG_THRESHOLD_USD = 100000; // Split orders above this size
        this.TWAP_THRESHOLD_USD = 500000;    // TWAP orders above this size
    }

    /**
     * Determine the optimal execution strategy
     * @param {Object} order - { side, size, price, urgency: 'HIGH'|'MEDIUM'|'LOW' }
     * @param {Object} marketState - { currentPrice, spread, volatility, depth }
     */
    route(order, marketState) {
        const spreadPct = (marketState.spread / marketState.currentPrice);
        const volatilityState = marketState.volatility?.state || 'NORMAL';
        const orderValue = order.size * marketState.currentPrice;

        let decision = {
            type: 'LIMIT', // Default
            parameters: {},
            reason: []
        };

        // 1. Urgency vs Cost Analysis
        // If urgency is HIGH, we prioritize execution over hiding size (unless size is absurdly large? No, urgency wins).

        if (order.urgency === 'HIGH') {
            // Check if spread is "Reasonable"
            if (spreadPct < 0.001) { // < 0.1% spread
                decision.type = 'MARKET';
                decision.reason.push('High Urgency + Tight Spread = Market Order');
            } else if (spreadPct < 0.003) {
                // Spread is kinda wide, but we need in. 
                // Use Aggressive Limit (Inside Bid/Ask)
                decision.type = 'LIMIT_CHASE'; // Custom type: Post at Best Ask, move if runs
                decision.parameters = {
                    offset: 0, // Top of book
                    maxChase: 3 // Max 3 updates
                };
                decision.reason.push('High Urgency + Moderate Spread = Aggressive Limit');
            } else {
                // Spread is too wide even for urgency (Slippage protection)
                decision.type = 'LIMIT';
                decision.parameters = {
                    price: marketState.currentPrice // Mid-price
                };
                decision.reason.push('Spread > 0.3% - Forced Limit to protect value');
            }

            // Check for massive slippage on Market/Chase
            if (decision.type === 'MARKET' && marketState.depth) {
                const estimatedSlippage = this._estimateSlippage(order.side, order.size, marketState.depth);
                if (estimatedSlippage > this.MAX_SLIPPAGE_TOLERANCE) {
                    decision.type = 'LIMIT_CHASE'; // Downgrade to Limit
                    decision.reason.push(`Estimated Slippage (${(estimatedSlippage * 100).toFixed(2)}%) exceeds tolerance.`);
                }
            }
            return decision;
        }

        // 2. Check for Whale Size (Iceberg/TWAP) - Only if NOT High Urgency
        if (orderValue > this.TWAP_THRESHOLD_USD) {
            decision.type = 'TWAP';
            decision.parameters = {
                duration: '1h',
                slices: 10,
                randomize: true
            };
            decision.reason.push(`Size ($${(orderValue / 1000).toFixed(0)}k) exceeds TWAP threshold.`);
            return decision;
        }

        if (orderValue > this.ICEBERG_THRESHOLD_USD) {
            decision.type = 'ICEBERG';
            decision.parameters = {
                visibleSize: order.size * 0.1, // Show 10%
                variance: 0.2 // +/- 20% size randomization
            };
            decision.reason.push(`Size ($${(orderValue / 1000).toFixed(0)}k) triggers Iceberg execution.`);
            return decision;
        }

        // 3. Low/Medium Urgency Normal Execution
        if (volatilityState === 'HIGH') {
            // High Volatility = Risk of getting ran over.
            decision.type = 'LIMIT_PASSIVE';
            decision.reason.push('High Volatility - Using Passive Limit to catch wicks');
        } else {
            // Normal/Low Volatility
            decision.type = 'LIMIT';
            decision.reason.push('Standard Limit Execution');
        }

        return decision;
    }

    /**
     * Estimate slippage by walking the book
     */
    _estimateSlippage(side, size, depth) {
        const book = side === 'BUY' ? depth.asks : depth.bids; // Buying eats asks
        if (!book || book.length === 0) return 0.01; // Default high if no data

        let filled = 0;
        let weightedPrice = 0;

        for (const level of book) {
            const levelSize = parseFloat(level.quantity); // or amount
            const levelPrice = parseFloat(level.price);

            const take = Math.min(size - filled, levelSize);
            weightedPrice += (take * levelPrice);
            filled += take;

            if (filled >= size) break;
        }

        if (filled < size) return 0.10; // Not enough liquidity (huge slippage)

        const avgFillPrice = weightedPrice / size;
        const bestPrice = parseFloat(book[0].price);

        // Slippage %
        return Math.abs(avgFillPrice - bestPrice) / bestPrice;
    }
}
