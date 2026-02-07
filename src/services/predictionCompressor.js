/**
 * Prediction Compression Layer
 * 
 * Compresses rich analysis into a single, simple, actionable forecast.
 * Output: 1 bias, 1 target, 1 invalidation, 1 confidence score.
 */

import { EdgeScoringEngine } from './edgeScoringEngine.js';

export class PredictionCompressor {
    /**
     * Compress full analysis into single dominant forecast
     * @param {Object} analysis - Full market analysis
     * @param {Object} probabilities - Probabilistic engine output
     * @returns {Object} Compressed prediction
     */
    static compress(analysis, probabilities) {
        const { marketState, setups } = analysis;

        // 1. Determine dominant bias
        const bias = this._determineBias(marketState, probabilities);

        // 2. Select single target
        const target = this._selectTarget(bias, setups, probabilities);

        // 3. Define invalidation
        const invalidation = this._defineInvalidation(bias, setups, marketState);

        // 4. Calculate confidence
        const confidence = this._calculateConfidence(bias, probabilities, marketState);

        // 5. Generate reason
        const reason = this._generateReason(bias, marketState, probabilities);

        // 6. Generate Edge Score (Phase 51)
        const relevantSetup = setups.find(s => s.direction === bias) || setups[0];
        const edge = EdgeScoringEngine.calculateScore(relevantSetup, marketState, probabilities);

        // 7. Multi-Horizon Intent
        const horizons = this._buildHorizons(bias, marketState, probabilities);

        // 8. Accountability Metadata
        const id = this._generatePredictionId(analysis.symbol, analysis.timeframe);
        const expiresAt = this._calculateExpiry(analysis.timeframe);

        return {
            id,
            bias, // 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'NO_EDGE' | 'WAIT'
            target,
            invalidation,
            confidence,
            edgeScore: edge.score,
            edgeLabel: EdgeScoringEngine.getScoreLabel(edge.score),
            reason,
            horizons,
            timestamp: Date.now(),
            expiresAt,

            // Validity Conditions (Phase 51)
            validityConditions: [
                `Price stays ${bias === 'BULLISH' ? 'above' : 'below'} ${invalidation}`,
                `HTF ${marketState.mtf?.globalBias} structure remains intact`,
                "No high-impact news releases within 15 mins"
            ],

            // Transparency Breakdown
            confidenceBreakdown: {
                positives: edge.breakdown.positives,
                risks: edge.breakdown.risks
            },

            // Market State Snapshot for Audit
            snapshot: {
                price: marketState.price,
                regime: marketState.regime,
                volatility: marketState.volatility,
                trend: marketState.trend?.direction
            }
        };
    }

    /**
     * Generate unique auditable ID (Deterministic per candle)
     * @private
     */
    static _generatePredictionId(symbol, timeframe) {
        const cleanSymbol = symbol.replace(/[^a-zA-Z]/g, '');
        // Use current hour slot for ID to lock it for a while (v2 requirement)
        const hourSlot = Math.floor(Date.now() / (1000 * 60 * 60));
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
        return `${cleanSymbol}-${timeframe}-${dateStr}-${hourSlot.toString().slice(-3)}`;
    }

    /**
     * Calculate auto-expiry based on timeframe
     * @private
     */
    static _calculateExpiry(timeframe) {
        const now = Date.now();
        const intervals = {
            '1m': 15 * 60 * 1000,
            '5m': 60 * 60 * 1000,
            '15m': 3 * 60 * 60 * 1000,
            '1h': 8 * 60 * 60 * 1000,
            '4h': 24 * 60 * 60 * 1000,
            '1d': 7 * 24 * 60 * 60 * 1000
        };
        return now + (intervals[timeframe] || intervals['1h']);
    }

    /**
     * Build Multi-Horizon Intent
     * @private
     */
    static _buildHorizons(bias, marketState, probabilities) {
        if (bias === 'NO_EDGE' || bias === 'WAIT') {
            return { immediate: 'Sideways', session: 'Wait for shift', htf: 'Neutral' };
        }

        const dir = bias === 'BULLISH' ? 'Buy-side' : 'Sell-side';
        const opp = bias === 'BULLISH' ? 'Sell-side' : 'Buy-side';

        return {
            immediate: `Search for ${opp} liquidity`,
            session: `${dir} expansion toward targets`,
            htf: `Maintenance of ${dir} structure`
        };
    }

