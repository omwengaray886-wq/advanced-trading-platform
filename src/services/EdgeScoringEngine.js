import { normalizeDirection, isInversePair } from '../utils/normalization.js';
import { SentimentEngine } from './SentimentEngine.js';
import { OrderBookEngine } from './OrderBookEngine.js';
import { strategyPerformanceTracker } from './StrategyPerformanceTracker.js';

/**
 * Edge Scoring Engine (Phase 51)
 * 
 * Calculates a normalized 1-10 score for a setup based on 
 * institutional factors, R:R, and probabilistic alignment.
 */

export class EdgeScoringEngine {

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
        if (!marketState) return { score: 0, breakdown: { positives: [], risks: ['Missing Market Context'] } };

        let totalPoints = 0;
        const positives = [];
        const risks = [];

        const setupDir = normalizeDirection(setup.direction);

        // === TIMEFRAME PROFILE DETECTION ===
        const tf = (marketState.timeframe || '1h').toLowerCase();
        let tfProfile = 'DAY_TRADER'; // Default
        let killzoneWeight = 1.0;
        let htfWeight = 1.0;
        let minRR = 2.0;

        if (['1m', '5m', '15m'].includes(tf)) {
            tfProfile = 'SCALPER';
            killzoneWeight = 1.3;
            htfWeight = 0.7;
            minRR = 1.5;
        } else if (['30m', '1h', '2h'].includes(tf)) {
            tfProfile = 'DAY_TRADER';
            killzoneWeight = 1.0;
            htfWeight = 1.0;
            minRR = 2.0;
        } else if (['4h', '1d', 'w', '1w'].includes(tf)) {
            tfProfile = 'SWING';
            killzoneWeight = 0.6;
            htfWeight = 1.4;
            minRR = 3.0;
        }

        // === REGIME ADAPTATION (Phase 55 Upgrade) ===
        // Dynamic weight shifting based on market condition
        const regime = marketState.regime || 'TRENDING';
        let trendWeight = 1.0;
        let oscillatorWeight = 1.0;

        if (regime === 'TRENDING') {
            trendWeight = 1.5; // Boost trend alignment points
            oscillatorWeight = 0.5; // Reduce oscillator importance (they fake out in trends)
        } else if (regime === 'RANGING') {
            trendWeight = 0.5; // Reduce trend reliance
            oscillatorWeight = 1.5; // Boost mean reversion signals
        }

        // === GOLDEN CONFLUENCE CHECK ===
        const isGolden = (
            normalizeDirection(marketState.mtf?.globalBias) === setupDir && // HTF Alignment
            normalizeDirection(marketState.currentTrend) === setupDir &&    // LTF Alignment
            normalizeDirection(marketState.sentiment?.label) === setupDir && // Sentiment Alignment
            marketState.volumeAnalysis?.isInstitutional        // Volume Support
        );

        if (isGolden) {
            totalPoints += 50;
            positives.push('🌟 GOLDEN CONFLUENCE (HTF + Trend + Sentiment + Volume)');
        }

        // 1. Bayesian Strategy Reliability (up to 40 points)
        const reliability = (bayesianStats?.probability || 0.5) * 100;

        if (reliability >= 80) {
            totalPoints += 40;
            positives.push(`Premium Strategy Reliability (${reliability ? reliability.toFixed(0) : '0'}%)`);
        } else if (reliability >= 65) {
            totalPoints += 25;
            positives.push(`Strong Strategy Reliability (${reliability ? reliability.toFixed(0) : '0'}%)`);
        } else if (reliability < 50) {
            risks.push(`Low Strategy Reliability (${reliability ? reliability.toFixed(0) : '0'}%)`);
        }

        // 1.5 Adaptive Performance (Phase 5: Self-Correction)
        // If this strategy is currently losing money, penalize it.
        const strategyName = setup.strategy?.name || 'Unknown';
        const perfMultiplier = strategyPerformanceTracker.getDynamicWeight(strategyName);

        if (perfMultiplier > 1.1) {
            totalPoints += 15;
            positives.push(`🔥 HOT HAND: Strategy is winning (${perfMultiplier.toFixed(1)}x boost)`);
        } else if (perfMultiplier < 0.9) {
            totalPoints -= 25;
            risks.push(`❄️ COLD STREAK: Strategy is struggling (${perfMultiplier.toFixed(1)}x penalty)`);
        }

