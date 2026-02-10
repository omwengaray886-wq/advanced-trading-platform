/**
 * Directional Confidence Gate (Phase 56)
 * 
 * Multi-layered validation engine to improve directional accuracy.
 * Validates trade direction through 5 independent checks before confirming bias.
 */

import { marketData } from '../services/marketData.js';

export class DirectionalConfidenceGate {
    /**
     * Validate trade direction with multi-factor analysis
     * @param {Object} setup - Trade setup with direction
     * @param {Object} marketState - Current market state
     * @param {Array} candles - OHLC candles for current timeframe
     * @param {string} symbol - Trading symbol
     * @returns {Object} Validation result with confidence score
     */
    static async validateDirection(setup, marketState, candles, symbol) {
        if (!setup || !setup.direction) {
            return { isValid: false, confidence: 0, failedChecks: ['No setup direction'] };
        }

        const checks = {
            multiTimeframeAlignment: await this.checkMultiTFTrend(setup.direction, symbol, candles),
            volumeConfirmation: this.checkVolumeDirection(setup.direction, candles),
            liquiditySweepClear: this.checkNoActiveSweep(setup.direction, marketState, candles),
            breakoutAuthenticity: this.checkBreakoutQuality(setup, candles, marketState),
            priceActionConsistency: this.checkPriceAction(setup.direction, candles),
            marketObligation: this.checkMarketObligation(setup.direction, marketState),
            marketCycle: this.checkAMDCycle(setup.direction, marketState),
            momentumAlignment: this.checkMomentumAlignment(setup.direction, marketState)
        };

        // Calculate weighted confidence (Phase 73 Upgrade)
        const weights = {
            multiTimeframeAlignment: 0.35, // Increased from 0.20
            volumeConfirmation: 0.15,      // Decreased from 0.20
            liquiditySweepClear: 0.15,
            breakoutAuthenticity: 0.05,    // Decreased from 0.10
            priceActionConsistency: 0.05,
            marketObligation: 0.15,        // Decreased from 0.20
            marketCycle: 0.05,
            momentumAlignment: 0.15       // New factor (Phase 76)
        };

        let confidence = 0;
        const failedChecks = [];

        for (const [check, result] of Object.entries(checks)) {
            confidence += result.score * weights[check];
            if (!result.passed) {
                failedChecks.push(result.reason);
            }
        }

        const isValid = confidence >= 0.65; // Increased from 0.5 for Phase 73

        // Phase 73: Stagnation Filter
        // If price velocity is near-zero, the market is dead and directional arrows are unreliable.
        const velocity = marketState.velocity || 0;
        if (velocity < 0.3) {
            return {
                isValid: false,
                confidence: Math.min(confidence, 0.3),
                failedChecks: [...failedChecks, 'Market Stagnation: Price velocity too low for reliable direction'],
                checkDetails: { ...checks, stagnation: { passed: false, score: 0.1, reason: 'Velocity < 0.3' } }
            };
        }

        return {
            isValid,
            confidence: parseFloat(confidence.toFixed(2)),
            failedChecks,
            checkDetails: checks
        };
    }

    /**
     * Check multi-timeframe trend alignment
     * Validates that 3+ timeframes agree on direction
     */
    static async checkMultiTFTrend(direction, symbol, currentCandles) {
        try {
            // Fetch multiple timeframes concurrently
            const timeframes = ['15m', '1h', '4h', '1d'];
            const mtfData = await marketData.fetchMultiTimeframe(symbol, timeframes, 50);

            // Analyze trend for each timeframe
            const trends = timeframes.map(tf => {
                const candles = mtfData[tf];
                if (!candles || candles.length < 20) return null;
                return this.calculateTrendDirection(candles);
            }).filter(t => t !== null);

            if (trends.length < 2) {
                // Not enough data, neutral score
                return { passed: true, score: 0.5, reason: 'Insufficient multi-TF data' };
            }

            // Normalize direction strings
            const normalizedDirection = direction === 'BULLISH' ? 'LONG' : direction === 'BEARISH' ? 'SHORT' : direction;

            // Count aligned timeframes
            const aligned = trends.filter(t => t === normalizedDirection).length;
            const alignmentRatio = aligned / trends.length;

            let passed = true;
            let score = alignmentRatio;
            let reason = `Multi-TF alignment: ${aligned}/${trends.length} timeframes agree`;

            if (alignmentRatio < 0.75) { // Increased from 0.5 for Phase 73
                passed = false;
                reason = `Multi-TF conflict: Only ${aligned}/${trends.length} timeframes support ${normalizedDirection}. 75% alignment required for 100% precision target.`;
                score *= 0.4; // Heavier penalty for conflict
            }

            return { passed, score, reason, details: { aligned, total: trends.length } };
        } catch (error) {
            console.error('Multi-TF check failed:', error);
            return { passed: true, score: 0.5, reason: 'Multi-TF analysis unavailable' };
        }
    }

