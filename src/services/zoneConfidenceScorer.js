/**
 * Zone Confidence Scorer
 * Provides a live confidence score based on confluence and market alignment.
 */
export class ZoneConfidenceScorer {
    /**
     * Calculate score for a zone
     * @param {Object} zone - The zone being scored
     * @param {Object} marketState - Current market state
     * @param {Array} allAnnotations - All detected annotations for confluence check
     * @returns {number} - Confidence score (0.0 to 1.0)
     */
    static calculateScore(zone, marketState, allAnnotations = []) {
        let score = 0.3; // Base score for detection

        // 1. HTF Alignment (+0.2)
        if (marketState.mtf?.globalBias && zone.allowedDirection) {
            const isAligned = (marketState.mtf.globalBias === 'BULLISH' && zone.allowedDirection === 'LONG') ||
                (marketState.mtf.globalBias === 'BEARISH' && zone.allowedDirection === 'SHORT');
            if (isAligned) score += 0.2;
        }

        // 2. Freshness (+0.15)
        if (zone.state === 'fresh') {
            score += 0.15;
        }

        // 3. Liquidity Sweep Confluence (+0.2)
        const hasSweep = allAnnotations.some(a =>
            a.type === 'LIQUIDITY_SWEEP_ZONE' &&
            this.isPriceOverlapping(zone, a)
        );
        if (hasSweep) score += 0.2;

        // 4. FVG Confluence (+0.15)
        const hasFVG = allAnnotations.some(a =>
            a.type === 'FAIR_VALUE_GAP' &&
            this.isPriceOverlapping(zone, a)
        );
        if (hasFVG) score += 0.15;

        // 5. News Conflict (-0.3)
        if (marketState.highImpactNewsNearby) {
            score -= 0.3;
        }

        return Math.min(Math.max(score, 0), 1.0);
    }

    static isPriceOverlapping(zoneA, zoneB) {
        if (!zoneA.coordinates || !zoneB.coordinates) return false;
        const topA = zoneA.coordinates.top;
        const bottomA = zoneA.coordinates.bottom;
        const topB = zoneB.coordinates.top;
        const bottomB = zoneB.coordinates.bottom;

        return Math.max(bottomA, bottomB) <= Math.min(topA, topB);
    }
}
