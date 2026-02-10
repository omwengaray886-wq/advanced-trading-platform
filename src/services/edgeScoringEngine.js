import { normalizeDirection, isInversePair } from '../utils/normalization.js';
import { SentimentEngine } from './SentimentEngine.js';
import { OrderBookEngine } from './OrderBookEngine.js';

/**
 * Edge Scoring Engine (Phase 51)
 * 
 * Calculates a normalized 1-10 score for a setup based on 
 * institutional factors, R:R, and probabilistic alignment.
 */

export class EdgeScoringEngine {
    // Local helper removed in favor of shared utility

    /**
     * Calculate Edge Score
     * @param {Object} setup - Trade setup
     * @param {Object} marketState - Current market state
     * @param {Object} bayesianStats - Bayesian stats for this strategy
     * @param {string} symbol - Current symbol
     * @returns {Object} Score and breakdown
     */
    static calculateScore(setup, marketState, bayesianStats, symbol = 'BTCUSDT') {
        if (!setup) return { score: 0, breakdown: { positives: [], risks: ['No active setup'] } };

        let totalPoints = 0;
        const positives = [];
        const risks = [];

        const setupDir = normalizeDirection(setup.direction);

        // 1. Bayesian Strategy Reliability (up to 40 points)
        const reliability = (bayesianStats?.probability || 0.5) * 100;

        if (reliability >= 80) {
            totalPoints += 40;
            positives.push(`Premium Strategy Reliability (${reliability.toFixed(0)}%)`);
        } else if (reliability >= 65) {
            totalPoints += 25;
            positives.push(`Strong Strategy Reliability (${reliability.toFixed(0)}%)`);
        } else if (reliability < 50) {
            risks.push(`Low Strategy Reliability (${reliability.toFixed(0)}%)`);
        }

        // 2. R:R Feasibility (up to 20 points)
        const rr = setup.rr || 0;
        if (rr >= 3) {
            totalPoints += 20;
            positives.push(`High yield R:R (${rr.toFixed(1)})`);
        } else if (rr >= 2) {
            totalPoints += 15;
            positives.push(`Standard R:R (${rr.toFixed(1)})`);
        } else if (rr > 0) {
            totalPoints += 5;
            risks.push(`Low R:R yield (${rr.toFixed(1)})`);
        }

        // 3. Timeframe Stacking (up to 25 points)
        const globalBias = normalizeDirection(marketState.mtf?.globalBias);
        const mtfAligned = globalBias === setupDir;

        if (globalBias === 'NEUTRAL') {
            totalPoints += 5;
        } else if (mtfAligned) {
            totalPoints += 25;
            positives.push('HTF Context alignment (1D/4H)');
        } else {
            totalPoints -= 15;
            risks.push('HTF Bias conflict');
        }

        // 4. Institutional Confluence (up to 50 points)
        const hasInstitutionalVolume = marketState.volumeAnalysis?.isInstitutional;
        const hasSMT = marketState.divergences?.length > 0;
        const inKillzone = !!marketState.session?.killzone;
        const targetsObligation = marketState.obligations?.primaryObligation?.urgency > 70;

        if (hasInstitutionalVolume) {
            totalPoints += 10;
            positives.push('Institutional volume participation');
        }
        if (hasSMT) {
            const smtStrength = marketState.smtConfluence || 50;
            const smtBonus = smtStrength >= 80 ? 25 : 15;
            totalPoints += smtBonus;
            positives.push(`Inter-market divergence (SMT) ${smtStrength >= 80 ? 'PREMIUM' : 'DETECTED'}`);
        }
        if (inKillzone) {
            const hour = marketState.session?.hour ?? new Date().getUTCHours();
            const isPowerHour = (hour === 8 || hour === 9 || hour === 13 || hour === 14);
            totalPoints += isPowerHour ? 20 : 10;
            positives.push(`Killzone alignment (${marketState.session.killzone}${isPowerHour ? ' - POWER HOUR' : ''})`);
        }
        if (targetsObligation) {
            totalPoints += 15;
            positives.push('Primary obligation target (Magnet theory)');
        }

        // 5. Market Obligation Alignment (Phase 52)
        const primaryMagnet = marketState.obligations?.primaryObligation;
        if (primaryMagnet && primaryMagnet.urgency > 80) {
            const magnetDir = primaryMagnet.price > marketState.currentPrice ? 'BULLISH' : 'BEARISH';
            if (normalizeDirection(magnetDir) !== setupDir) {
                totalPoints -= 40;
                risks.push(`CRITICAL: Trading against Major Magnet (${primaryMagnet.type})`);
            } else {
                totalPoints += 15;
                positives.push(`Magnet Acceleration (${primaryMagnet.type})`);
            }
        }

        // 6. Volume Profile & DOM Confluence
        const vp = marketState.volumeProfile;
        const entryPrice = setup.entryZone?.optimal || marketState.currentPrice;
        const hasDOMWall = marketState.orderBook?.walls?.some(w =>
            Math.abs(w.price - entryPrice) / entryPrice < 0.001
        );

        if (vp) {
            const isNearPOC = Math.abs(marketState.currentPrice - vp.poc) / vp.poc < 0.002;
            const hasNPOCMagnet = marketState.nPOCs?.length > 0;

            if (isNearPOC) {
                totalPoints += 5;
                positives.push('Price testing High-Volume POC');
            }
            if (hasNPOCMagnet) {
                totalPoints += 5;
                positives.push('Institutional nPOC magnet detected');
            }
        }
        if (hasDOMWall) {
            totalPoints += 5;
            positives.push('Entry supported by DOM Liquidity Wall');
        }

        // 6. Cross-Asset Consensus (Macro Alignment)
        const macroAlignment = marketState.macroSentiment;
        if (macroAlignment && macroAlignment.bias && macroAlignment.bias !== 'NEUTRAL') {
            const macroBias = normalizeDirection(macroAlignment.bias);
            const isInverse = isInversePair(symbol, 'DXY');

            let isAligned = macroBias === setupDir;
            if (isInverse) isAligned = (macroBias !== setupDir && macroBias !== 'NEUTRAL');

            const isVolatile = marketState.regime === 'VOLATILE';
            const weightMultiplier = isVolatile ? 2.0 : 1.0;

            if (isAligned) {
                totalPoints += (15 * weightMultiplier);
                positives.push(`Macro Correlation alignment (${macroAlignment.bias}${isInverse ? ' - Inverse' : ''})${isVolatile ? ' [CRITICAL IN VOLATILITY]' : ''}`);
            } else {
                totalPoints -= (15 * weightMultiplier);
                risks.push(`Macro Conflict: Benchmark is ${macroAlignment.bias}${isInverse ? ' (Inverse)' : ''}${isVolatile ? ' [HIGH RISK IN VOLATILITY]' : ''}`);
            }
        }

        // 7. Order Book Depth & Walls
        const depthAnalysis = marketState.orderBookDepth || marketState.orderBook;
        if (depthAnalysis) {
            const depthBonus = OrderBookEngine.getDepthAlignmentBonus(setup.direction, depthAnalysis);
            if (depthBonus > 0) {
                totalPoints += (depthBonus * 1.5);
                positives.push('Institutional depth pressure alignment');
            }
        }

        // News Penalty
        if (marketState.activeShock?.severity === 'HIGH') {
            totalPoints -= 35;
            risks.push(`High-impact news hazard (${marketState.activeShock.event})`);
        }

        // Trap Zone Penalty
        if (marketState.trapZones && (marketState.trapZones.warning || marketState.trapZones.count > 0)) {
            totalPoints -= 30;
            risks.push(`Trap Zone Detected: ${marketState.trapZones.warning || 'Pattern Failure'}`);
        }

        // 8. AMD Cycle Calibration
        const cycle = marketState.marketCycle || marketState.amdCycle;
        if (cycle && cycle.phase !== 'UNKNOWN') {
            const cycleDir = normalizeDirection(cycle.direction || cycle.bias);
            if (cycle.phase === 'MANIPULATION') {
                const isJudas = cycleDir === setupDir;
                if (isJudas) {
                    totalPoints -= 40;
                    risks.push('CRITICAL: High probability Judas Swing (Manipulation phase)');
                } else {
                    totalPoints += 25;
                    positives.push('Fading manipulation move (Pro-Trend)');
                }
            } else if (cycle.phase === 'DISTRIBUTION' || cycle.phase === 'EXPANSION') {
                const isTrendAligned = cycleDir === setupDir;
                if (isTrendAligned) {
                    totalPoints += 20;
                    positives.push(`Institutional ${cycle.phase} alignment`);
                } else {
                    totalPoints -= 30;
                    risks.push(`Counter-institutional ${cycle.phase} conflict`);
                }
            } else if (cycle.phase === 'ACCUMULATION') {
                totalPoints -= 10;
                risks.push('Early entry hazard (Accumulation phase)');
            }
        }

        // 9. Institutional Liquidity Sweep (Phase 52)
        const sweep = marketState.liquiditySweep;
        if (sweep && sweep.isSweepDetected) {
            const sweepDir = normalizeDirection(sweep.side === 'BUY_SIDE' ? 'LONG' : 'SHORT');
            if (sweepDir === setupDir) {
                totalPoints += 30;
                positives.push(`Institutional Liquidity Sweep (${sweep.type || 'HUNT'})`);
            }
        }

        // 10. Institutional Flow Alpha (Alpha Tracker)
        const alphaStats = marketState.alphaMetrics || marketState.alphaStats;
        const alphaLeaks = marketState.alphaLeaks || [];

        if (alphaStats) {
            const contributingEngines = [setup.strategy?.name?.toUpperCase() || 'UNKNOWN'];
            if (marketState.orderBookDepth || marketState.orderBook) contributingEngines.push('ORDER_BOOK', 'LIVE_DOM');
            if (marketState.divergences?.length > 0) contributingEngines.push('SMT');
            if (marketState.relevantGap || marketState.fvgs?.length > 0) contributingEngines.push('FVG');
            if (marketState.macroSentiment) contributingEngines.push('SENTIMENT');
            if (marketState.obligations?.primaryObligation) contributingEngines.push('MARKET_OBLIGATION');

            let alphaBonus = 0;
            contributingEngines.forEach(engineId => {
                const stats = alphaStats[engineId];
                if (stats) {
                    if (stats.status === 'INSTITUTIONAL') alphaBonus += 15;
                    else if (stats.status === 'HIGH_ALPHA') alphaBonus += 8;
                    else if (stats.status === 'DEGRADING') alphaBonus -= 12;
                }
            });
            const activeLeaks = alphaLeaks.filter(l => contributingEngines.includes(l.engine));
            activeLeaks.forEach(leak => { alphaBonus -= leak.severity === 'HIGH' ? 20 : 10; });

            if (alphaBonus !== 0) {
                totalPoints += alphaBonus;
                if (alphaBonus > 0) positives.push('Institutional Alpha Alignment');
                else risks.push('Institutional Alpha Headwind');
            }
        }

        // 11. Momentum Cluster Alignment (Layer 4)
        const momentumPoints = this.calculateMomentumCluster(setup.direction, marketState);
        if (momentumPoints !== 0) {
            totalPoints += momentumPoints;
            if (momentumPoints > 0) positives.push(`Momentum Cluster Alignment (${momentumPoints > 15 ? 'PREMIUM' : 'STRONG'})`);
            else risks.push(`Momentum Divergence/Overextension (${Math.abs(momentumPoints)}pt penalty)`);
        }

        // 12. Crowd Sentiment Alignment
        const sentiment = marketState.sentiment || marketState.macroSentiment;

        if (sentiment && sentiment.label !== 'NEUTRAL') {
            const sentimentDir = normalizeDirection(sentiment.bias || sentiment.label);
            if (sentimentDir === setupDir && sentimentDir !== 'NEUTRAL') {
                totalPoints += 5;
                positives.push(`Crowd Sentiment Alignment (${sentiment.label})`);
            } else if (sentiment.confidence > 0.7 && sentimentDir !== 'NEUTRAL') {
                totalPoints -= 10;
                risks.push(`Crowd Sentiment Conflict (${sentiment.label})`);
            }
        }

        // 8. Directional Confidence
        if (setup.directionalConfidence !== undefined) {
            const confidence = setup.directionalConfidence;
            if (confidence >= 0.7) {
                totalPoints += 15;
                positives.push(`High Directional Confidence (${(confidence * 100).toFixed(0)}%)`);
            } else if (confidence < 0.5) {
                totalPoints -= 20;
                risks.push(`Low Directional Conviction (${(confidence * 100).toFixed(0)}%)`);
            }
        }

        // Resolution Score (1-10)
        const score = Math.max(0, Math.min(10, (totalPoints / 100) * 10)).toFixed(1);

        return {
            score: parseFloat(score),
            breakdown: {
                positives,
                risks
            }
        };
    }

