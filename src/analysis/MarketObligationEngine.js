/**
 * Market Obligation Engine
 * 
 * "What does the market NEED to do next?"
 * Tracks unfinished business: Liquidity Pools, Unmitigated Imbalances, and Inefficiencies.
 * Enforces the "Magnet Theory" - Price MUST revisit these levels.
 */

export class MarketObligationEngine {

    /**
     * Identify and Score Market Obligations
     * @param {Object} marketState - Current market state (liquidity, FVG, structure)
     * @param {Array} candles - Recent price action
     * @returns {Object} { obligations: [], primaryObligation: Object|null }
     */
    static detectObligations(marketState, candles) {
        if (!marketState) return { obligations: [], primaryObligation: null, state: 'NO_OBLIGATION' };

        const currentPrice = marketState.currentPrice;
        const obligations = [];

        // 1. Untaken Liquidity Pools (The Primary Magnets)
        const pools = marketState.liquidityPools || [];
        pools.forEach(pool => {
            // Only consider pools that haven't been swept yet
            if (!pool.swept) {
                const score = this.scoreLiquidityVulnerability(pool, currentPrice, marketState);

                // Strong filter: Only highly attractive pools count as "Obligations"
                if (score > 55) {
                    obligations.push({
                        type: pool.type === 'BUY_SIDE' ? 'BUY_SIDE_LIQUIDITY' : 'SELL_SIDE_LIQUIDITY',
                        price: pool.price,
                        urgency: score, // 0-100
                        description: `Untaken ${pool.type} Liquidity at ${pool.price}${pool.isEqualHighs || pool.isEqualLows ? ' (Engineered)' : ''}`,
                        source: pool
                    });
                }
            }
        });

        // 2. Unmitigated Fair Value Gaps (Inefficiencies)
        const fvgs = marketState.fvgs || [];
        fvgs.forEach(fvg => {
            if (!fvg.mitigated) {
                // Calculate distance factor
                const distPercent = Math.abs(currentPrice - fvg.price) / currentPrice * 100;
                let urgency = 40; // Lower baseline for gaps

                // Closer gaps are more urgent magnets
                if (distPercent < 0.5) urgency += 30; // Very close
                else if (distPercent < 1.5) urgency += 10;

                // Freshness vs Time Pressure boost
                const ageInCandles = candles.length - fvg.index;
                if (ageInCandles < 20) urgency += 15; // Fresh imbalance
                else if (ageInCandles > 100) urgency += 10; // "Old business" pressure - market effectively magnetized to resolve long-standing gaps

                // Structural Confluence (Only care if gap aligns with trend)
                const trend = marketState.trend?.direction || 'NEUTRAL';
                const isAligned = (trend === 'BULLISH' && fvg.type === 'BULLISH_FVG') ||
                    (trend === 'BEARISH' && fvg.type === 'BEARISH_FVG');

                if (isAligned) urgency += 15;

                if (urgency > 50) {
                    obligations.push({
                        type: 'IMBALANCE_REPAIR',
                        price: fvg.price,
                        urgency: Math.min(urgency, 90),
                        description: `Unmitigated ${fvg.type} at ${fvg.price}`,
                        source: fvg
                    });
                }
            }
        });

        // --- SELECTION LOGIC ---
        // Sort by Urgency (Highest First)
        obligations.sort((a, b) => b.urgency - a.urgency);

        // Filter: If max urgency is too low, Market has "No Obligation"
        const primaryObligation = obligations.length > 0 ? obligations[0] : null;

        // Strict Threshold: Market is only "OBLIGATED" if there's a highly compelling target
        const state = primaryObligation && primaryObligation.urgency > 80 ? 'OBLIGATED' : 'FREE_ROAMING';

        return {
            obligations,
            primaryObligation,
            state
        };
    }

    /**
     * Score Liquidity Vulnerability (Layer 2)
     * "How easy/attractive is this pool to take?"
     */
    static scoreLiquidityVulnerability(pool, currentPrice, marketState) {
        let score = 50; // Base Score

        // 1. Distance Factor (Closer = Higher Score)
        const distPercent = Math.abs(currentPrice - pool.price) / currentPrice * 100;
        if (distPercent < 0.3) score += 35;       // Immediate proximity (Magnet lock)
        else if (distPercent < 0.8) score += 20;
        else if (distPercent < 2.0) score += 10;
        else if (distPercent > 5.0) score -= 25;  // Too far

        // 2. Structural Significance (Phase 75 Upgrade)
        // HTF levels and Session Highs/Lows are primary institutional targets
        if (pool.isHTF) score += 25;
        if (pool.isSessionLevel) score += 20;
        if (pool.isPreviousDayLevel) score += 15;

        // 3. Engineering (Equal Highs/Lows are engineered inducements)
        if (pool.isEqualHighs || pool.isEqualLows) {
            score += 45;
        }

        // 4. Symmetry Detection
        const lastSweep = marketState.liquiditySweep;
        if (lastSweep) {
            const isOppositeSide = (lastSweep.side === 'ABOVE' && pool.type === 'SELL_SIDE') ||
                (lastSweep.side === 'BELOW' && pool.type === 'BUY_SIDE');
            if (isOppositeSide) {
                score += 30; // Magnetized to maintain symmetry
            }
        }

        // 5. Trend & Momentum Compatibility
        const trend = marketState.trend?.direction || 'NEUTRAL';
        const isWithTrend = (trend === 'BULLISH' && pool.type === 'BUY_SIDE') ||
            (trend === 'BEARISH' && pool.type === 'SELL_SIDE');

        if (isWithTrend) score += 15;
        else score -= 10;

        // 6. Volume Profile Confluence
        const hasCluster = marketState.nPOCs?.some(npoc => Math.abs(npoc.price - pool.price) / pool.price < 0.0005) ||
            marketState.hvns?.some(hvn => Math.abs(hvn.price - pool.price) / pool.price < 0.0005);

        if (hasCluster) score += 25;

        return Math.min(Math.max(score, 0), 100);
    }

    /**
     * Check if the market is effectively "Done" for the session
     * (Layer 6: Auto-Removal condition)
     */
    static checkSessionExhaustion(marketState) {
        // 1. Time Check: End of Session (e.g., > 16:00 NY)
        // This requires a localized time or session info in marketState
        if (marketState.session && marketState.session.name === 'POST_MARKET') return true;

        // 2. ADR Exhaustion (Phase 55)
        // If market has moved > 1.5x ADR, it's likely exhausted for the day
        if (marketState.adr && marketState.dailyRange) {
            const expansion = marketState.dailyRange / marketState.adr;
            if (expansion > 1.5) return true;
        }

        return false;
    }
}
