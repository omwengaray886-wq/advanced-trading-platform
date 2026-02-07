import { LiquidityMap } from '../models/annotations/LiquidityMap.js';

/**
 * Liquidity Map Service
 * Process real Depth of Market (DOM) data from Binance.
 */
export class LiquidityMapService {
    /**
     * Generate Liquidity Map from Real Order Book
     * @param {Object} depthData - { bids: [{price, quantity}], asks: [{price, quantity}] }
     * @returns {Array} LiquidityMap objects
     */
    static generateMap(depthData) {
        if (!depthData || !depthData.bids || !depthData.asks) return [];

        const maps = [];

        // Find max volume in the visible book to calculate relative intensity
        const maxBidVol = Math.max(...depthData.bids.map(b => b.quantity));
        const maxAskVol = Math.max(...depthData.asks.map(a => a.quantity));
        const globalMax = Math.max(maxBidVol, maxAskVol);

        // Process Bids
        depthData.bids.forEach(b => {
            maps.push(new LiquidityMap(
                b.price,
                b.quantity,
                'BID',
                b.quantity / globalMax // Relative Intensity (0-1)
            ));
        });

        // Process Asks
        depthData.asks.forEach(a => {
            maps.push(new LiquidityMap(
                a.price,
                a.quantity,
                'ASK',
                a.quantity / globalMax
            ));
        });

        return maps;
    }

    /**
     * Identify high-volume price clusters (Liquidity Walls)
     * @param {Object} depthData
     * @returns {Object} { buyClusters: [], sellClusters: [] }
     */
    static findClusters(depthData) {
        if (!depthData || !depthData.bids || !depthData.asks) return { buyClusters: [], sellClusters: [] };

        const avgBid = depthData.bids.reduce((sum, b) => sum + b.quantity, 0) / depthData.bids.length;
        const avgAsk = depthData.asks.reduce((sum, a) => sum + a.quantity, 0) / depthData.asks.length;

        // Threshold for a "wall" is 3x the average volume in the book
        const buyClusters = depthData.bids
            .filter(b => b.quantity > avgBid * 3)
            .map(b => ({ price: b.price, quantity: b.quantity, intensity: b.quantity / avgBid }));

        const sellClusters = depthData.asks
            .filter(a => a.quantity > avgAsk * 3)
            .map(a => ({ price: a.price, quantity: a.quantity, intensity: a.quantity / avgAsk }));

        return { buyClusters, sellClusters };
    }
}