        // 2. R:R Feasibility (up to 20 points) - TIMEFRAME ADJUSTED
        const rr = setup.rr || 0;
        if (rr >= minRR + 1) {
            totalPoints += 20;
            positives.push(`High yield R:R (${rr ? rr.toFixed(1) : '0.0'}) for ${tfProfile}`);
        } else if (rr >= minRR) {
            totalPoints += 15;
            positives.push(`Standard R:R (${rr ? rr.toFixed(1) : '0.0'}) for ${tfProfile}`);
        } else if (rr >= minRR * 0.7) {
            totalPoints += 8;
            risks.push(`Below-optimal R:R (${rr ? rr.toFixed(1) : '0.0'}) for ${tfProfile} - expected ≥${minRR}`);
        } else if (rr > 0) {
            totalPoints += 3;
            risks.push(`Low R:R yield (${rr ? rr.toFixed(1) : '0.0'}) - high risk for ${tfProfile}`);
        }

        // 3. Timeframe Stacking (up to 25 points) - HTF WEIGHT APPLIED
        const globalBias = normalizeDirection(marketState.mtf?.globalBias);
        const mtfAligned = globalBias === setupDir;

        if (globalBias === 'NEUTRAL') {
            totalPoints += 5;
        } else if (mtfAligned) {
            const htfBonus = Math.round(25 * htfWeight * trendWeight);
            totalPoints += htfBonus;
            positives.push(`HTF Context alignment (${tfProfile === 'SWING' ? 'CRITICAL' : 'CONFIRMED'})`);
        } else {
            const htfPenalty = Math.round(15 * htfWeight * trendWeight);
            totalPoints -= htfPenalty;
            risks.push(`HTF Bias conflict${tfProfile === 'SWING' ? ' - HIGH RISK FOR SWING' : ''}`);
        }

        // 4. Institutional Confluence (up to 50 points)
        const hasInstitutionalVolume = marketState.volumeAnalysis?.isInstitutional;
        const hasSMT = marketState.divergences?.length > 0;
        const inKillzone = !!marketState.session?.killzone;
        const targetsObligation = marketState.obligations?.primaryObligation?.urgency > 70;

