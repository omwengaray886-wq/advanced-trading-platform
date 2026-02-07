import { StrategyRegistry } from './StrategyRegistry.js';
import { AssetClassAdapter } from '../services/assetClassAdapter.js';

/**
 * Strategy Selector
 * Selects the most appropriate strategy based on market conditions
 * and professional-grade confluence logic.
 */
export class StrategySelector {
    constructor() {
        this.registry = new StrategyRegistry();
    }

    /**
     * Select multiple strategy setups for current market state
     * @param {Object} marketState - Current market state and analysis
     * @param {string} assetClass - FOREX, CRYPTO, etc.
     * @param {Object} fundamentals - Optional fundamental data
     * @returns {Object} - Grouped setups (long, short, alternatives)
     */
    selectStrategy(marketState, assetClass = 'FOREX', fundamentals = null) {
        const strategies = this.registry.getAllStrategies();
        const trend = marketState.trend.direction; // BULLISH, BEARISH, NEUTRAL

        // 1. Evaluate all strategies for BOTH directions
        const allEvaluations = [];

        strategies.forEach(strategy => {
            ['LONG', 'SHORT'].forEach(direction => {
                const suitcaseDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';
                let suitability = strategy.evaluate(marketState, direction);
                const name = strategy.name;

                // --- BIAS & CONFLUENCE SCALING ---
                const isTrendFollowing = name.match(/Continuation|Order Block|Fair Value Gap|OTE|Fractal|Alignment|Retest/i);
                const isCounterTrend = name.match(/Reversal|Sweep|Fakeout|Double|Divergence|QM|Pattern/i);

                const isTrendAligned = (direction === 'LONG' && trend === 'BULLISH') ||
                    (direction === 'SHORT' && trend === 'BEARISH');

                // A. Trend Alignment Multiplier
                if (isTrendFollowing) {
                    if (isTrendAligned) suitability *= (trend === 'NEUTRAL' ? 1.0 : 1.15);
                    else suitability *= 0.3; // Penalize against-trend continuation
                }

                if (isCounterTrend) {
                    if (!isTrendAligned && trend !== 'NEUTRAL') {
                        // Boost counter-trend setups if trend is overextended
                        if (marketState.trend.strength > 0.8) suitability *= 1.1;
                    }
                }

                // B. Asset Class Adaptation
                suitability = AssetClassAdapter.adaptStrategySuitability(name, assetClass, suitability);

                // C. Fundamental Alignment
                if (fundamentals?.impact?.direction !== 'NEUTRAL') {
                    if (fundamentals.impact.direction === suitcaseDirection) suitability *= 1.25;
                    else suitability *= 0.7;
                }

                // D. Quant-Institutional MTF Confluence
                const globalBias = marketState.mtf?.globalBias || 'NEUTRAL';
                if (globalBias !== 'NEUTRAL') {
                    if (globalBias === suitcaseDirection) {
                        suitability *= 1.3; // Major boost for alignment with 4H/Daily flow
                    } else if (isTrendFollowing) {
                        suitability *= 0.5; // Heavily penalize against-bias continuation
                    }
                }

                // E. Macro Correlation Bias
                const correlation = marketState.correlation;
                if (correlation && correlation.bias !== 'NEUTRAL') {
                    if (correlation.bias === suitcaseDirection) {
                        suitability *= 1.15; // Boost for macro confluence
                    } else {
                        suitability *= 0.85; // Slight penalty for macro conflict
                    }
                }

                // G. Session Intelligence (Institutional Timing)
                const session = marketState.session;
                if (session && session.active) {
                    // Boost specific patterns during their "Prime Time"
                    if (session.killzone) {
                        // All Institutional strategies get a base boost during killzones
                        if (name.match(/Order Block|Sweep|ICT|SMC/i)) suitability *= 1.15;

                        // Specific Timing Confluence
                        if (name.includes('Breakout') && session.killzone === 'LONDON_OPEN') suitability *= 1.4;
                        if (name.includes('Fakeout') && session.killzone === 'LONDON_OPEN') suitability *= 1.4;
                        if (name.includes('Trend Continuation') && (session.killzone === 'NY_OPEN' || session.killzone === 'LONDON_NY_OVERLAP')) suitability *= 1.25;
                    }

                    // Scalp-specific session constraints
                    if (assetClass === 'CRYPTO' && session.active === 'ASIAN' && name.match(/Trend Continuation/i)) {
                        suitability *= 0.8; // Trends often fake out during low-volume Asian hours in crypto
                    }
                }

                // H. SMT Divergence (Institutional Alpha)
                const smt = marketState.smtDivergence;
                if (smt) {
                    const isSmtBullish = smt.type === 'BULLISH';
                    const isSmtBearish = smt.type === 'BEARISH';

                    if ((isSmtBullish && direction === 'LONG') || (isSmtBearish && direction === 'SHORT')) {
                        // SMT validates reversals
                        if (name.match(/Sweep|Fakeout|Reversal|SMT/i)) {
                            suitability *= 1.5; // Massive boost for SMT-validated reversals
                        } else {
                            suitability *= 1.25; // General boost for alignment
                        }
                    } else {
                        // Conflict with SMT
                        suitability *= 0.7;
                    }
                }

                // I. Order Flow Confirmation (Institutional Volume)
                const vol = marketState.volumeAnalysis;
                if (vol && vol.isInstitutional) {
                    // Volume confirms the move
                    suitability *= 1.25; // Base boost for institutional participation

                    // Specific Volume logic
                    if (vol.subType === 'ABSORPTION' && isCounterTrend) {
                        suitability *= 1.2; // Extra boost for absorption-based reversals
                    } else if (vol.subType === 'CLIMAX' && isCounterTrend) {
                        suitability *= 1.3; // Massive boost for volume climax reversals
                    }
                }

                // J. Relative Strength/Alpha leadership (Phase 20)
                const rs = marketState.relativeStrength;
                if (rs && rs.status !== 'NEUTRAL') {
                    if (rs.status === 'LEADER' && direction === 'LONG') {
                        suitability *= 1.3; // Major boost for institutional leaders
                    } else if (rs.status === 'LAGGARD' && direction === 'SHORT') {
                        suitability *= 1.3; // Major boost for weak assets in bear moves
                    } else if (rs.status === 'RECOVERING' && direction === 'LONG') {
                        suitability *= 1.2; // Boost for early rotation strength
                    } else if (rs.status === 'FADING' && direction === 'SHORT') {
                        suitability *= 1.2; // Boost for early rotation weakness
                    } else {
                        suitability *= 0.8; // Stronger penalty for trading against leadership flow
                    }
                }

                // K. Sweep-to-Expansion (STX) Alpha Boost (Phase 15)
                const sweep = marketState.liquiditySweep;
                if (sweep) {
                    if (sweep.type === 'BULLISH_SWEEP' && direction === 'LONG') {
                        suitability *= 1.4; // Massive boost for Bullish STX
                    } else if (sweep.type === 'BEARISH_SWEEP' && direction === 'SHORT') {
                        suitability *= 1.4; // Massive boost for Bearish STX
                    }
                }

                // L. Gap Magnet (FVG) Rebalancing Boost (Phase 16)
                const gap = marketState.relevantGap;
                if (gap) {
                    const isPriceBelowGap = marketState.currentPrice < gap.bottom;
                    const isPriceAboveGap = marketState.currentPrice > gap.top;

                    if (gap.type === 'BULLISH_FVG' && direction === 'LONG' && isPriceBelowGap) {
                        suitability *= 1.25; // Price is drawn up to fill bullish FVG (Magnet)
                    } else if (gap.type === 'BEARISH_FVG' && direction === 'SHORT' && isPriceAboveGap) {
                        suitability *= 1.25; // Price is drawn down to fill bearish FVG (Magnet)
                    }
                }

                // M. News Hazard (Institutional Risk Management)
                if (fundamentals?.proximityAnalysis?.isImminent) {
                    const newsAligned = fundamentals.impact.direction === 'NEUTRAL' ||
                        fundamentals.impact.direction === suitcaseDirection;

                    if (!newsAligned) {
                        suitability *= 0.5; // Heavily penalize technical setups that contradict imminent news
                    } else {
                        suitability *= 0.9; // Slight universal penalty during high-volatility news windows (wait for release)
                    }
                }

                // N. Market Cycle Adaptation (Phase 34: Cycle-Aware Trading)
                const cycle = marketState.cycle;
                const cycleStrength = marketState.cycleStrength || 50;
                const regimeShift = marketState.regimeShift;

                if (cycle) {
                    const isTrendStrategy = name.match(/Continuation|Order Block|Fair Value Gap|OTE|Fractal|Alignment|Retest|Breaker|Mitigation/i);
                    const isReversalStrategy = name.match(/Sweep|Fakeout|Divergence|QM|Double|Head|Exhaustion/i);
                    const isRangeStrategy = name.match(/Range|Support.*Resistance|Breakout|Asian/i);

                    // BULL MARKET: Favor trend-following
                    if (cycle === 'BULL') {
                        if (isTrendStrategy && direction === 'LONG') {
                            const strengthMultiplier = 1 + (cycleStrength / 200); // 1.0 to 1.5x
                            suitability *= strengthMultiplier;
                        } else if (isReversalStrategy && direction === 'SHORT') {
                            suitability *= 0.6; // Heavily penalize counter-trend reversals in bull markets
                        }
                    }
                    // BEAR MARKET: Favor reversals and bearish setups
                    else if (cycle === 'BEAR') {
                        if (isTrendStrategy && direction === 'SHORT') {
                            const strengthMultiplier = 1 + (cycleStrength / 200);
                            suitability *= strengthMultiplier;
                        } else if (isReversalStrategy && direction === 'LONG') {
                            suitability *= 0.6; // Penalize bullish reversals in bear markets
                        } else if (isReversalStrategy && direction === 'SHORT') {
                            suitability *= 1.3; // Boost bearish reversals (catching knives with institutional logic)
                        }
                    }
                    // SIDEWAYS: Favor range strategies and breakouts
                    else if (cycle === 'SIDEWAYS') {
                        if (isRangeStrategy) {
                            const strengthMultiplier = 1 + (cycleStrength / 150); // Boost for tight ranges
                            suitability *= strengthMultiplier;
                        } else if (isTrendStrategy) {
                            suitability *= 0.7; // Trends often fail in ranging markets
                        }
                    }

                    // Universal penalty during regime shifts (uncertainty)
                    if (regimeShift) {
                        suitability *= 0.75; // 25% reduction during cycle transitions
                    }
                }

                // O. Sentiment Confluence (Phase 35)
                const sentiment = marketState.sentiment;
                if (sentiment && sentiment.confidence > 0.5) {
                    if (sentiment.bias === 'CONTRARIAN_BULLISH' && direction === 'LONG') {
                        suitability *= 1.3; // Buy extreme fear
                    } else if (sentiment.bias === 'CONTRARIAN_BEARISH' && direction === 'SHORT') {
                        suitability *= 1.3; // Sell extreme greed
                    } else if (sentiment.bias.includes('NEUTRAL') && sentiment.score > 50 && direction === 'SHORT') {
                        suitability *= 1.15; // Moderate greed = slight bearish edge
                    } else if (sentiment.bias.includes('NEUTRAL') && sentiment.score < -50 && direction === 'LONG') {
                        suitability *= 1.15; // Moderate fear = slight bullish edge
                    }
                }

                // P. On-Chain Confluence (Phase 35 - Crypto only)
                const onChain = marketState.onChain;
                if (onChain && onChain.confidence > 0.6) {
                    if (onChain.bias === 'BULLISH' && direction === 'LONG') {
                        suitability *= 1.35; // Major exchange outflow = supply shock
                    } else if (onChain.bias === 'BEARISH' && direction === 'SHORT') {
                        suitability *= 1.25; // Major exchange inflow = sell pressure
                    } else if (onChain.bias === 'BULLISH' && direction === 'SHORT') {
                        suitability *= 0.7; // Don't fight on-chain accumulation
                    } else if (onChain.bias === 'BEARISH' && direction === 'LONG') {
                        suitability *= 0.7; // Don't fight on-chain distribution
                    }
                }

                // Q. Options Flow Confluence (Phase 35 - Equities only)
                const optionsFlow = marketState.optionsFlow;
                if (optionsFlow && optionsFlow.confidence > 0.6) {
                    if (optionsFlow.flowBias === 'BULLISH' && direction === 'LONG') {
                        suitability *= 1.3; // Smart money call buying
                    } else if (optionsFlow.flowBias === 'BEARISH' && direction === 'SHORT') {
                        suitability *= 1.25; // Smart money put buying
                    }
                }

                // R. Seasonality Edge (Phase 35)
                const seasonality = marketState.seasonality;
                if (seasonality && seasonality.confidence > 0.65) {
                    if (seasonality.combinedBias === 'BULLISH' && direction === 'LONG') {
                        suitability *= 1.2; // Historical monthly/weekly edge
                    } else if (seasonality.combinedBias === 'BEARISH' && direction === 'SHORT') {
                        suitability *= 1.2;
                    } else if (seasonality.combinedBias === 'BULLISH' && direction === 'SHORT') {
                        suitability *= 0.8; // Against seasonal trend
                    } else if (seasonality.combinedBias === 'BEARISH' && direction === 'LONG') {
                        suitability *= 0.8;
                    }
                }

                // S. Volume Profile & POC Confluence (Phase 55)
                const vp = marketState.volumeProfile;
                if (vp) {
                    const price = marketState.currentPrice;
                    const isInsideVA = price >= vp.val && price <= vp.vah;
                    const isNearPOC = Math.abs(price - vp.poc) / vp.poc < 0.002;
                    const isPremium = price > vp.vah;
                    const isDiscount = price < vp.val;

                    if (isNearPOC) {
                        suitability *= 1.2; // POC is high-interest institutional fair value
                    }

                    if (direction === 'LONG') {
                        if (isDiscount) suitability *= 1.25; // Buying in discount (below VAL)
                        if (isPremium && !isTrendFollowing) suitability *= 0.7; // Avoid counter-trend longs in premium
                    } else {
                        if (isPremium) suitability *= 1.25; // Selling in premium (above VAH)
                        if (isDiscount && !isTrendFollowing) suitability *= 0.7; // Avoid counter-trend shorts in discount
                    }

                    // nPOC Magnet Alignment
                    const nPOCs = marketState.nPOCs || [];
                    const targetingNPOC = nPOCs.some(npoc => {
                        if (direction === 'LONG' && npoc.price > price) return true;
                        if (direction === 'SHORT' && npoc.price < price) return true;
                        return false;
                    });

                    if (targetingNPOC) suitability *= 1.15; // Setup is trading towards an institutional magnet
                }

                const finalScore = Math.min(suitability * (0.95 + Math.random() * 0.1), 1.0);


                allEvaluations.push({
                    strategy,
                    direction,
                    suitability: finalScore,
                    isCounterTrend
                });
            });
        });

        // 2. Extract Top 2 Longs and Top 2 Shorts
        const longCandidates = allEvaluations
            .filter(e => e.direction === 'LONG' && e.suitability > 0.35)
            .sort((a, b) => b.suitability - a.suitability);

        const shortCandidates = allEvaluations
            .filter(e => e.direction === 'SHORT' && e.suitability > 0.35)
            .sort((a, b) => b.suitability - a.suitability);

        return {
            long: longCandidates.slice(0, 2),
            short: shortCandidates.slice(0, 2),
            all: [...longCandidates.slice(0, 2), ...shortCandidates.slice(0, 2)].sort((a, b) => b.suitability - a.suitability)
        };
    }

    /**
     * Get strategy by name (for manual override)
     */
    getStrategy(name) {
        return this.registry.getStrategyByName(name);
    }
}
