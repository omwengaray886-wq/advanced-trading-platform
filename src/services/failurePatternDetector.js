/**
 * Failure Pattern Detection
 * 
 * Detects repeating failed setups to predict trap zones.
 * Identifies patterns like failed FVGs, fake breakouts, and stop-runs without displacement.
 */

export class FailurePatternDetector {
    /**
     * Detect all failure patterns in market
     * @param {Array} candles - Candlestick data
     * @param {Array} structures - Market structures
     * @param {Array} gaps - Fair Value Gaps
     * @returns {Array} - Detected failure patterns
     */
    static detectAllPatterns(candles, structures, gaps) {
        const patterns = [];

        // 1. Failed FVG Continuation
        const failedFVGs = this.detectFailedFVGContinuation(candles, gaps);
        patterns.push(...failedFVGs);

        // 2. Failed Breakouts
        const failedBreakouts = this.detectFailedBreakouts(candles, structures);
        patterns.push(...failedBreakouts);

        // 3. Stop-Runs Without Displacement
        const stopRuns = this.detectStopRunsWithoutDisplacement(candles, structures);
        patterns.push(...stopRuns);

        // 4. Fake Trend Continuation
        const fakeTrends = this.detectFakeTrendContinuation(candles, structures);
        patterns.push(...fakeTrends);

        return patterns;
    }

    /**
     * Detect failed FVG continuation (price rejects imbalance instead of filling)
     * @param {Array} candles - Candlestick data
     * @param {Array} gaps - Fair Value Gaps
     * @returns {Array} - Failed FVG patterns
     */
    static detectFailedFVGContinuation(candles, gaps) {
        if (!gaps || gaps.length === 0) return [];

        const failures = [];
        const recentCandles = candles.slice(-50);

        gaps.forEach(gap => {
            // Check if price entered FVG but rejected
            const gapMidpoint = (gap.highPrice + gap.lowPrice) / 2;

            const candlesInGap = recentCandles.filter(c =>
                c.low <= gapMidpoint && c.high >= gapMidpoint
            );

            if (candlesInGap.length > 0) {
                const lastTouch = candlesInGap[candlesInGap.length - 1];
                const indexInRecent = recentCandles.indexOf(lastTouch);

                // Check if price reversed after touching
                if (indexInRecent < recentCandles.length - 3) {
                    const afterCandles = recentCandles.slice(indexInRecent + 1, indexInRecent + 4);

                    const reversed = gap.type === 'BULLISH' ?
                        afterCandles.every(c => c.close < lastTouch.close) :
                        afterCandles.every(c => c.close > lastTouch.close);

                    if (reversed) {
                        failures.push({
                            type: 'FAILED_FVG',
                            location: gapMidpoint,
                            implication: gap.type === 'BULLISH' ? 'SHORT_TRAP' : 'LONG_TRAP',
                            confidence: 0.70,
                            timestamp: lastTouch.time,
                            reason: `FVG rejected instead of filled - ${gap.type} continuation failed`
                        });
                    }
                }
            }
        });

        return failures;
    }

    /**
     * Detect failed breakouts (BOS that reverses immediately)
     * @param {Array} candles - Candlestick data
     * @param {Array} structures - Market structures
     * @returns {Array} - Failed breakout patterns
     */
    static detectFailedBreakouts(candles, structures) {
        if (!structures || structures.length === 0) return [];

        const failures = [];
        const recentStructures = structures.slice(-20);

        recentStructures.forEach(structure => {
            if (structure.markerType === 'BOS' && structure.status === 'FAILED') {
                failures.push({
                    type: 'FAILED_BREAKOUT',
                    location: structure.price,
                    implication: structure.direction === 'up' ? 'BULL_TRAP' : 'BEAR_TRAP',
                    confidence: 0.75,
                    timestamp: structure.time,
                    reason: `BOS at ${(structure.price || 0).toFixed(5)} failed - immediate reversal detected`
                });
            }
        });

        return failures;
    }

