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

        // 2. Select optimized target (Magnet Zone Targeting)
        const target = this._selectTarget(bias, setups, probabilities, marketState);

        // 3. Define invalidation
        const invalidation = this._defineInvalidation(bias, setups, marketState);

        // 4. Calculate confidence
        const confidence = this._calculateConfidence(bias, probabilities, marketState);

        // 5. Generate reason
        const reason = this._generateReason(bias, marketState, probabilities);

        // 6. Generate Edge Score (Phase 51)
        const relevantSetup = setups.find(s => s.direction === bias) || setups[0];
        const edge = EdgeScoringEngine.calculateScore(relevantSetup, marketState, probabilities, analysis.symbol);

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

            // Learning Metadata (Phase 52)
            strategy: relevantSetup?.strategy || 'GENERIC',
            regime: marketState.regime,
            obligationState: marketState.obligations?.state || 'FREE_ROAMING',

            // Market State Snapshot for Audit
            snapshot: {
                price: marketState.price,
                regime: marketState.regime,
                volatility: marketState.volatility,
                trend: marketState.trend?.direction
            },

            // UI Metadata for PredictionBadge
            meta: {
                continuationProb: probabilities.continuation,
                reversalProb: probabilities.reversal,
                htfBias: marketState.mtf?.globalBias || 'NEUTRAL'
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
            // Check for high-impact rejection (Guard against fakeouts)
            const rejection = this._detectRecentRejection(marketState);
            if (rejection && rejection.direction === htfBias) {
                // Rejection from LTF counter-trend confirms HTF dominance
                return htfBias;
            }

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
     * Magnet Zone Target Selection (Multi-POI overlapping)
     * @private
     */
    static _selectTarget(bias, setups, probabilities, marketState) {
        if (bias === 'NO_EDGE' || bias === 'NEUTRAL' || bias.includes('WAIT')) {
            return null;
        }

        // 1. Prioritize Overlapping Magnet Zones (Institutional Confluence)
        const pois = this._getRelevantPOIs(bias, marketState);
        if (pois.length > 1) {
            // Weighted center of closest 2-3 POIs
            const cluster = pois.slice(0, 3);
            const weightedSum = cluster.reduce((sum, p) => sum + p.price * p.weight, 0);
            const totalWeight = cluster.reduce((sum, p) => sum + p.weight, 0);
            return weightedSum / totalWeight;
        }

        // 2. Fallback to Liquidity target if probability is strong
        if (probabilities.liquidityRun?.probability > 60) {
            return probabilities.liquidityRun.target;
        }

        // 3. Setup Target
        const relevantSetup = setups.find(s => s.direction === bias);
        if (relevantSetup && relevantSetup.targets?.length > 0) {
            return relevantSetup.targets[0].price;
        }

        return pois.length > 0 ? pois[0].price : null;
    }

    /**
     * Extract and weight Points of Interest (POIs)
     * @private
     */
    static _getRelevantPOIs(bias, marketState) {
        const pois = [];
        const currentPrice = marketState.price;

        // Liquidity Pools (Weight: 1.0)
        (marketState.liquidityPools || []).forEach(p => {
            const isTarget = (bias === 'BULLISH' && p.price > currentPrice) ||
                (bias === 'BEARISH' && p.price < currentPrice);
            if (isTarget) pois.push({ price: p.price, weight: 1.0, type: 'LIQUIDITY' });
        });

        // Order Blocks (Weight: 0.8)
        (marketState.orderBlocks || []).forEach(ob => {
            const obPrice = (ob.high + ob.low) / 2;
            const isTarget = (bias === 'BULLISH' && obPrice > currentPrice) ||
                (bias === 'BEARISH' && obPrice < currentPrice);
            if (isTarget) pois.push({ price: obPrice, weight: 0.8, type: 'OB' });
        });

        // Gaps (Weight: 0.6)
        (marketState.fvgs || []).forEach(f => {
            const gapPrice = (f.top + f.bottom) / 2;
            const isTarget = (bias === 'BULLISH' && gapPrice > currentPrice) ||
                (bias === 'BEARISH' && gapPrice < currentPrice);
            if (isTarget) pois.push({ price: gapPrice, weight: 0.6, type: 'GAP' });
        });

        // Sort by proximity to current price
        return pois.sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice));
    }

    /**
     * Detect candle wick rejections from key levels
     * @private
     */
    static _detectRecentRejection(marketState) {
        if (!marketState.lastCandle) return null;
        const c = marketState.lastCandle;
        const bodySize = Math.abs(c.open - c.close);
        const candleRange = c.high - c.low;
        const upperWick = c.high - Math.max(c.open, c.close);
        const lowerWick = Math.min(c.open, c.close) - c.low;

        // Significant wick rejection (> 60% of candle range)
        if (upperWick > candleRange * 0.6) return { direction: 'BEARISH', strength: upperWick / candleRange };
        if (lowerWick > candleRange * 0.6) return { direction: 'BULLISH', strength: lowerWick / candleRange };

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

        // Phase 52: Trap Zone Penalty
        if (marketState.trapZones && (marketState.trapZones.warning || marketState.trapZones.count > 0)) {
            confidence -= 25; // Significant penalty for potential traps
        }

        // Phase 71: Velocity Awareness (ATR/Momentum scaling)
        const velocity = marketState.velocity || 0;
        if (velocity > 1.2) confidence += 15; // High momentum support
        else if (velocity < 0.5) confidence -= 10; // Stagnant, lower conviction

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
            components.push('insitutional volume');
        }

        // Velocity & Gaps (Phase 71)
        if (marketState.velocity > 1.2) components.push('velocity-supported');
        if (marketState.relevantGap) components.push('magnetic imbalance');

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
        // 1. Suppress if high-impact news pending
        if (marketState.activeShock?.severity === 'HIGH') {
            return false;
        }

        // 2. Suppress if HTF/LTF conflict
        const htfBias = marketState.mtf?.globalBias || 'NEUTRAL';
        const ltfBias = marketState.trend?.direction || 'NEUTRAL';

        if (htfBias !== 'NEUTRAL' && ltfBias !== 'NEUTRAL' && htfBias !== ltfBias) {
            // Only allow if we have a VERY strong reversal confirmation (Prob > 75%)
            if (probabilities.reversal < 75) {
                return false;
            }
        }

        // 3a. Suppress if in Trap Zone (Phase 52)
        if (marketState.trapZones && marketState.trapZones.warning) {
            // console.log(`[ACCURACY] Suppressing prediction due to Trap Zone: ${marketState.trapZones.warning}`);
            return false;
        }

        // 3. Strategic Conflict Check: Market Magnet (Phase 59)
        // If there is a massive magnet (Urgency > 85) in the opposite direction, DO NOT PREDICT.
        const primaryOb = marketState.obligations?.primaryObligation;
        if (primaryOb && primaryOb.urgency > 85) {
            const magnetDir = primaryOb.price > marketState.currentPrice ? 'BULLISH' : 'BEARISH';
            const { continuation, reversal } = probabilities;
            const predDir = continuation > reversal ? ltfBias : (ltfBias === 'BULLISH' ? 'BEARISH' : 'BULLISH');

            if (magnetDir !== predDir) {
                // console.log(`[ACCURACY] Suppressing prediction due to Magnet Conflict: Magnet ${magnetDir} vs Pred ${predDir}`);
                return false;
            }
        }

        // 4. Suppress if all probabilities are weak
        const maxProb = Math.max(
            probabilities.continuation || 0,
            probabilities.reversal || 0,
            probabilities.consolidation || 0
        );

        // Phase 52 Upgrade: Obligation Gating
        const isObligated = marketState.obligations?.state === 'OBLIGATED';

        // ACCURACY UPGRADE: Increased thresholds for "Free Roaming" (No Magnet/Obligation)
        // If we are just trend following without a clear "Need" to move, require 70% confidence.
        const minThreshold = isObligated ? 45 : 70;

        if (maxProb < minThreshold) {
            return false;
        }

        return true;
    }
}
