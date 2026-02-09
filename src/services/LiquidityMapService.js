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
    /**
     * Generate Liquidity Map from Real Order Book with high granularity
     */
    static generateMap(depthData) {
        if (!depthData || !depthData.bids || !depthData.asks) return [];

        const maps = [];

        // Take more levels for high-density visualization (up to 50 levels per side)
        const bids = depthData.bids.slice(0, 50);
        const asks = depthData.asks.slice(0, 50);

        const globalMax = Math.max(
            ...bids.map(b => b.quantity),
            ...asks.map(a => a.quantity)
        );

        // Process Bids (Green Heat)
        bids.forEach(b => {
            const intensity = b.quantity / globalMax;
            maps.push(new LiquidityMap(
                b.price,
                b.quantity,
                'BID',
                intensity,
                intensity > 0.8 ? 'WALL' : intensity > 0.4 ? 'CLUSTER' : 'THIN'
            ));
        });

        // Process Asks (Red Heat)
        asks.forEach(a => {
            const intensity = a.quantity / globalMax;
            maps.push(new LiquidityMap(
                a.price,
                a.quantity,
                'ASK',
                intensity,
                intensity > 0.8 ? 'WALL' : intensity > 0.4 ? 'CLUSTER' : 'THIN'
            ));
        });

        return maps;
    }

    /**
     * Calculate Order Book Imbalance Score (-1 to 1)
     */
    static calculateImbalance(depthData) {
        if (!depthData || !depthData.bids || !depthData.asks) return 0;

        const totalBidVol = depthData.bids.reduce((sum, b) => sum + b.quantity, 0);
        const totalAskVol = depthData.asks.reduce((sum, a) => sum + a.quantity, 0);

        return (totalBidVol - totalAskVol) / (totalBidVol + totalAskVol);
    }

    /**
     * Identify "Pulse" levels (fast changing liquidity)
     */
    static detectSpoofing(currentMap, previousMap) {
        if (!previousMap || previousMap.length === 0) return [];

        const pulses = [];
        currentMap.forEach(level => {
            const prev = previousMap.find(p => p.price === level.price && p.side === level.side);
            if (prev) {
                const change = (level.volume - prev.volume) / prev.volume;
                // If volume changes > 300% in a single update, flag as potential flash-spoof
                if (Math.abs(change) > 3) {
                    pulses.push({
                        price: level.price,
                        side: level.side,
                        type: change > 0 ? 'FLASH_FILL' : 'SPOOF_REMOVAL',
                        volatility: Math.abs(change)
                    });
                }
            }
        });

        return pulses;
    }

    /**
     * Identify high-volume price clusters (Liquidity Walls)
     */
    static findClusters(depthData) {
        if (!depthData || !depthData.bids || !depthData.asks) return { buyClusters: [], sellClusters: [] };

        const avgBid = depthData.bids.reduce((sum, b) => sum + b.quantity, 0) / depthData.bids.length;
        const avgAsk = depthData.asks.reduce((sum, a) => sum + a.quantity, 0) / depthData.asks.length;

        // Wall threshold: 4x the average volume
        const buyClusters = depthData.bids
            .filter(b => b.quantity > avgBid * 4)
            .map(b => ({ price: b.price, quantity: b.quantity, intensity: b.quantity / avgBid }));

        const sellClusters = depthData.asks
            .filter(a => a.quantity > avgAsk * 4)
            .map(a => ({ price: a.price, quantity: a.quantity, intensity: a.quantity / avgAsk }));

        return { buyClusters, sellClusters };
    }

    /**
     * Logic Integration: Detect Micro-Pulses (Spoofing/Liquidity Flashing)
     * Compares 100ms updates to find rapid order removal.
     * @param {Object} currentDepth 
     * @returns {Array} List of spoofing events
     */
    static detectMicroPulse(currentDepth) {
        if (!this._prevDepth) {
            this._prevDepth = currentDepth;
            return [];
        }

        const events = [];
        const THRESHOLD = 0.5; // 50% volume drop

        // Check Bids
        currentDepth.bids.forEach(level => {
            const prev = this._prevDepth.bids.find(p => p.price === level.price);
            if (prev && level.quantity < prev.quantity * (1 - THRESHOLD)) {
                // If quantity dropped > 50% in 100ms, flag as potential spoof removal
                events.push({
                    price: level.price,
                    type: 'LIQUIDITY_FLASH_REMOVAL',
                    side: 'BUY',
                    magnitude: (prev.quantity - level.quantity) / prev.quantity
                });
            }
        });

        this._prevDepth = currentDepth;
        return events;
    }
}