    /**
     * Detect stop-runs without displacement (sweep but no follow-through)
     * @param {Array} candles - Candlestick data
     * @param {Array} structures - Market structures
     * @returns {Array} - Stop-run patterns
     */
    static detectStopRunsWithoutDisplacement(candles, structures) {
        if (!structures || structures.length === 0) return [];

        const failures = [];
        const recentStructures = structures.slice(-15);

        // Find sweep markers
        const sweeps = recentStructures.filter(s => s.markerType === 'SWEEP' || s.type === 'LIQUIDITY_SWEEP');

        sweeps.forEach(sweep => {
            // Check if there was strong directional move after sweep
            const sweepIndex = structures.indexOf(sweep);
            const afterStructures = structures.slice(sweepIndex + 1, sweepIndex + 5);

            // Look for BOS in sweep direction
            const hasBOS = afterStructures.some(s =>
                s.markerType === 'BOS' && s.direction === sweep.direction
            );

            // No BOS after sweep = failed liquidity grab
            if (!hasBOS && sweep.displacement === false) {
                failures.push({
                    type: 'STOP_RUN_NO_DISPLACEMENT',
                    location: sweep.price,
                    implication: sweep.type === 'BUY_SIDE' ? 'LONG_TRAP' : 'SHORT_TRAP',
                    confidence: 0.80,
                    timestamp: sweep.time,
                    reason: 'Liquidity sweep without follow-through indicates false breakout'
                });
            }
        });

        return failures;
    }

    /**
     * Detect fake trend continuation (higher high fails to sustain)
     * @param {Array} candles - Candlestick data
     * @param {Array} structures - Market structures
     * @returns {Array} - Fake trend patterns
     */
    static detectFakeTrendContinuation(candles, structures) {
        if (candles.length < 30 || !structures) return [];

        const failures = [];
        const recent = candles.slice(-30);

        // Find higher highs / lower lows
        for (let i = 10; i < recent.length - 5; i++) {
            const current = recent[i];
            const before = recent.slice(i - 10, i);
            const after = recent.slice(i + 1, i + 6);

            const prevHigh = Math.max(...before.map(c => c.high));
            const prevLow = Math.min(...before.map(c => c.low));

            // Higher high that failed
            if (current.high > prevHigh) {
                const sustained = after.some(c => c.high > current.high * 0.998);
                const reversed = after.filter(c => c.close < current.low).length >= 3;

                if (!sustained && reversed) {
                    failures.push({
                        type: 'FAKE_TREND_CONTINUATION',
                        location: current.high,
                        implication: 'BULL_TRAP',
                        confidence: 0.65,
                        timestamp: current.time,
                        reason: 'Higher high failed to sustain - bearish reversal signal'
                    });
                }
            }

            // Lower low that failed
            if (current.low < prevLow) {
                const sustained = after.some(c => c.low < current.low * 1.002);
                const reversed = after.filter(c => c.close > current.high).length >= 3;

                if (!sustained && reversed) {
                    failures.push({
                        type: 'FAKE_TREND_CONTINUATION',
                        location: current.low,
                        implication: 'BEAR_TRAP',
                        confidence: 0.65,
                        timestamp: current.time,
                        reason: 'Lower low failed to sustain - bullish reversal signal'
                    });
                }
            }
        }

        return failures;
    }

    /**
     * Get trap zones summary
     * @param {Array} patterns - Detected failure patterns
     * @returns {Object} - Trap zone analysis
     */
    static getTrapZones(patterns) {
        if (!patterns || patterns.length === 0) {
            return {
                count: 0,
                bullTraps: [],
                bearTraps: [],
                warning: null
            };
        }

        const bullTraps = patterns.filter(p =>
            p.implication === 'BULL_TRAP' || p.implication === 'LONG_TRAP'
        );

        const bearTraps = patterns.filter(p =>
            p.implication === 'BEAR_TRAP' || p.implication === 'SHORT_TRAP'
        );

        // Generate warning if many traps detected
        let warning = null;
        if (patterns.length >= 3) {
            warning = `HIGH TRAP ZONE ACTIVITY: ${patterns.length} failed patterns detected. Exercise caution on breakouts.`;
        }

        return {
            count: patterns.length,
            bullTraps,
            bearTraps,
            warning,
            mostRecentTrap: patterns[patterns.length - 1]
        };
    }

    /**
     * Check if price is near a known trap zone
     * @param {number} price - Current price
     * @param {Array} patterns - Detected patterns
     * @param {number} tolerance - Price tolerance (default 0.002 = 0.2%)
     * @returns {Object|null} - Trap zone if near one
     */
    static isNearTrapZone(price, patterns, tolerance = 0.002) {
        if (!patterns || patterns.length === 0) return null;

        const nearbyTraps = patterns.filter(p => {
            const distance = Math.abs(p.location - price) / price;
            return distance < tolerance;
        });

        if (nearbyTraps.length > 0) {
            return {
                warning: true,
                trapType: nearbyTraps[0].implication,
                location: nearbyTraps[0].location,
                confidence: nearbyTraps[0].confidence,
                reason: nearbyTraps[0].reason
            };
        }

        return null;
    }
}