    /**
     * Determine single dominant bias
     * @private
     */
    static _determineBias(marketState, probabilities) {
        const { continuation, reversal, consolidation } = probabilities;

        // Special case: No clear edge
        if (continuation < 40 && reversal < 40 && consolidation > 60) {
            return 'NEUTRAL'; // Was NO_EDGE, but >60 is now valid signal
        }

        // Consolidation dominant
        if (consolidation > 60) {
            return 'NEUTRAL';
        }

        // Phase 52: CHoCH Integration
        // Check for recent Change of Character (high-priority reversal signal)
        const recentCHoCH = this._getRecentCHoCH(marketState);

        // Continuation vs Reversal
        const htfBias = marketState.mtf?.globalBias || 'NEUTRAL';
        const trend = marketState.trend?.direction || 'NEUTRAL';

        // Priority 1: Recent CHoCH overrides everything (if fresh and strong)
        if (recentCHoCH) {
            const chochAge = recentCHoCH.age; // candles since CHoCH
            const chochDirection = recentCHoCH.direction === 'BULLISH' ? 'BULLISH' : 'BEARISH';

            // If CHoCH is very recent (< 10 candles), it's a high-confidence reversal signal
            if (chochAge < 10 && reversal >= 50) {
                return chochDirection;
            }

            // If CHoCH is recent (< 20 candles) and aligns with reversal probability
            if (chochAge < 20 && reversal >= 60) {
                return chochDirection;
            }
        }

        // Priority 2: Favor continuation if probability is strong
        if (continuation >= 60) {
            return trend === 'BULLISH' ? 'BULLISH' : trend === 'BEARISH' ? 'BEARISH' : htfBias;
        }

        // Priority 3: Favor reversal if probability is strong
        if (reversal >= 65) {
            return trend === 'BULLISH' ? 'BEARISH' : trend === 'BEARISH' ? 'BULLISH' : 'NEUTRAL';
        }

        // Phase 51: Aggressive No-Edge States
        if (marketState.regime === 'RANGING' && continuation < 55 && reversal < 55) {
            return 'WAIT_RANGE';
        }

        if (marketState.activeShock?.severity === 'HIGH') {
            return 'WAIT_NEWS';
        }

        // Phase 52: Improved HTF/LTF Conflict Resolution
        if (htfBias !== 'NEUTRAL' && trend !== 'NEUTRAL' && htfBias !== trend) {
            // If we have a recent CHoCH, trust the LTF structural shift
            if (recentCHoCH && recentCHoCH.age < 15) {
                const chochDirection = recentCHoCH.direction === 'BULLISH' ? 'BULLISH' : 'BEARISH';
                return chochDirection;
            }

            // If HTF is very strong and LTF is weak, trust HTF
            const htfStrength = marketState.mtf?.context?.confidence || 0;
            const ltfStrength = marketState.confidence || 0;

            if (htfStrength > 0.8 && ltfStrength < 0.5) {
                return htfBias;
            }

            // If LTF is very strong and HTF is weak, trust LTF
            if (ltfStrength > 0.8 && htfStrength < 0.5) {
                return trend;
            }

            // Otherwise, wait for clarity
            return 'WAIT_CONFLICT';
        }

        // Default to HTF bias
        return htfBias;
    }

    /**
     * Get most recent CHoCH event (if any)
     * @private
     */
    static _getRecentCHoCH(marketState) {
        const structuralEvents = marketState.structuralEvents || [];
        const chochEvents = structuralEvents.filter(e => e.markerType === 'CHOCH');

        if (chochEvents.length === 0) return null;

        // Get the most recent CHoCH
        const latestCHoCH = chochEvents[chochEvents.length - 1];

        // Calculate age in candles (approximate using timestamp)
        const currentTime = Date.now() / 1000;
        const chochTime = latestCHoCH.time;
        const ageInSeconds = currentTime - chochTime;
        const ageInCandles = Math.floor(ageInSeconds / 3600); // Assuming 1H candles

        return {
            direction: latestCHoCH.direction,
            age: ageInCandles,
            price: latestCHoCH.price,
            significance: latestCHoCH.significance
        };
    }

    /**
     * Select single primary target
     * @private
     */
    static _selectTarget(bias, setups, probabilities) {
        if (bias === 'NO_EDGE' || bias === 'NEUTRAL') {
            return null;
        }

        // Prioritize liquidity target if available
        if (probabilities.liquidityRun?.probability > 60) {
            return probabilities.liquidityRun.target;
        }

        // Otherwise use first high-confidence setup's target
        const relevantSetup = setups.find(s => s.direction === bias);
        if (relevantSetup && relevantSetup.targets?.length > 0) {
            return relevantSetup.targets[0].price;
        }

        return null;
    }

