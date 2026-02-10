/**
 * Dark Pool Engine (Phase 6)
 * 
 * Detects "signature liquidity" from off-exchange institutional transactions.
 * Dark Pool trades often leave "shadows" at specific price levels where institutions peg prices.
 */
export class DarkPoolEngine {
    /**
     * Detect Dark Pool activity zones
     * @param {Array} candles - Price data
     * @param {Array} liquidityPools - Existing liquidity pools from LiquiditySweepDetector
     * @param {number} currentPrice - Current market price
     * @returns {Array} Dark Pool zones
     */
    static detectDarkPools(candles, liquidityPools = [], currentPrice) {
        if (!candles || candles.length < 50) {
            return [];
        }

        const darkPools = [];
        const recent100 = candles.slice(-100);

        // 1. Find consolidation zones (Price Pegging)
        const consolidationZones = this._findConsolidationZones(recent100);

        // 2. Validate with volume confirmation
        for (const zone of consolidationZones) {
            const volumeSignature = this._analyzeVolumeSignature(recent100, zone);

            if (volumeSignature.isInstitutional) {
                darkPools.push({
                    price: zone.center,
                    high: zone.high,
                    low: zone.low,
                    type: this._determineDarkPoolType(zone, currentPrice),
                    strength: volumeSignature.strength,
                    confidence: volumeSignature.confidence,
                    reason: `Detected ${volumeSignature.strength} institutional activity at ${zone.center.toFixed(5)}. Volume absorption suggests off-exchange accumulation.`
                });
            }
        }

        return darkPools.slice(0, 5); // Top 5 most significant zones
    }

    /**
     * Detect Iceberg Orders (Hidden Liquidity)
     * Looks for price levels that absorb significant volume without allowing price to pass.
     * @param {Array} candles - Price data
     * @param {Object} orderBook - Snapshot of current Order Book (optional)
     */
    static detectIcebergs(candles, orderBook = null) {
        if (!candles || candles.length < 20) return [];

        const icebergs = [];
        const recentCandles = candles.slice(-20);

        // Group by price levels (rounding to nearest pip/tick)
        const levels = new Map();

        recentCandles.forEach(c => {
            // Check for wicks that touched a level multiple times
            // Logic: High volume on a candle with a large wick = rejection/absorption at that wick level

            const isBullish = c.close > c.open;
            const wickLevel = isBullish ? c.low : c.high; // Identifying the 'defense' level

            // Rounding for grouping (approx 0.01% precision)
            const key = Number(wickLevel.toPrecision(6));

            if (!levels.has(key)) levels.set(key, { volume: 0, touches: 0, price: wickLevel, type: isBullish ? 'BID' : 'ASK' });

            const levelData = levels.get(key);
            levelData.volume += c.volume;
            levelData.touches += 1;
        });

        // Filter for "Iceberg" signature:
        // 1. Multiple touches (>= 3)
        // 2. High aggregated volume (relative to avg)

        const avgVol = recentCandles.reduce((s, c) => s + c.volume, 0) / recentCandles.length;

        for (const [key, data] of levels.entries()) {
            if (data.touches >= 3 && data.volume > avgVol * 5) {
                icebergs.push({
                    price: data.price,
                    type: data.type === 'BID' ? 'BUY_ICEBERG' : 'SELL_ICEBERG',
                    volume: data.volume,
                    strength: (data.volume / avgVol).toFixed(1) + 'x',
                    confidence: 'HIGH'
                });
            }
        }

        return icebergs;
    }

    /**
     * Find price zones with abnormal consolidation (price pegging)
     */
    static _findConsolidationZones(candles) {
        const zones = [];
        const priceMap = new Map();

        // Group candles by price clustering
        for (const candle of candles) {
            const midpoint = (candle.high + candle.low) / 2;
            const bucket = Math.round(midpoint * 10000) / 10000; // 4 decimal clustering

            if (!priceMap.has(bucket)) {
                priceMap.set(bucket, []);
            }
            priceMap.get(bucket).push(candle);
        }

        // Find clusters with 5+ candles (significant consolidation)
        for (const [price, group] of priceMap.entries()) {
            if (group.length >= 5) {
                const totalVolume = group.reduce((sum, c) => sum + (c.volume || 0), 0);
                const avgVolume = totalVolume / group.length;

                zones.push({
                    center: price,
                    high: Math.max(...group.map(c => c.high)),
                    low: Math.min(...group.map(c => c.low)),
                    candles: group.length,
                    volume: totalVolume,
                    avgVolume
                });
            }
        }

        return zones.sort((a, b) => b.volume - a.volume); // Highest volume first
    }

    /**
     * Analyze volume behavior at a consolidation zone
     */
    static _analyzeVolumeSignature(candles, zone) {
        const zoneCandles = candles.filter(c =>
            c.low <= zone.high && c.high >= zone.low
        );

        if (zoneCandles.length === 0) {
            return { isInstitutional: false };
        }

        const avgVolume = candles.reduce((sum, c) => sum + (c.volume || 0), 0) / candles.length;
        const zoneVolume = zoneCandles.reduce((sum, c) => sum + (c.volume || 0), 0);
        const relativeVolume = zoneVolume / (avgVolume * zoneCandles.length);

        // Dark Pool Signature: High volume + Tight range = Absorption
        const avgRange = zoneCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / zoneCandles.length;
        const overallRange = zone.high - zone.low;

        const isAbsorption = relativeVolume > 1.2 && avgRange < overallRange * 0.8;

        return {
            isInstitutional: isAbsorption,
            strength: relativeVolume > 2.0 ? 'STRONG' :
                relativeVolume > 1.5 ? 'MEDIUM' : 'WEAK',
            confidence: isAbsorption ? 'HIGH' : 'MEDIUM',
            relativeVolume: parseFloat(relativeVolume.toFixed(2))
        };
    }

    /**
     * Determine if Dark Pool is acting as support or resistance
     */
    static _determineDarkPoolType(zone, currentPrice) {
        if (zone.center < currentPrice) {
            return 'SUPPORT_WALL'; // Institutional buy orders below
        } else {
            return 'RESISTANCE_WALL'; // Institutional sell orders above
        }
    }

    /**
     * Enhance liquidity pools with Dark Pool intelligence
     * @param {Array} liquidityPools - Standard liquidity pools
     * @param {Array} darkPools - Dark Pool zones
     * @returns {Array} Enhanced pools
     */
    static enhanceLiquidityWithDarkPools(liquidityPools, darkPools) {
        const enhanced = [...liquidityPools];

        for (const darkPool of darkPools) {
            // Check if existing pool overlaps with Dark Pool
            const overlap = enhanced.find(pool =>
                Math.abs(pool.price - darkPool.price) < (darkPool.high - darkPool.low)
            );

            if (overlap) {
                // Upgrade pool strength if Dark Pool confirms it
                overlap.isDarkPoolConfirmed = true;
                overlap.strength = 'INSTITUTIONAL';
                overlap.darkPoolNote = darkPool.reason;
            } else {
                // Add as new strategic pool
                enhanced.push({
                    price: darkPool.price,
                    type: darkPool.type === 'SUPPORT_WALL' ? 'BUY_SIDE' : 'SELL_SIDE',
                    strength: 'HIGH',
                    label: `Dark Pool ${darkPool.type}`,
                    isDarkPool: true,
                    confidence: darkPool.confidence
                });
            }
        }

        return enhanced;
    }
}