    /**
     * Calculate trend direction from candles using EMA crossover
     */
    static calculateTrendDirection(candles) {
        if (!candles || candles.length < 20) return null;

        const closes = candles.map(c => c.close);
        const ema20 = this.calculateEMA(closes, 20);
        const ema50 = this.calculateEMA(closes, 50);

        if (!ema20 || !ema50) return null;

        const currentEMA20 = ema20[ema20.length - 1];
        const currentEMA50 = ema50[ema50.length - 1];

        if (currentEMA20 > currentEMA50) return 'LONG';
        if (currentEMA20 < currentEMA50) return 'SHORT';
        return 'NEUTRAL';
    }

    /**
     * Calculate Exponential Moving Average
     */
    static calculateEMA(data, period) {
        if (!data || data.length < period) return null;

        const multiplier = 2 / (period + 1);
        const ema = [data[0]];

        for (let i = 1; i < data.length; i++) {
            ema.push((data[i] - ema[i - 1]) * multiplier + ema[i - 1]);
        }

        return ema;
    }

    /**
     * Check volume-direction alignment
     * Ensures volume supports the price move
     */
    static checkVolumeDirection(direction, candles) {
        if (!candles || candles.length < 5) {
            return { passed: true, score: 0.5, reason: 'Insufficient volume data' };
        }

        const recentCandles = candles.slice(-10);

        // Calculate demand vs supply volume
        let demandVolume = 0;
        let supplyVolume = 0;

        recentCandles.forEach(c => {
            const isBullish = c.close > c.open;
            const volume = (c.high - c.low) * 1000; // Estimate volume by range

            if (isBullish) {
                demandVolume += volume;
            } else {
                supplyVolume += volume;
            }
        });

        const totalVolume = demandVolume + supplyVolume;
        if (totalVolume === 0) {
            return { passed: true, score: 0.5, reason: 'No volume detected' };
        }

        const demandRatio = demandVolume / totalVolume;
        const supplyRatio = supplyVolume / totalVolume;

        const normalizedDirection = direction === 'BULLISH' ? 'LONG' : direction === 'BEARISH' ? 'SHORT' : direction;

        let passed = true;
        let score = 0.5;
        let reason = '';

        if (normalizedDirection === 'LONG') {
            score = demandRatio;
            if (demandRatio > 0.6) {
                passed = true;
                reason = `Strong demand volume (${(demandRatio * 100).toFixed(0)}%)`;
            } else if (demandRatio < 0.4) {
                passed = false;
                score = 0.3;
                reason = `Volume divergence: Weak demand (${(demandRatio * 100).toFixed(0)}%)`;
            } else {
                reason = `Neutral demand volume (${(demandRatio * 100).toFixed(0)}%)`;
            }
        } else if (normalizedDirection === 'SHORT') {
            score = supplyRatio;
            if (supplyRatio > 0.6) {
                passed = true;
                reason = `Strong supply volume (${(supplyRatio * 100).toFixed(0)}%)`;
            } else if (supplyRatio < 0.4) {
                passed = false;
                score = 0.3;
                reason = `Volume divergence: Weak supply (${(supplyRatio * 100).toFixed(0)}%)`;
            } else {
                reason = `Neutral supply volume (${(supplyRatio * 100).toFixed(0)}%)`;
            }
        }

        return { passed, score, reason, details: { demandRatio, supplyRatio } };
    }

