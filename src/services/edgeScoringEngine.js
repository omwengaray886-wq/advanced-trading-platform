/**
 * Edge Scoring Engine (Phase 51)
 * 
 * Calculates a normalized 1-10 score for a setup based on 
 * institutional factors, R:R, and probabilistic alignment.
 */

export class EdgeScoringEngine {
    /**
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

        // 1. Bayesian Strategy Reliability (up to 40 points)
        // bayesianStats.probability is 0.0 - 1.0
        // We convert to 0-100 percentage
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
        const mtfAligned = marketState.mtf?.globalBias === setup.direction;
        if (mtfAligned) {
            totalPoints += 25; // Boosted from 20
            positives.push('HTF Context alignment (1D/4H)');
        } else {
            totalPoints -= 15; // Penalize trading against HTF
            risks.push('HTF Bias conflict');
        }

        // 4. Institutional Confluence (up to 50 points - Expanded)
        const hasInstitutionalVolume = marketState.volumeAnalysis?.isInstitutional;
        const hasSMT = marketState.divergences?.length > 0;
        const inKillzone = !!marketState.session?.killzone;
        const targetsObligation = marketState.obligations?.primaryObligation?.urgency > 70;

        if (hasInstitutionalVolume) {
            totalPoints += 10; // Boosted from 5
            positives.push('Institutional volume participation');
        }
        if (hasSMT) {
            // SMT is the strongest institutional signal
            const smtStrength = marketState.smtConfluence || 50;
            const smtBonus = smtStrength >= 80 ? 25 : 15;
            totalPoints += smtBonus;
            positives.push(`Inter-market divergence (SMT) ${smtStrength >= 80 ? 'PREMIUM' : 'DETECTED'}`);
        }
        if (inKillzone) {
            // Killzone Power Hour (First 2 hours of session)
            const hour = new Date().getUTCHours();
            const isPowerHour = (hour === 8 || hour === 9 || hour === 13 || hour === 14); // Lon/NY Open
            totalPoints += isPowerHour ? 20 : 10;
            positives.push(`Killzone alignment (${marketState.session.killzone}${isPowerHour ? ' - POWER HOUR' : ''})`);
        }
        if (targetsObligation) {
            totalPoints += 15; // Boosted from 10
            positives.push('Primary obligation target (Magnet theory)');
        }

        // Macro Filtering (DXY/BTC Dominance)
        const correlation = marketState.correlation;
        if (correlation && correlation.benchmark) {
            const isForex = ['EUR', 'GBP', 'JPY', 'AUD', 'USD'].some(c => symbol.includes(c));
            if (isForex && correlation.benchmark === 'DXY') {
                const dxyBullish = correlation.benchmarkDirection === 'BULLISH';
                const assetBullish = setup.direction === 'LONG';

                // EUR/USD vs DXY is inverse
                if (dxyBullish && assetBullish) {
                    totalPoints -= 30; // Heavy penalty if buying against DXY strength
                    risks.push('DXY Macro Headwind (Inverse Correlation)');
                } else if (!dxyBullish && assetBullish) {
                    totalPoints += 10;
                    positives.push('DXY Macro Tailwin (Beta Alignment)');
                }
            }
        }

        // Penalty for Trading AGAINST Obligation
        // If there is a strong magnet (Urgency > 80) and we are trading away from it
        const primaryMagnet = marketState.obligations?.primaryObligation;
        if (primaryMagnet && primaryMagnet.urgency > 80) {
            const magnetDirection = primaryMagnet.price > setup.entryZone?.optimal ? 'LONG' : 'SHORT';
            if (magnetDirection !== setup.direction) {
                totalPoints -= 40; // MASSIVE PENALTY (Increased from 25)
                risks.push(`CRITICAL: Trading against Major Magnet (${primaryMagnet.type})`);
            } else {
                // Calibration: If we are trading WITH a massive magnet, give extra boost
                totalPoints += 15;
                positives.push(`Magnet Acceleration (${primaryMagnet.type})`);
            }
        }

        // 5. Volume Profile & DOM Confluence (up to 15 points) (Phase 55/66)
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


        // 6. Cross-Asset Consensus (Phase 66)
        if (correlation && correlation.bias !== 'NEUTRAL' && correlation.bias !== 'SELF') {
            if (correlation.bias !== setup.direction) {
                totalPoints -= 15;
                risks.push(`Correlation Conflict: Benchmark is ${correlation.bias}`);
            } else {
                totalPoints += 5;
                positives.push('Macro Correlation alignment');
            }
        }

        // Apply News Penalty
        if (marketState.activeShock?.severity === 'HIGH') {
            totalPoints -= 35; // Increased from 30
            risks.push(`High-impact news hazard (${marketState.activeShock.event})`);
        }

        // 7. REAL DATA: Institutional Alpha & Sentiment (Phase 55)
        const alpha = marketState.institutionalFlow;
        const sentiment = marketState.sentiment;

        if (alpha && alpha.score !== 0) {
            totalPoints += alpha.score; // alpha.score is already weighted (e.g., +30, -20)
            if (alpha.score > 0) positives.push(`Institutional Flow Alpha: ${alpha.summary}`);
            else risks.push(`Institutional Flow Headwind: ${alpha.summary}`);
        }

        if (sentiment && sentiment.label !== 'NEUTRAL') {
            const isBullishSentiment = sentiment.bias?.includes('BULLISH');
            const isBullishSetup = setup.direction === 'LONG';

            if (isBullishSentiment === isBullishSetup) {
                totalPoints += 5;
                positives.push(`Crowd Sentiment Alignment (${sentiment.label})`);
            } else if (sentiment.confidence > 0.7) {
                totalPoints -= 10;
                risks.push(`Crowd Sentiment Conflict (${sentiment.label})`);
            }
        }

        // 8. PHASE 56: Directional Confidence Logic
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
        // Cap max points at 120 (bonus points) but normalize to 10
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