    /**
     * Calculate Momentum Cluster Score (Aggregate Layer 4 Indicators)
     * @param {string} direction - LONG | SHORT
     * @param {Object} marketState - Current market state
     * @returns {number} Points (-20 to +25)
     */
    static calculateMomentumCluster(direction, marketState) {
        const setupDir = normalizeDirection(direction);
        let points = 0;

        const { indicators, stochastic, rsi: marketRSI } = marketState;

        // 1. Stochastic Alignment
        if (stochastic && stochastic.signals) {
            const lastSignal = stochastic.signals[stochastic.signals.length - 1];
            if (lastSignal) {
                if (setupDir === 'BULLISH' && (lastSignal.type === 'BULLISH_CROSS' || lastSignal.type === 'OVERSOLD')) {
                    points += 10;
                } else if (setupDir === 'BEARISH' && (lastSignal.type === 'BEARISH_CROSS' || lastSignal.type === 'OVERBOUGHT')) {
                    points += 10;
                }
            }
        }

        // 2. RSI Alignment
        const rsiValues = marketRSI || indicators?.rsi;
        if (rsiValues && rsiValues.length > 0) {
            const lastRSI = rsiValues[rsiValues.length - 1];
            if (setupDir === 'BULLISH' && lastRSI < 40) points += 5; // Oversold area
            if (setupDir === 'BEARISH' && lastRSI > 60) points += 5; // Overbought area

            // Extreme Overextension Risk
            if (setupDir === 'BULLISH' && lastRSI > 75) points -= 15;
            if (setupDir === 'BEARISH' && lastRSI < 25) points -= 15;
        }

        // 3. MACD Alignment
        const macd = indicators?.macd;
        if (macd && macd.histogram) {
            const hist = macd.histogram;
            const currentHist = hist[hist.length - 1];
            const prevHist = hist[hist.length - 2];

            if (setupDir === 'BULLISH' && currentHist > prevHist && currentHist < 0) points += 10; // Rising under zero
            if (setupDir === 'BEARISH' && currentHist < prevHist && currentHist > 0) points += 10; // Falling above zero
        }

        return points;
    }

    /**
     * Get banding for the score
     */
    static getScoreLabel(score) {
        if (score >= 8.0) return 'PREMIUM EDGE';
        if (score >= 7.0) return 'STRONG EDGE';
        if (score >= 6.0) return 'TRADABLE';
        if (score >= 4.0) return 'LOW CONVICTION';
        return 'NO EDGE';
    }

}