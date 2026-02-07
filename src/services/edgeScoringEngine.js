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
     * @param {Object} probabilities - Bayesian probabilities
     * @returns {Object} Score and breakdown
     */
    static calculateScore(setup, marketState, probabilities) {
        if (!setup) return { score: 0, breakdown: { positives: [], risks: ['No active setup'] } };

        let totalPoints = 0;
        const positives = [];
        const risks = [];

        // 1. Probabilistic Strength (up to 40 points)
        // Continuation/Reversal > 65% is strong
        const domProb = Math.max(probabilities.continuation || 0, probabilities.reversal || 0);
        if (domProb >= 70) {
            totalPoints += 40;
            positives.push(`Strong Bayesian conviction (${domProb}%)`);
        } else if (domProb >= 60) {
            totalPoints += 25;
            positives.push(`Moderate Bayesian conviction (${domProb}%)`);
        } else {
            risks.push(`Low probabilistic edge (${domProb}%)`);
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

        // 3. Timeframe Stacking (up to 20 points)
        const mtfAligned = marketState.mtf?.globalBias === setup.direction;
        if (mtfAligned) {
            totalPoints += 20;
            positives.push('HTF Context alignment');
        } else {
            risks.push('HTF Bias conflict');
        }

        // 4. Institutional Confluence (up to 20 points)
        const hasInstitutionalVolume = marketState.volumeAnalysis?.isInstitutional;
        const hasSMT = marketState.divergences?.length > 0;

        if (hasInstitutionalVolume) {
            totalPoints += 10;
            positives.push('Institutional volume participation');
        }
        if (hasSMT) {
            totalPoints += 10;
            positives.push('Inter-market divergence (SMT) present');
        }

        // 5. Volume Profile Confluence (up to 10 points) (Phase 55)
        const vp = marketState.volumeProfile;
        if (vp) {
            const price = marketState.currentPrice;
            const isNearPOC = Math.abs(price - vp.poc) / vp.poc < 0.002;
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


        // Apply News Penalty
        if (marketState.activeShock?.severity === 'HIGH') {
            totalPoints -= 30;
            risks.push('High-impact news hazard');
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