    /**
     * Define hard invalidation level
     * @private
     */
    static _defineInvalidation(bias, setups, marketState) {
        if (bias === 'NO_EDGE' || bias === 'NEUTRAL') {
            return null;
        }

        // Use most conservative stop loss from relevant setups
        const relevantSetup = setups.find(s => s.direction === bias);
        if (relevantSetup) {
            return relevantSetup.stopLoss;
        }

        // Fallback: Use structural pivot
        const swings = marketState.swingPoints || [];
        const relevantSwings = swings.filter(s =>
            bias === 'BULLISH' ? s.type === 'LOW' : s.type === 'HIGH'
        );

        if (relevantSwings.length > 0) {
            return relevantSwings[relevantSwings.length - 1].price;
        }

        return null;
    }

    /**
     * Calculate overall confidence
     * @private
     */
    static _calculateConfidence(bias, probabilities, marketState) {
        if (bias === 'NO_EDGE') return 0;
        if (bias === 'NEUTRAL') return 30;

        let confidence = 0;

        // 1. Probability strength (50 points)
        const dominantProb = Math.max(probabilities.continuation, probabilities.reversal);
        confidence += (dominantProb / 100) * 50;

        // 2. HTF alignment (25 points)
        const htfBias = marketState.mtf?.globalBias;
        if (htfBias === bias) confidence += 25;
        else if (htfBias === 'NEUTRAL') confidence += 12;

        // 3. Structure confirmation (15 points)
        if (marketState.mtfBiasAligned) confidence += 15;

        // 4. Volume confirmation (10 points)
        if (marketState.volumeAnalysis?.isInstitutional) confidence += 10;

        // Phase 52: Volume Profile Path Clearance Check
        // Reduce confidence if predicted path crosses High Volume Nodes (resistance)
        const pathClearance = this._checkPathClearance(bias, marketState);
        if (!pathClearance.clear) {
            confidence -= pathClearance.penalty;
        }

        // Phase 53: Session-Based Confidence Modifiers
        const sessionModifier = this._getSessionConfidenceModifier(marketState);
        confidence += sessionModifier;

        // Phase 53: Correlation Validation
        const correlationCheck = this._validateCorrelation(bias, marketState);
        confidence -= correlationCheck.penalty;

        // Phase 53: Momentum/Divergence Confirmation
        const momentumBonus = this._getMomentumConfirmation(bias, marketState);
        confidence += momentumBonus;

        return Math.round(Math.min(Math.max(confidence, 0), 100));
    }

    /**
     * Get session-based confidence modifier
     * @private
     */
    static _getSessionConfidenceModifier(marketState) {
        const session = marketState.session?.active;
        if (!session) return 0;

        let modifier = 0;

        // Asian Session: Low liquidity = lower confidence
        if (session === 'ASIAN') {
            modifier -= 10;
        }

        // Killzone (first 2h of session): High reliability
        if (marketState.session?.killzone) {
            modifier += 5;
        }

        // London/NY overlap: Peak liquidity (if both active)
        if (session === 'LONDON') {
            const timestamp = marketState.session.timestamp || Date.now() / 1000;
            const hour = new Date(timestamp * 1000).getUTCHours();
            // NY opens at 13:00 UTC, overlaps with London until 16:00 UTC
            if (hour >= 13 && hour < 16) {
                modifier += 10; // Peak liquidity boost
            }
        }

        return modifier;
    }

    /**
     * Validate prediction against macro correlation
     * @private
     */
    static _validateCorrelation(bias, marketState) {
        const correlation = marketState.correlation;

        if (!correlation || correlation.bias === 'NEUTRAL') {
            return { penalty: 0 };
        }

        let penalty = 0;

        // If prediction conflicts with macro correlation, penalize
        if (bias === 'BULLISH' && correlation.bias === 'BEARISH') {
            penalty = 20; // Major correlation conflict
        } else if (bias === 'BEARISH' && correlation.bias === 'BULLISH') {
            penalty = 20;
        }

        return { penalty };
    }

