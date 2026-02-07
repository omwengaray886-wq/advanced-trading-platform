/**
 * Support & Resistance Detector
 * Clusters swing points to identify significant horizontal price levels.
 * Institutional Logic: 3+ touches = Major Level, 2 touches = Minor/Retail Level.
 */
export class SRDetector {
    /**
     * Detect S/R levels from price data
     * @param {Array} candles - OHLC data
     * @param {Array} swingPoints - Pre-calculated swing points
     * @returns {Array} - Detected levels with metadata
     */
    static detectLevels(candles, swingPoints) {
        if (!swingPoints || swingPoints.length < 2) return [];

        const levels = [];
        const threshold = this.calculateThreshold(candles);

        // Group swing points by proximity
        const clusters = this.clusterSwingPoints(swingPoints, threshold);

        clusters.forEach(cluster => {
            const avgPrice = cluster.reduce((sum, p) => sum + p.price, 0) / cluster.length;
            const touches = cluster.length;
            const type = this.determineLevelType(cluster, candles[candles.length - 1].close);

            levels.push({
                price: avgPrice,
                touches: touches,
                strength: touches >= 3 ? 'STRONG' : 'MODERATE',
                isMajor: touches >= 3,
                type: type, // SUPPORT, RESISTANCE
                lastTouch: Math.max(...cluster.map(p => p.time)),
                timeframe: cluster[0].timeframe || '1H'
            });
        });

        return levels.sort((a, b) => b.touches - a.touches);
    }

    /**
     * Dynamic threshold for clustering based on ATR or price scale
     */
    static calculateThreshold(candles) {
        if (candles.length < 2) return 0;
        const prices = candles.map(c => c.close);
        const range = Math.max(...prices) - Math.min(...prices);
        // Cluster points within 0.15% of the total range
        return range * 0.0015;
    }

    /**
     * Basic clustering algorithm (proximity-based)
     */
    static clusterSwingPoints(points, threshold) {
        const clusters = [];
        const sorted = [...points].sort((a, b) => a.price - b.price);

        if (sorted.length === 0) return [];

        let currentCluster = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].price - currentCluster[currentCluster.length - 1].price <= threshold) {
                currentCluster.push(sorted[i]);
            } else {
                if (currentCluster.length >= 2) {
                    clusters.push(currentCluster);
                }
                currentCluster = [sorted[i]];
            }
        }

        if (currentCluster.length >= 2) {
            clusters.push(currentCluster);
        }

        return clusters;
    }

    static determineLevelType(cluster, currentPrice) {
        const avgPrice = cluster.reduce((sum, p) => sum + p.price, 0) / cluster.length;
        return currentPrice > avgPrice ? 'SUPPORT' : 'RESISTANCE';
    }
}
