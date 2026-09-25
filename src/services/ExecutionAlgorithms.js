
/**
 * Execution Algorithms (The "Fingers")
 * 
 * Helper classes to manage complex execution lifecycles.
 */

export class IcebergSlicer {
    /**
     * Slices a large order into small random chunks
     * @param {number} totalSize 
     * @param {number} visibleSize 
     * @param {number} variance (0.0 - 1.0)
     */
    static generateSlices(totalSize, visibleSize, variance = 0.2) {
        let remaining = totalSize;
        const slices = [];

        while (remaining > 0) {
            // Randomize size: visibleSize +/- variance
            const rand = 1 + (Math.random() * variance * 2 - variance);
            let chunkSize = visibleSize * rand;

            if (chunkSize > remaining) chunkSize = remaining;

            slices.push(parseFloat(chunkSize.toFixed(4)));
            remaining -= chunkSize;
        }

        return slices;
    }
}

export class LimitChaser {
    /**
     * Calculates new price for a chasing limit order
     * @param {number} currentOrderPrice 
     * @param {number} bestAsk 
     * @param {number} maxPrice 
     * @param {number} stepSize 
     */
    static calculateChasePrice(side, currentOrderPrice, bestBookPrice, maxParams) {
        // Simple logic: If price moved away, follow it up to a limit.
        const { maxChasePrice, tickSize } = maxParams;

        if (side === 'BUY') {
            if (bestBookPrice > currentOrderPrice) {
                // Price moved up. Should we chase?
                if (bestBookPrice <= maxChasePrice) {
                    return bestBookPrice; // Move to top of book
                } else {
                    return currentOrderPrice; // Stay put, too expensive
                }
            }
        } else { // SELL
            if (bestBookPrice < currentOrderPrice) {
                // Price moved down. Chase?
                if (bestBookPrice >= maxChasePrice) {
                    return bestBookPrice;
                }
            }
        }
        return currentOrderPrice;
    }
}