        if (hasInstitutionalVolume) {
            totalPoints += 10;
            positives.push('Institutional volume participation');
        } else if (regime === 'TRENDING') {
            totalPoints -= 15;
            risks.push('Low Volume in Tracking Phase (Validation Risk)');
        }
        if (hasSMT) {
            const smt = marketState.smtDivergence; // The specific divergence found
            const smtStrength = marketState.smtConfluence || 50;

            if (smt) {
                const smtDir = normalizeDirection(smt.type);
                if (smtDir === setupDir) {
                    totalPoints += 35; // HUGELY Important signal
                    positives.push(`🌟 SMT Divergence Confirmation (${smt.type} with ${smt.metadata?.sibling || 'Correlated Asset'})`);
                } else {
                    totalPoints -= 20;
                    risks.push(`SMT Divergence Conflict (${smt.type})`);
                }
            } else {
                // Fallback if we just have the array but no specific dominant one assigned
                const smtBonus = smtStrength >= 80 ? 25 : 15;
                totalPoints += smtBonus;
                positives.push(`Inter-market divergence (SMT) ${smtStrength >= 80 ? 'PREMIUM' : 'DETECTED'}`);
            }
        }
        if (inKillzone) {
            const hour = marketState.session?.hour ?? new Date().getUTCHours();
            const isPowerHour = (hour === 8 || hour === 9 || hour === 13 || hour === 14);
            const baseBonus = isPowerHour ? 20 : 10;
            const killzoneBonus = Math.round(baseBonus * killzoneWeight);
            totalPoints += killzoneBonus;
            positives.push(`Killzone alignment (${marketState.session.killzone}${isPowerHour ? ' - POWER HOUR' : ''})${tfProfile === 'SCALPER' ? ' [CRITICAL]' : ''}`);
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

        // 5. Inst. Flow & Whale Watch (Phase 4 Upgrade)
        const icebergs = marketState.orderFlow?.icebergs || [];
        const absorption = marketState.orderFlow?.absorption;
        const cvd = marketState.orderFlow?.cvdBias; // BULLISH / BEARISH

        // A. Iceberg Support/Resistance
        if (icebergs.length > 0) {
            const relevantIceberg = icebergs.find(ice => {
                const dist = Math.abs(ice.price - setup.entryZone?.optimal || marketState.currentPrice) / marketState.currentPrice;
                return dist < 0.005; // Within 0.5%
            });

            if (relevantIceberg) {
                // BUY_ICEBERG supports Longs, SELL_ICEBERG supports Shorts
                // Note: BUY_ICEBERG means Passive Buy Limit absorbing Aggressive Sells
                const isSupport = relevantIceberg.type === 'BUY_ICEBERG';
                const isResist = relevantIceberg.type === 'SELL_ICEBERG';

                if (setupDir === 'BULLISH' && isSupport) {
                    totalPoints += 25;
                    positives.push(`🐋 WHALE DETECTED: Iceberg Buy Wall at ${relevantIceberg.price}`);
                } else if (setupDir === 'BEARISH' && isResist) {
                    totalPoints += 25;
                    positives.push(`🐋 WHALE DETECTED: Iceberg Sell Wall at ${relevantIceberg.price}`);
                } else if ((setupDir === 'BULLISH' && isResist) || (setupDir === 'BEARISH' && isSupport)) {
                    totalPoints -= 30; // Fighting a whale
                    risks.push(`CRITICAL: Trading into Opposing Iceberg at ${relevantIceberg.price}`);
                }
            }
        }

        // B. Absorption (Delta Divergence)
        if (absorption) {
            // BUYING_ABSORPTION means price didn't drop despite selling -> Bullish
            const isBullishAbs = absorption.type === 'BUYING_ABSORPTION';
            const isBearishAbs = absorption.type === 'SELLING_ABSORPTION';

            if (setupDir === 'BULLISH' && isBullishAbs) {
                totalPoints += 20;
                positives.push('Institutional Absorption (Delta Divergence) Supporting Long');
            } else if (setupDir === 'BEARISH' && isBearishAbs) {
                totalPoints += 20;
                positives.push('Institutional Absorption (Delta Divergence) Supporting Short');
            }
        }

        // C. CVD Alignment
        if (cvd) {
            if (cvd === setupDir.toUpperCase()) {
                totalPoints += 10;
                positives.push('Cumulative Volume Delta (CVD) Aligned');
            } else {
                // If CVD is opposing but Price is going our way -> Divergence/Absorption (Good)
                // If CVD is opposing and Price is struggling -> Bad
                // Simplified: Small penalty for retail headwind unless absorption saves it
                if (!absorption) {
                    totalPoints -= 5;
                    risks.push('Retail Order Flow (CVD) Conflict');
                }
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

        // 7. Cross-Asset Consensus (Macro Alignment - Phase 2 Upgrade)
        const macroBias = marketState.macroBias; // Uses the new Engine result directly
        if (macroBias && macroBias.bias !== 'NEUTRAL') {
            const biasDir = normalizeDirection(macroBias.bias);
            const isAligned = biasDir === setupDir.toUpperCase();
            const action = macroBias.action; // BOOST, VETO, NONE

            if (action === 'VETO' && !isAligned) {
                totalPoints -= 50; // Critical Penalty
                risks.push(`CRITICAL MACRO VETO: ${macroBias.reason}`);
            } else if (action === 'BOOST' && isAligned) {
                totalPoints += 25;
                positives.push(`Macro Turbo Boost: ${macroBias.reason}`);
            } else if (isAligned) {
                totalPoints += 15;
                positives.push(`Macro Alignment (${macroBias.bias})`);
            } else {
                totalPoints -= 15;
                risks.push(`Macro Bias Headwind (${macroBias.bias})`);
            }
        }

        // 7.5 Correlation Cluster Risk (Phase 2)
        if (marketState.clusters) {
            const cluster = marketState.clusters.clusters.find(c => c.assets.includes(marketState.symbol || ''));
            if (cluster) {
                if (cluster.riskLevel === 'EXTREME') {
                    totalPoints -= 25;
                    risks.push(`EXTREME Correlation Risk (Cluster: ${cluster.dominantFactor})`);
                } else if (cluster.riskLevel === 'HIGH') {
                    totalPoints -= 10;
                    risks.push(`High Correlation Risk (Cluster: ${cluster.dominantFactor})`);
                }
            }
        }

        // 8. Order Book Depth & Walls
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

        // Trap Zone Penalty (Phase 2 Upgrade)
        if (marketState.trapZones) {
            // Check if setup entry is near a trap
            const entryPrice = setup.entryZone?.optimal || marketState.currentPrice;
            const nearbyTrap = marketState.trapZones.bullTraps.concat(marketState.trapZones.bearTraps).find(t =>
                Math.abs(t.location - entryPrice) / entryPrice < 0.003
            );

            if (nearbyTrap) {
                // If Long into Bull Trap (Resistance) -> BAD
                // If Short into Bear Trap (Support) -> BAD
                if (setupDir === 'BULLISH' && (nearbyTrap.implication === 'BULL_TRAP' || nearbyTrap.implication === 'LONG_TRAP')) {
                    totalPoints -= 100; // NUKE IT
                    risks.push(`CRITICAL: Trading into confirmed Bull Trap at ${nearbyTrap.location}`);
                } else if (setupDir === 'BEARISH' && (nearbyTrap.implication === 'BEAR_TRAP' || nearbyTrap.implication === 'SHORT_TRAP')) {
                    totalPoints -= 100; // NUKE IT
                    risks.push(`CRITICAL: Trading into confirmed Bear Trap at ${nearbyTrap.location}`);
                }
            }

            // General Warning
            if (marketState.trapZones.warning) {
                totalPoints -= 10;
                risks.push(marketState.trapZones.warning);
            }
        }

        // 9. AMD Cycle Calibration
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

        // 10. Institutional Liquidity Sweep (Phase 52)
        const sweep = marketState.liquiditySweep;
        if (sweep && sweep.isSweepDetected) {
            const sweepDir = normalizeDirection(sweep.side === 'BUY_SIDE' ? 'LONG' : 'SHORT');
            if (sweepDir === setupDir) {
                totalPoints += 30;
                positives.push(`Institutional Liquidity Sweep (${sweep.type || 'HUNT'})`);
            }
        }

        // 11. Institutional Flow Alpha (Alpha Tracker)
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

        // 12. Momentum Cluster Alignment (Layer 4)
        const momentumPoints = this.calculateMomentumCluster(setup.direction, marketState, oscillatorWeight);
        if (momentumPoints !== 0) {
            totalPoints += momentumPoints;
            if (momentumPoints > 0) positives.push(`Momentum Cluster Alignment (${momentumPoints > 15 ? 'PREMIUM' : 'STRONG'})`);
            else risks.push(`Momentum Divergence/Overextension (${Math.abs(momentumPoints)}pt penalty)`);
        }

        // 13. Crowd Sentiment Alignment
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

        // 14. Fractal Pattern Verification (Phase 3 Boost)
        const patterns = marketState.patterns;
        if (patterns && patterns.prediction) {
            const patternDir = normalizeDirection(patterns.prediction);
            if (patternDir === setupDir) {
                const boost = (patterns.confidence || 0) * 20;
                totalPoints += boost;
                positives.push(`Fractal Confirmation (${patterns.confidence ? (patterns.confidence * 100).toFixed(0) : '0'}%)`);
            } else if ((patterns.confidence || 0) > 0.6) {
                totalPoints -= 15;
                risks.push('Fractal Pattern Conflict');
            }
        }

        // 15. Directional Confidence
        if (setup.directionalConfidence !== undefined) {
            const confidence = setup.directionalConfidence;
            if (confidence >= 0.7) {
                totalPoints += 15;
                positives.push(`High Directional Confidence (${confidence ? (confidence * 100).toFixed(0) : '0'}%)`);
            } else if (confidence < 0.5) {
                totalPoints -= 20;
                risks.push(`Low Directional Conviction (${confidence ? (confidence * 100).toFixed(0) : '0'}%)`);
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
     * @param {number} weight - Oscillator weight (default 1.0)
     * @returns {number} Points (-20 to +25)
     */
    static calculateMomentumCluster(direction, marketState, weight = 1.0) {
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

        return Math.round(points * weight);
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