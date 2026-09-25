/**
 * MTF POI Processor
 * Handles the projection and alignment analysis of Higher Timeframe (HTF) Points of Interest.
 */
export class MTFPOIProcessor {
    /**
     * Process HTF zones and map them to the current timeframe
     * @param {Object} currentAnalysis - Analysis of the trading timeframe
     * @param {Object} mtfAnalysis - Analysis objects for higher timeframes { '4H': analysis, '1D': analysis }
     * @returns {Object} - Processed MTF data including projected zones and alignment status
     */
    static processMTF(currentAnalysis, mtfAnalysis) {
        const results = {
            htfZones: [],
            alignments: [],
            biasAlignment: false
        };

        if (!mtfAnalysis) return results;

        const currentZones = currentAnalysis.setups?.[0]?.annotations || [];
        const currentPrice = currentAnalysis.marketState.currentPrice;

        Object.entries(mtfAnalysis).forEach(([tf, htfData]) => {
            if (!htfData || !htfData.setups) return;

            // 1. Extract HTF Zones (Order Blocks, S/D, SR)
            const zones = this.extractSignficantZones(htfData, tf);
            results.htfZones.push(...zones);

            // 2. Check for Nesting / Alignment
            zones.forEach(htfZone => {
                const overlappingLtfZones = currentZones.filter(ltfZone =>
                    this.checkOverlap(ltfZone, htfZone)
                );

                if (overlappingLtfZones.length > 0) {
                    results.alignments.push({
                        htfZone,
                        ltfZones: overlappingLtfZones,
                        tf,
                        strength: this.calculateAlignmentStrength(htfZone, overlappingLtfZones)
                    });
                }
            });
        });

        // 3. Bias Alignment Check
        results.biasAlignment = this.checkBiasAlignment(currentAnalysis, mtfAnalysis);

        return results;
    }

    /**
     * Extract significant zones from HTF analysis
     */
    static extractSignficantZones(analysis, tf) {
        // Look for annotations in the setups or marketState
        const annotations = analysis.setups?.[0]?.annotations || [];

        return annotations
            .filter(a => ['ORDER_BLOCK', 'SUPPLY_DEMAND_ZONE', 'SR_ZONE', 'LIQUIDITY_ZONE'].includes(a.type))
            .map(a => ({
                ...a,
                htf: tf,
                originalId: a.id,
                id: `htf-${tf}-${a.id}`,
                isHTF: true
            }));
    }

    /**
     * Check if an LTF zone is nested within or significantly overlaps an HTF zone
     */
    static checkOverlap(ltf, htf) {
        // Simple price range overlap check
        if (!ltf.coordinates || !htf.coordinates) return false;

        const ltfTop = ltf.coordinates.top || ltf.coordinates.price;
        const ltfBottom = ltf.coordinates.bottom || ltf.coordinates.price;
        const htfTop = htf.coordinates.top || htf.coordinates.price;
        const htfBottom = htf.coordinates.bottom || htf.coordinates.price;

        const overlapTop = Math.min(ltfTop, htfTop);
        const overlapBottom = Math.max(ltfBottom, htfBottom);

        return overlapTop > overlapBottom;
    }

    /**
     * Calculate how strong the alignment is
     */
    static calculateAlignmentStrength(htf, ltfs) {
        // More LTF zones inside an HTF zone = stronger alignment
        let score = 0.5;
        score += (ltfs.length * 0.1);

        // Bonus if it's a confluence zone or order block
        if (htf.type === 'CONFLUENCE_ZONE') score += 0.2;
        if (htf.type === 'ORDER_BLOCK') score += 0.15;

        return Math.min(score, 1.0);
    }

    /**
     * Check if technical biases match across timeframes
     */
    static checkBiasAlignment(current, mtf) {
        const currentBias = current.marketState.trend.direction;

        return Object.values(mtf).every(htf => {
            if (!htf || !htf.marketState) return true;
            return htf.marketState.trend.direction === currentBias;
        });
    }
}
