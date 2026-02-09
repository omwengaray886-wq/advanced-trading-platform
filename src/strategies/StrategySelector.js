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
     * Helper to normalize directional strings
     * @private
     */
    static _normalizeDirection(d) {
        if (!d) return 'NEUTRAL';
        const upper = d.toUpperCase();
        if (upper === 'LONG' || upper === 'BULLISH' || upper === 'UP') return 'BULLISH';
        if (upper === 'SHORT' || upper === 'BEARISH' || upper === 'DOWN') return 'BEARISH';
        return 'NEUTRAL';
    }

    /**
     * Select multiple strategy setups for current market state
     * @param {Object} marketState - Current market state and analysis
     * @param {string} assetClass - FOREX, CRYPTO, etc.
     * @param {Object} fundamentals - Optional fundamental data
     * @returns {Object} - Grouped setups (long, short, alternatives)
     */
    selectStrategy(marketState, assetClass = 'FOREX', fundamentals = null, perfWeights = {}) {
        const strategies = this.registry.getAllStrategies();
        const trend = this.constructor._normalizeDirection(marketState.trend.direction);

        // 1. Evaluate all strategies for BOTH directions
        const allEvaluations = [];

        strategies.forEach(strategy => {
            ['LONG', 'SHORT'].forEach(direction => {
                const normalizedDir = this.constructor._normalizeDirection(direction);
                let suitability = strategy.evaluate(marketState, direction);
                const name = strategy.name;

                // --- BIAS & CONFLUENCE SCALING ---
                const isTrendFollowing = name.match(/Continuation|Order Block|Fair Value Gap|OTE|Fractal|Alignment|Retest/i);
                const isCounterTrend = name.match(/Reversal|Sweep|Fakeout|Double|Divergence|QM|Pattern/i);

                const isTrendAligned = normalizedDir === trend;

                // A. Trend Alignment Multiplier
                if (isTrendFollowing) {
                    if (isTrendAligned && trend !== 'NEUTRAL') suitability *= 1.15;
                    else if (!isTrendAligned && trend !== 'NEUTRAL') suitability *= 0.3;
                }

                if (isCounterTrend) {
                    if (!isTrendAligned && trend !== 'NEUTRAL') {
                        if (marketState.trend.strength > 0.8) suitability *= 1.1;
                    }
                }

                // B. Asset Class Adaptation
                suitability = AssetClassAdapter.adaptStrategySuitability(name, assetClass, suitability);

                // C. Fundamental Alignment
                const fundBias = this.constructor._normalizeDirection(fundamentals?.impact?.direction);
                if (fundBias !== 'NEUTRAL') {
                    if (fundBias === normalizedDir) suitability *= 1.25;
                    else suitability *= 0.7;
                }

                // D. Quant-Institutional MTF Confluence
                const globalBias = this.constructor._normalizeDirection(marketState.mtf?.globalBias);
                if (globalBias !== 'NEUTRAL') {
                    if (globalBias === normalizedDir) {
                        suitability *= 1.3;
                    } else if (isTrendFollowing) {
                        suitability *= 0.5;
                    }
                }

                // E. Macro Correlation Bias
                const correlation = marketState.macroSentiment;
                if (correlation && correlation.bias !== 'NEUTRAL') {
                    const correlationBias = this.constructor._normalizeDirection(correlation.bias);
                    if (correlationBias === normalizedDir) {
                        suitability *= 1.15;
                    } else {
                        suitability *= 0.85;
                    }
                }

                // G. Session Intelligence
                const session = marketState.session;
                if (session && session.active) {
                    if (session.killzone) {
                        if (name.match(/Order Block|Sweep|ICT|SMC/i)) suitability *= 1.15;
                        if (name.includes('Breakout') && session.killzone === 'LONDON_OPEN') suitability *= 1.4;
                        if (name.includes('Fakeout') && session.killzone === 'LONDON_OPEN') suitability *= 1.4;
                        if (name.includes('Trend Continuation') && (session.killzone === 'NY_OPEN' || session.killzone === 'LONDON_NY_OVERLAP')) suitability *= 1.25;
                    }
                    if (assetClass === 'CRYPTO' && session.active === 'ASIAN' && name.match(/Trend Continuation/i)) {
                        suitability *= 0.8;
                    }
                }

                // H. SMT Divergence
                const smt = marketState.smtDivergence;
                if (smt) {
                    const smtType = this.constructor._normalizeDirection(smt.type);
                    if (smtType === normalizedDir) {
                        if (name.match(/Sweep|Fakeout|Reversal|SMT/i)) suitability *= 1.5;
                        else suitability *= 1.25;
                    } else {
                        suitability *= 0.7;
                    }
                }

                // I. Order Flow Confirmation
                const vol = marketState.volumeAnalysis;
                if (vol && vol.isInstitutional) {
                    suitability *= 1.25;
                    if (vol.subType === 'ABSORPTION' && isCounterTrend) {
                        suitability *= 1.2;
                    } else if (vol.subType === 'CLIMAX' && isCounterTrend) {
                        suitability *= 1.3;
                    }
                }

                // J. Relative Strength/Alpha leadership
                const rs = marketState.relativeStrength;
                if (rs && rs.status !== 'NEUTRAL') {
                    if (rs.status === 'LEADER' && normalizedDir === 'BULLISH') {
                        suitability *= 1.3;
                    } else if (rs.status === 'LAGGARD' && normalizedDir === 'BEARISH') {
                        suitability *= 1.3;
                    } else if (rs.status === 'RECOVERING' && normalizedDir === 'BULLISH') {
                        suitability *= 1.2;
                    } else if (rs.status === 'FADING' && normalizedDir === 'BEARISH') {
                        suitability *= 1.2;
                    } else {
                        suitability *= 0.8;
                    }
                }

                // K. Sweep-to-Expansion (STX) Alpha Boost
                const sweep = marketState.liquiditySweep;
                if (sweep) {
                    const sweepDir = this.constructor._normalizeDirection(sweep.type.split('_')[0]); // BULLISH_SWEEP -> BULLISH
                    if (sweepDir === normalizedDir) {
                        suitability *= 1.4;
                    }
                }

                // L. Market Obligation (Magnet Theory)
                const primaryMagnet = marketState.primaryMagnet || marketState.obligations?.primaryObligation;
                if (primaryMagnet) {
                    const magnetDir = primaryMagnet.price > marketState.currentPrice ? 'BULLISH' : 'BEARISH';
                    if (magnetDir === normalizedDir) {
                        suitability *= 1 + (primaryMagnet.urgency / 200);
                    } else if (primaryMagnet.urgency > 70) {
                        suitability *= 0.4;
                    }
                }

                // M. News Hazard
                if (fundamentals?.proximityAnalysis?.isImminent) {
                    const newsAligned = fundBias === 'NEUTRAL' || fundBias === normalizedDir;
                    if (!newsAligned) suitability *= 0.5;
                    else suitability *= 0.9;
                }

                // N. Institutional AMD Cycle Adaptation
                const amdCycle = marketState.amdCycle;
                if (amdCycle && amdCycle.phase !== 'UNKNOWN') {
                    const cycleDir = this.constructor._normalizeDirection(amdCycle.direction);
                    const isTrendStrategy = name.match(/Continuation|Order Block|Fair Value Gap|OTE|Fractal|Alignment|Retest|Breaker|Mitigation/i);
                    const isReversalStrategy = name.match(/Sweep|Fakeout|Divergence|QM|Double|Head|Exhaustion|SMT/i);

                    if (amdCycle.phase === 'MANIPULATION') {
                        if (cycleDir !== normalizedDir) suitability *= 1.4;
                        else if (isTrendStrategy) suitability *= 0.2;
                    } else if (amdCycle.phase === 'DISTRIBUTION') {
                        if (cycleDir === normalizedDir && isTrendStrategy) suitability *= 1.35;
                        else if (cycleDir !== normalizedDir && isReversalStrategy) suitability *= 0.3;
                    } else if (amdCycle.phase === 'ACCUMULATION') {
                        if (isTrendStrategy) suitability *= 0.6;
                    }
                }

                // O. Sentiment Confluence
                const sentiment = marketState.sentiment;
                if (sentiment && sentiment.confidence > 0.5) {
                    const sentBias = this.constructor._normalizeDirection(sentiment.bias.replace('CONTRARIAN_', ''));
                    if (sentiment.bias.startsWith('CONTRARIAN_')) {
                        if (sentBias === normalizedDir) suitability *= 1.3;
                    } else if (sentiment.bias.includes('NEUTRAL')) {
                        if (sentiment.score > 50 && normalizedDir === 'BEARISH') suitability *= 1.15;
                        else if (sentiment.score < -50 && normalizedDir === 'BULLISH') suitability *= 1.15;
                    }
                }

                // P. On-Chain Confluence
                const onChain = marketState.onChain;
                if (onChain && onChain.confidence > 0.6) {
                    const onChainBias = this.constructor._normalizeDirection(onChain.bias);
                    if (onChainBias === normalizedDir) suitability *= 1.3;
                    else suitability *= 0.7;
                }

                // Q. Options Flow Confluence
                const optionsFlow = marketState.optionsFlow;
                if (optionsFlow && optionsFlow.confidence > 0.6) {
                    const optionsBias = this.constructor._normalizeDirection(optionsFlow.flowBias);
                    if (optionsBias === normalizedDir) suitability *= 1.3;
                }

                // R. Seasonality Edge
                const seasonality = marketState.seasonality;
                if (seasonality && seasonality.confidence > 0.65) {
                    const seasonalBias = this.constructor._normalizeDirection(seasonality.combinedBias);
                    if (seasonalBias === normalizedDir) suitability *= 1.2;
                    else suitability *= 0.8;
                }

                // S. Volume Profile & POC Confluence
                const vp = marketState.volumeProfile;
                if (vp) {
                    const price = marketState.currentPrice;
                    const isNearPOC = Math.abs(price - vp.poc) / vp.poc < 0.002;
                    const isPremium = price > vp.vah;
                    const isDiscount = price < vp.val;

                    if (isNearPOC) suitability *= 1.2;
                    if (normalizedDir === 'BULLISH' && isDiscount) suitability *= 1.25;
                    else if (normalizedDir === 'BEARISH' && isPremium) suitability *= 1.25;
                    else if (!isTrendFollowing) suitability *= 0.7;

                    const nPOCs = marketState.nPOCs || [];
                    const targetingNPOC = nPOCs.some(npoc => (normalizedDir === 'BULLISH' && npoc.price > price) || (normalizedDir === 'BEARISH' && npoc.price < price));
                    if (targetingNPOC) suitability *= 1.15;
                }

                // T. Strategy Performance
                const strategyWeight = (perfWeights && perfWeights[name]) ? perfWeights[name] : 1.0;
                suitability *= strategyWeight;

                allEvaluations.push({
                    strategy,
                    direction,
                    suitability: Math.min(suitability, 1.0),
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