    /**
     * Check for active liquidity sweeps that oppose direction
     */
    static checkNoActiveSweep(direction, marketState, candles) {
        if (!marketState.liquiditySweep) {
            return { passed: true, score: 1.0, reason: 'No active sweep detected' };
        }

        const sweep = marketState.liquiditySweep;
        const currentTime = candles[candles.length - 1].time;
        const sweepAge = currentTime - (sweep.time || 0);
        const barsAgo = sweepAge / (60 * 60); // Assume 1H candles

        // If sweep is old (>10 bars), ignore it
        if (barsAgo > 10) {
            return { passed: true, score: 1.0, reason: 'Sweep is stale' };
        }

        const normalizedDirection = direction === 'BULLISH' ? 'LONG' : direction === 'BEARISH' ? 'SHORT' : direction;

        // Determine sweep direction
        const sweepDirection = sweep.side === 'ABOVE' ? 'SHORT' : 'LONG'; // Sweep above = likely reversal down

        if (sweepDirection === normalizedDirection && sweep.isConfirmedByAbsorption) {
            // Trading WITH sweep direction after absorption = good
            return { passed: true, score: 1.0, reason: 'Trading with confirmed sweep reversal' };
        } else if (sweepDirection !== normalizedDirection) {
            // Trading against sweep = dangerous
            return {
                passed: false,
                score: 0.2,
                reason: `Active ${sweep.side} sweep suggests ${sweepDirection} reversal`
            };
        }

        return { passed: true, score: 0.7, reason: 'Sweep detected but uncertain' };
    }

    /**
     * Validate breakout quality (volume, close strength, wick rejection)
     */
    static checkBreakoutQuality(setup, candles, marketState) {
        if (!candles || candles.length < 20) {
            return { passed: true, score: 0.5, reason: 'Insufficient data for breakout check' };
        }

        const lastCandle = candles[candles.length - 1];
        const avgVolume = candles.slice(-20, -1).reduce((sum, c) => sum + (c.high - c.low), 0) / 19;
        const currentVolume = lastCandle.high - lastCandle.low;

        const volumeRatio = currentVolume / avgVolume;
        const bodySize = Math.abs(lastCandle.close - lastCandle.open);
        const totalSize = lastCandle.high - lastCandle.low;
        const bodyPercentage = bodySize / totalSize;

        let score = 0.5;
        let passed = true;
        const issues = [];

        // Check 1: Volume must be >150% of average
        if (volumeRatio < 1.5) {
            score -= 0.2;
            issues.push('Low volume breakout');
        } else {
            score += 0.2;
        }

        // Check 2: Candle close must be >70% through the range
        if (bodyPercentage < 0.7) {
            score -= 0.15;
            issues.push('Weak candle close');
        } else {
            score += 0.15;
        }

        // Check 3: Wick rejection check (wicks <30% of body)
        const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
        const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;
        const maxWick = Math.max(upperWick, lowerWick);

        if (maxWick / bodySize > 0.3 && bodySize > 0) {
            score -= 0.15;
            issues.push('Large wick rejection');
        } else {
            score += 0.15;
        }

        score = Math.max(0, Math.min(1, score));
        passed = score >= 0.5;

        const reason = passed
            ? 'Strong breakout confirmed'
            : `Weak breakout: ${issues.join(', ')}`;

        return { passed, score, reason, details: { volumeRatio, bodyPercentage } };
    }

    /**
     * Check price action consistency (no indecision patterns)
     */
    static checkPriceAction(direction, candles) {
        if (!candles || candles.length < 3) {
            return { passed: true, score: 0.5, reason: 'Insufficient candles for PA check' };
        }

        const recentCandles = candles.slice(-3);
        let dojiCount = 0;

        recentCandles.forEach(c => {
            const bodySize = Math.abs(c.close - c.open);
            const totalSize = c.high - c.low;

            // Doji: body <20% of total range
            if (totalSize > 0 && bodySize / totalSize < 0.2) {
                dojiCount++;
            }
        });

        let passed = true;
        let score = 1.0;
        let reason = 'Clean price action';

        if (dojiCount >= 2) {
            passed = false;
            score = 0.3;
            reason = 'Indecision detected (multiple doji candles)';
        } else if (dojiCount === 1) {
            score = 0.7;
            reason = 'Slight indecision detected';
        }

        return { passed, score, reason, details: { dojiCount } };
    }

