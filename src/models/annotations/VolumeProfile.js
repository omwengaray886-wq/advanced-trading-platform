import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * Volume Profile Annotation
 * Represents a price-volume distribution on the chart.
 */
export class VolumeProfile extends ChartAnnotation {
    /**
     * @param {Object} data - Output from VolumeProfileAnalyzer
     * @param {Object} metadata - Optional metadata (side, width, etc.)
     */
    constructor(data, metadata = {}) {
        super('VOLUME_PROFILE', {}, metadata);

        this.poc = data.poc;
        this.vah = data.vah;
        this.val = data.val;
        this.buckets = data.buckets;
        this.hvns = data.hvns;
        this.lvns = data.lvns;
        this.totalVolume = data.totalVolume;

        this.side = metadata.side || 'RIGHT';
        this.width = metadata.width || 0.2; // 20% of chart width
    }

    /**
     * Get level type for a specific price
     */
    getPriceContext(price) {
        if (Math.abs(price - this.poc) / this.poc < 0.001) return 'POC';
        if (price >= this.val && price <= this.vah) return 'VALUE_AREA';
        if (price > this.vah) return 'PREMIUM_OUTSIDE_VALUE';
        if (price < this.val) return 'DISCOUNT_OUTSIDE_VALUE';
        return 'NORMAL';
    }

    toJSON() {
        return {
            ...super.toJSON(),
            poc: this.poc,
            vah: this.vah,
            val: this.val,
            side: this.side,
            width: this.width,
            buckets: this.buckets.map(b => ({
                low: b.low,
                high: b.high,
                relVol: b.relVol,
                upVolume: b.upVolume,
                downVolume: b.downVolume
            }))
        };
    }
}