    /**
     * Check momentum confirmation via divergences
     * @private
     */
    static _getMomentumConfirmation(bias, marketState) {
        const divergences = marketState.divergences || [];

        if (divergences.length === 0) return 0;

        const hasBullishDiv = divergences.some(d =>
            d.type === 'BULLISH_DIVERGENCE' || d.type === 'BULLISH'
        );
        const hasBearishDiv = divergences.some(d =>
            d.type === 'BEARISH_DIVERGENCE' || d.type === 'BEARISH'
        );

        let bonus = 0;

        // Bonus for aligned momentum
        if (bias === 'BULLISH' && hasBullishDiv) {
            bonus += 10; // Momentum confirmation
        } else if (bias === 'BEARISH' && hasBearishDiv) {
            bonus += 10;
        }

        // Penalty for conflicting momentum
        if (bias === 'BULLISH' && hasBearishDiv) {
            bonus -= 15; // Fighting momentum
        } else if (bias === 'BEARISH' && hasBullishDiv) {
            bonus -= 15;
        }

        return bonus;
    }

    /**
     * Check if prediction path crosses volume profile resistance
     * @private
     */
    static _checkPathClearance(bias, marketState) {
        const vp = marketState.volumeProfile;
        if (!vp || !vp.valueArea) {
            return { clear: true, penalty: 0 };
        }

        const currentPrice = marketState.currentPrice || marketState.price;
        const poc = vp.poc;
        const vah = vp.valueArea.high; // Value Area High
        const val = vp.valueArea.low;  // Value Area Low

        let penalty = 0;

        // Bullish prediction crossing resistance
        if (bias === 'BULLISH') {
            // If price is below POC and trying to go up
            if (currentPrice < poc) {
                penalty += 15; // POC is a resistance
            }

            // If price is below VAH and trying to go up
            if (currentPrice < vah) {
                penalty += 10; // VAH is a resistance
            }
        }

        // Bearish prediction crossing support
        if (bias === 'BEARISH') {
            // If price is above POC and trying to go down
            if (currentPrice > poc) {
                penalty += 15; // POC is a support
            }

            // If price is above VAL and trying to go down
            if (currentPrice > val) {
                penalty += 10; // VAL is a support
            }
        }

        return {
            clear: penalty === 0,
            penalty: Math.min(penalty, 30) // Cap penalty at 30%
        };
    }

    /**
     * Generate single-sentence reason
     * @private
     */
    static _generateReason(bias, marketState, probabilities) {
        if (bias === 'NO_EDGE') {
            return 'Conflicting signals and low volatility indicate no clear trading edge.';
        }

        if (bias === 'NEUTRAL') {
            return 'Market in consolidation. Awaiting directional catalyst.';
        }

        const components = [];

        // HTF bias
        const htfBias = marketState.mtf?.globalBias;
        if (htfBias === bias) {
            components.push('HTF liquidity draw');
        }

        // Structure
        if (marketState.mtfBiasAligned) {
            components.push('MTF structure alignment');
        } else {
            const bosCount = marketState.structures?.filter(s => s.markerType === 'BOS').length || 0;
            if (bosCount > 0) components.push('LTF BOS confluence');
        }

        // Liquidity
        if (probabilities.liquidityRun?.probability > 60) {
            components.push(`${probabilities.liquidityRun.type.toLowerCase()} liquidity target`);
        }

        // Volume
        if (marketState.volumeAnalysis?.isInstitutional) {
            components.push('institutional volume');
        }

        if (components.length === 0) {
            components.push('technical alignment');
        }

        return components.join(' + ') + '.';
    }

    /**
     * Check if prediction should be suppressed (guardrails)
     * @param {Object} marketState - Current market state
     * @param {Object} probabilities - Probability calculations
     * @returns {boolean} True if prediction should be shown
     */
    static shouldShowPrediction(marketState, probabilities) {
        // Suppress if high-impact news pending
        if (marketState.activeShock?.severity === 'HIGH') {
            return false;
        }

        // Suppress if HTF/LTF conflict
        const htfBias = marketState.mtf?.globalBias || 'NEUTRAL';
        const ltfBias = marketState.trend?.direction || 'NEUTRAL';

        if (htfBias !== 'NEUTRAL' && ltfBias !== 'NEUTRAL' && htfBias !== ltfBias) {
            return false;
        }

        // Suppress if all probabilities are weak
        const maxProb = Math.max(
            probabilities.continuation || 0,
            probabilities.reversal || 0,
            probabilities.consolidation || 0
        );

        // Phase 52 Upgrade: Obligation Gating
        const isObligated = marketState.obligations?.state === 'OBLIGATED';

        // If Market is "Free Roaming" (No Obligation), we require massive statistical edge to predict.
        // If Market is "Obligated" (Has Magnet), we accept standard conviction (40%).
        // Lowered from 65 to 60 to be more responsive to standard trends.
        const minThreshold = isObligated ? 40 : 60;

        if (maxProb < minThreshold) {
            return false;
        }

        return true;
    }
}