    /**
     * Check if direction aligns with a primary market magnet
     */
    static checkMarketObligation(direction, marketState) {
        const magnet = marketState.primaryMagnet || marketState.obligations?.primaryObligation;
        if (!magnet) return { passed: true, score: 0.5, reason: 'No significant market obligation' };

        const currentPrice = marketState.currentPrice;
        const magnetDirection = magnet.price > currentPrice ? 'LONG' : 'SHORT';
        const normalizedDirection = direction === 'BULLISH' ? 'LONG' : direction === 'BEARISH' ? 'SHORT' : direction;

        if (magnetDirection === normalizedDirection) {
            return {
                passed: true,
                score: Math.max(0.7, magnet.urgency / 100),
                reason: `Aligned with major magnet: ${magnet.type} (${magnet.urgency} urgency)`
            };
        } else if (magnet.urgency > 70) {
            return {
                passed: false,
                score: 0.2,
                reason: `Conflicting magnet: Market needs to take ${magnet.type} at ${magnet.price}`
            };
        }

        return { passed: true, score: 0.5, reason: 'Neutral magnet influence' };
    }

    /**
     * Check if direction aligns with institutional AMD cycle
     */
    static checkAMDCycle(direction, marketState) {
        const cycle = marketState.marketCycle;
        if (!cycle || cycle.phase === 'UNKNOWN') {
            return { passed: true, score: 0.5, reason: 'Neutral market cycle' };
        }

        const normalizedDirection = direction === 'BULLISH' ? 'LONG' : direction === 'BEARISH' ? 'SHORT' : direction;

        if (cycle.phase === 'MANIPULATION') {
            // High risk of Judas Swing (Fakeout)
            const isJudasDirection = cycle.direction === normalizedDirection;
            if (isJudasDirection) {
                return {
                    passed: false,
                    score: 0.2,
                    reason: 'Likely Manipulation / Judas Swing detected'
                };
            } else {
                return {
                    passed: true,
                    score: 0.8,
                    reason: 'Fading suspected manipulation'
                };
            }
        }

        if (cycle.phase === 'ACCUMULATION') {
            return {
                passed: true,
                score: 0.4,
                reason: 'Premature entry: Accumulation phase usually requires expansion'
            };
        }

        if (cycle.phase === 'DISTRIBUTION') {
            const isTrendAligned = cycle.direction === normalizedDirection;
            return {
                passed: isTrendAligned,
                score: isTrendAligned ? 0.9 : 0.1,
                reason: isTrendAligned ? 'Riding institutional distribution' : 'Trading against institutional distribution'
            };
        }

        return { passed: true, score: 0.5, reason: 'Cycle in transition' };
    }

    /**
     * Check if direction is supported by momentum cluster (RSI/Stochastic/MACD)
     */
    static checkMomentumAlignment(direction, marketState) {
        const { indicators, stochastic } = marketState;
        const normalizedDirection = direction === 'BULLISH' ? 'LONG' : direction === 'BEARISH' ? 'SHORT' : direction;

        let score = 0.5;
        let reasons = [];

        // 1. Stochastic Check
        if (stochastic && stochastic.signals) {
            const signal = stochastic.signals[stochastic.signals.length - 1];
            if (signal) {
                const signalDir = (signal.type === 'BULLISH_CROSS' || signal.type === 'OVERSOLD') ? 'LONG' : 'SHORT';
                if (signalDir === normalizedDirection) score += 0.2;
                else score -= 0.1;
                reasons.push(`Stochastic: ${signal.type}`);
            }
        }

        // 2. RSI Check
        const rsi = indicators?.rsi;
        if (rsi && rsi.length > 0) {
            const lastRSI = rsi[rsi.length - 1];
            if (normalizedDirection === 'LONG' && lastRSI < 40) score += 0.1;
            if (normalizedDirection === 'SHORT' && lastRSI > 60) score += 0.1;

            // Extreme overextension penalty
            if (normalizedDirection === 'LONG' && lastRSI > 75) score -= 0.3;
            if (normalizedDirection === 'SHORT' && lastRSI < 25) score -= 0.3;
        }

        score = Math.max(0, Math.min(1, score));
        return {
            passed: score >= 0.5,
            score,
            reason: reasons.length > 0 ? `Momentum: ${reasons.join(', ')}` : 'Neutral momentum'
        };
    }
}
