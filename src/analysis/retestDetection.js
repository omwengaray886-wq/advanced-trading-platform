/**
 * Retest Detection Logic (Phase 5)
 * Detects when price revisits a significant zone after a breakout.
 */

export class RetestDetector {
    /**
     * Detect retests in current price action
     * @param {Array} candles - OHLC data
     * @param {Array} zones - Supply/Demand zones or FVGs
     * @returns {Array} - Detected retest events
     */
    static detectRetests(candles, zones) {
        if (!zones || zones.length === 0) return [];

        const retests = [];
        const lastCandle = candles[candles.length - 1];

        zones.forEach(zone => {
            // A retest occurs if:
            // 1. Price was previously away from the zone
            // 2. Price has now entered or touched the zone
            // 3. It's the "first" test after a significant move away (optional rigor)

            const isTouch = lastCandle.high >= (zone.low || zone.bottom) &&
                lastCandle.low <= (zone.high || zone.top);

            if (isTouch) {
                // Check if it was "away" recently
                const recentWindow = candles.slice(-10, -1);
                const wasAway = recentWindow.every(c =>
                    c.high < (zone.low || zone.bottom) || c.low > (zone.high || zone.top)
                );

                if (wasAway) {
                    retests.push({
                        zoneId: zone.id,
                        time: lastCandle.time,
                        price: lastCandle.close,
                        type: 'RETEST',
                        zoneType: zone.type || 'ZONE',
                        direction: lastCandle.close > (zone.high || zone.top) ? 'BULLISH' : 'BEARISH'
                    });
                }
            }
        });

        return retests;
    }
}
