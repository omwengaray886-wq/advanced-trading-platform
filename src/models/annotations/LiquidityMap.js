import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * LiquidityMap Model
 * Represents a cluster of pending limit orders at a specific price level.
 * Used for drawing the Order Book Heatmap / Liquidity Map.
 */
export class LiquidityMap extends ChartAnnotation {
    /**
     * @param {number} price - The price level
     * @param {number} volume - Simulated volume at this level
     * @param {string} side - 'BID' | 'ASK'
     * @param {number} intensity - Normalized 0-1 scale of liquidity depth
     */
    constructor(price, volume, side, intensity, metadata = {}) {
        // We use a specific type for the renderer
        const visuals = {
            type: 'LIQUIDITY_MAP',
            side,
            intensity,
            intent: side === 'BID' ? 'SUPPORT_WALL' : 'RESISTANCE_WALL'
        };

        super('LIQUIDITY_MAP', { price }, { ...metadata, ...visuals });

        this.price = price;
        this.volume = volume;
        this.side = side;
        this.intensity = intensity;
    }

    /**
     * Get the visual color based on side and intensity
     */
    getVisualColor() {
        const opacity = Math.max(0.05, this.intensity * 0.8);
        if (this.side === 'BID') {
            return `rgba(0, 255, 255, ${opacity})`; // Cyan for Bids
        }
        return `rgba(255, 165, 0, ${opacity})`; // Orange for Asks
    }
}
