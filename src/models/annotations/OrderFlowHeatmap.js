import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Order Flow Heatmap Annotation
 * Represents a price-level intensity heatmap (Tape Reading).
 */
export class OrderFlowHeatmap extends ChartAnnotation {
    /**
     * @param {Object} data - Output from OrderFlowAnalyzer.calculateHeatmap
     * @param {Object} metadata - Optional metadata
     */
    constructor(data, metadata = {}) {
        super('ORDER_FLOW_HEATMAP', {}, metadata);

        this.heatmap = data.heatmap;
        this.walls = data.walls;
        this.maxIntensity = data.maxIntensity;
    }

    /**
     * Get intensity at a specific price
     */
    getIntensity(price) {
        const layer = this.heatmap.find(h => price >= h.low && price <= h.high);
        return layer ? layer.intensity : 0;
    }

    toJSON() {
        return {
            ...super.toJSON(),
            heatmap: this.heatmap.map(h => ({
                low: h.low,
                high: h.high,
                intensity: h.intensity,
                dominance: h.dominance
            })),
            walls: this.walls
        };
    }
}
