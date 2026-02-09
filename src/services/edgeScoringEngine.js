import { normalizeDirection, isInversePair } from '../utils/normalization.js';

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

        // Macro Filtering (DXY/BTC Dominance)
        const correlation = marketState.correlation;
        if (correlation && correlation.benchmark) {
            const isForex = ['EUR', 'GBP', 'JPY', 'AUD', 'USD', 'CHF', 'CAD', 'NZD'].some(c => symbol.includes(c));
            if (isForex && correlation.benchmark === 'DXY') {
                const dxyBullish = correlation.benchmarkDirection === 'BULLISH';
                const isShorting = setupDir === 'BEARISH';
                const isLonging = setupDir === 'BULLISH';

                if (dxyBullish && isLonging) {
                    totalPoints -= 30;
                    risks.push('DXY Macro Headwind (Inverse Correlation)');
                } else if (!dxyBullish && isShorting) {
                    totalPoints -= 30;
                    risks.push('DXY Macro Headwind (Inverse Correlation)');
                } else if (!dxyBullish && isLonging) {
                    totalPoints += 15;
                    positives.push('DXY Macro Tailwind (Beta Alignment)');
                } else if (dxyBullish && isShorting) {
                    totalPoints += 15;
                    positives.push('DXY Macro Tailwind (Beta Alignment)');
                }
            }
        }

        // Penalty for Trading AGAINST Obligation
        const primaryMagnet = marketState.obligations?.primaryObligation;
        if (primaryMagnet && primaryMagnet.urgency > 80) {
            const magnetDir = primaryMagnet.price > marketState.currentPrice ? 'BULLISH' : 'BEARISH';
            if (magnetDir !== setupDir) {
                totalPoints -= 40;
                risks.push(`CRITICAL: Trading against Major Magnet (${primaryMagnet.type})`);
            } else {
                totalPoints += 15;
                positives.push(`Magnet Acceleration (${primaryMagnet.type})`);
            }
        }

        // 5. Volume Profile & DOM Confluence
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
        if (correlation && correlation.bias !== 'NEUTRAL' && correlation.bias !== 'SELF') {
            const correlationBias = normalizeDirection(correlation.bias);
            const isInverse = isInversePair(symbol, 'DXY'); // Simplified for common benchmark

            let isAligned = correlationBias === setupDir;
            if (isInverse && correlationBias !== 'NEUTRAL') {
                isAligned = correlationBias !== setupDir; // Inverse: BULLISH DXY = BEARISH Setup
            }

            if (!isAligned && correlationBias !== 'NEUTRAL') {
                totalPoints -= 15;
                risks.push(`Macro Conflict: Benchmark is ${correlationBias}${isInverse ? ' (Inverse)' : ''}`);
            } else if (isAligned) {
                totalPoints += 5;
                positives.push('Macro Correlation alignment');
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

        // AMD Cycle Calibration
        const cycle = marketState.marketCycle;
        if (cycle && cycle.phase !== 'UNKNOWN') {
            const cycleDir = normalizeDirection(cycle.direction);
            if (cycle.phase === 'MANIPULATION') {
                const isJudas = cycleDir === setupDir;
                if (isJudas) {
                    totalPoints -= 40;
                    risks.push('CRITICAL: High probability Judas Swing (Manipulation phase)');
                } else {
                    totalPoints += 15;
                    positives.push('Fading manipulation move');
                }
            } else if (cycle.phase === 'DISTRIBUTION') {
                const isTrendAligned = cycleDir === setupDir;
                if (isTrendAligned) {
                    totalPoints += 20;
                    positives.push('Institutional Distribution alignment');
                } else {
                    totalPoints -= 30;
                    risks.push('Counter-institutional distribution conflict');
                }
            } else if (cycle.phase === 'ACCUMULATION') {
                totalPoints -= 10;
                risks.push('Early entry hazard (Accumulation phase)');
            }
        }

        // 7. Institutional Flow & Sentiment
        const alpha = marketState.institutionalFlow;
        const sentiment = marketState.sentiment;

        if (alpha && alpha.score !== 0) {
            totalPoints += alpha.score;
            if (alpha.score > 0) positives.push(`Institutional Flow Alpha: ${alpha.summary}`);
            else risks.push(`Institutional Flow Headwind: ${alpha.summary}`);
        }

        if (sentiment && sentiment.label !== 'NEUTRAL') {
            const sentimentDir = normalizeDirection(sentiment.bias);
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