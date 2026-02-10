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
        if (distPercent < 0.5) score += 25;       // Immediate proximity
        else if (distPercent < 2.0) score += 10;
        else if (distPercent > 5.0) score -= 20;  // Too far

        // 2. Engineering (Equal Highs/Lows are engineered inducements)
        // CRITICAL WEIGHT: These are primary institutional targets
        if (pool.isEqualHighs || pool.isEqualLows) {
            score += 45; // Boosted from 35 for Phase 73
        }

        // 2.2 Symmetry Detection (Phase 73 Upgrade)
        // If a sweep has occurred on the opposite side, this side becomes a magnetized target.
        const lastSweep = marketState.liquiditySweep;
        if (lastSweep) {
            const isOppositeSide = (lastSweep.side === 'ABOVE' && pool.type === 'SELL_SIDE') ||
                (lastSweep.side === 'BELOW' && pool.type === 'BUY_SIDE');
            if (isOppositeSide) {
                // If top was swept, bottom is a 'Market Obligation' to maintain symmetry
                score += 30;
            }
        }

        // 2.5 Time Pressure (Aging)
        // Pools that persist for many candles become "Obvious" magnets
        const age = pool.age || 0;
        if (age > 200) score += 15;
        else if (age > 50) score += 5;

        // 3. Trend Compatibility (Easier to take liquidity WITH trend)
        const trend = marketState.trend?.direction || 'NEUTRAL';
        const isWithTrend = (trend === 'BULLISH' && pool.type === 'BUY_SIDE') ||
            (trend === 'BEARISH' && pool.type === 'SELL_SIDE');

        if (isWithTrend) score += 15;
        else score -= 15; // Harder to take counter-trend liquidity without a reversal setup

        // 4. Volume Profile / Cluster Confluence (Layer 3)
        // If a pool sits right at a Naked POC or High Volume Node, its magnet strength is massive
        const hasCluster = marketState.nPOCs?.some(npoc => Math.abs(npoc.price - pool.price) / pool.price < 0.001) ||
            marketState.hvns?.some(hvn => Math.abs(hvn.price - pool.price) / pool.price < 0.001);

        if (hasCluster) score += 20;

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
