import { calculateOBV } from '../analysis/indicators.js';

/**
 * Wyckoff Engine
 * Detects institutional accumulation and distribution phases
 * using Richard Wyckoff's methodology (5 phases)
 */
export class WyckoffEngine {
    /**
     * Detect current Wyckoff phase
     * @param {Array} candles - Historical price data
     * @param {Object} marketState - Current market context
     * @returns {Object} Phase information
     */
    static detectPhase(candles, marketState) {
        if (!candles || candles.length < 50) {
            return { phase: 'UNKNOWN', confidence: 0 };
        }

        const recent = candles.slice(-50);
        const obv = calculateOBV(recent);
        const volumeProfile = this._analyzeVolume(recent);
        const priceAction = this._analyzePriceAction(recent);
        const range = this._detectRange(recent);

        // Phase A: Stopping Action (Selling/Buying Climax)
        const phaseA = this._detectPhaseA(recent, obv, volumeProfile);
        if (phaseA.detected) return phaseA;

        // Phase B: Building a Cause (Range Bound)
        const phaseB = this._detectPhaseB(recent, range, volumeProfile);
        if (phaseB.detected) return phaseB;

        // Phase C: Test (Spring or Upthrust)
        const phaseC = this._detectPhaseC(recent, range, obv);
        if (phaseC.detected) return phaseC;

        // Phase D: Sign of Strength/Weakness
        const phaseD = this._detectPhaseD(recent, range, obv);
        if (phaseD.detected) return phaseD;

        // Phase E: Result (Markup or Markdown)
        const phaseE = this._detectPhaseE(recent, priceAction);
        if (phaseE.detected) return phaseE;

        return { phase: 'TRANSITION', confidence: 0.5 };
    }

    /**
     * Phase A: Preliminary Support/Resistance
     * High volume climax followed by rally/reaction
     */
    static _detectPhaseA(candles, obv, volumeProfile) {
        const lastIdx = candles.length - 1;
        const current = candles[lastIdx];
        const last10 = candles.slice(-10);

        // Look for climax volume
        const avgVolume = volumeProfile.average;
        const hasClimaxVolume = volumeProfile.recent.some(v => v > avgVolume * 2);

        // Check for sharp reversal
        const priceRange = Math.max(...last10.map(c => c.high)) - Math.min(...last10.map(c => c.low));
        const avgCandle = priceRange / 10;
        const lastMove = Math.abs(current.close - candles[lastIdx - 5].close);
        const isSharp = lastMove > avgCandle * 3;

        if (hasClimaxVolume && isSharp) {
            const direction = current.close > candles[lastIdx - 5].close ? 'ACCUMULATION' : 'DISTRIBUTION';
            return {
                detected: true,
                phase: 'PHASE_A',
                type: direction,
                confidence: 0.75,
                note: `${direction} - Stopping action detected (Climax)`,
                action: 'WATCH_FOR_RANGE'
            };
        }

        return { detected: false };
    }

    /**
     * Phase B: Building the Cause
     * Trading range with tests
     */
    static _detectPhaseB(candles, range, volumeProfile) {
        if (!range.inRange) return { detected: false };

        // Check for declining volume (accumulation signature)
        const recentVol = volumeProfile.recent.slice(-10);
        const earlierVol = volumeProfile.recent.slice(-20, -10);
        const avgRecent = recentVol.reduce((a, b) => a + b, 0) / recentVol.length;
        const avgEarlier = earlierVol.reduce((a, b) => a + b, 0) / earlierVol.length;
        const volumeDeclining = avgRecent < avgEarlier * 0.9;

        const duration = range.duration;
        if (duration > 15 && volumeDeclining) {
            return {
                detected: true,
                phase: 'PHASE_B',
                type: 'CAUSE_BUILDING',
                confidence: 0.8,
                note: 'Range with declining volume - Institutions building positions',
                action: 'WAIT_FOR_TEST'
            };
        }

        return { detected: false };
    }

    /**
     * Phase C: The Test
     * Spring (accumulation) or Upthrust (distribution)
     */
    static _detectPhaseC(candles, range, obv) {
        if (!range.inRange) return { detected: false };

        const lastIdx = candles.length - 1;
        const current = candles[lastIdx];

        // Spring: Break below range, close back inside
        const brokeBelow = current.low < range.low;
        const closedInside = current.close > range.low;
        const obvRising = obv[lastIdx] > obv[lastIdx - 5];

        if (brokeBelow && closedInside && obvRising) {
            return {
                detected: true,
                phase: 'PHASE_C',
                type: 'SPRING',
                confidence: 0.85,
                note: 'Spring detected - Bullish test successful',
                action: 'PREPARE_LONG'
            };
        }

        // Upthrust: Break above range, close back inside
        const brokeAbove = current.high > range.high;
        const closedInsideAbove = current.close < range.high;
        const obvFalling = obv[lastIdx] < obv[lastIdx - 5];

        if (brokeAbove && closedInsideAbove && obvFalling) {
            return {
                detected: true,
                phase: 'PHASE_C',
                type: 'UPTHRUST',
                confidence: 0.85,
                note: 'Upthrust detected - Bearish test successful',
                action: 'PREPARE_SHORT'
            };
        }

        return { detected: false };
    }

    /**
     * Phase D: Sign of Strength (SOS) or Sign of Weakness (SOW)
     */
    static _detectPhaseD(candles, range, obv) {
        if (!range.inRange) return { detected: false };

        const lastIdx = candles.length - 1;
        const current = candles[lastIdx];

        // SOS: Strong move above mid-range with increasing OBV
        const midRange = (range.high + range.low) / 2;
        const aboveMid = current.close > midRange * 1.02;
        const obvIncreasing = obv[lastIdx] > obv[lastIdx - 3];

        if (aboveMid && obvIncreasing) {
            return {
                detected: true,
                phase: 'PHASE_D',
                type: 'SOS',
                confidence: 0.8,
                note: 'Sign of Strength - Bullish breakout imminent',
                action: 'ENTER_LONG'
            };
        }

        // SOW: Weak move below mid-range with decreasing OBV
        const belowMid = current.close < midRange * 0.98;
        const obvDecreasing = obv[lastIdx] < obv[lastIdx - 3];

        if (belowMid && obvDecreasing) {
            return {
                detected: true,
                phase: 'PHASE_D',
                type: 'SOW',
                confidence: 0.8,
                note: 'Sign of Weakness - Bearish breakdown imminent',
                action: 'ENTER_SHORT'
            };
        }

        return { detected: false };
    }

    /**
     * Phase E: Result (Markup or Markdown)
     */
    static _detectPhaseE(candles, priceAction) {
        const { trend, strength } = priceAction;

        if (trend === 'STRONG_UP' && strength > 0.7) {
            return {
                detected: true,
                phase: 'PHASE_E',
                type: 'MARKUP',
                confidence: 0.85,
                note: 'Markup phase - Trend following opportunity',
                action: 'FOLLOW_TREND'
            };
        }

        if (trend === 'STRONG_DOWN' && strength > 0.7) {
            return {
                detected: true,
                phase: 'PHASE_E',
                type: 'MARKDOWN',
                confidence: 0.85,
                note: 'Markdown phase - Trend following opportunity',
                action: 'FOLLOW_TREND'
            };
        }

        return { detected: false };
    }

    // Helper methods
    static _analyzeVolume(candles) {
        const volumes = candles.map(c => c.volume);
        const average = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        return {
            recent: volumes.slice(-20),
            average
        };
    }

    static _analyzePriceAction(candles) {
        const start = candles[0].close;
        const end = candles[candles.length - 1].close;
        const change = (end - start) / start;

        let trend = 'NEUTRAL';
        let strength = Math.abs(change);

        if (change > 0.02) trend = 'STRONG_UP';
        else if (change > 0.005) trend = 'UP';
        else if (change < -0.02) trend = 'STRONG_DOWN';
        else if (change < -0.005) trend = 'DOWN';

        return { trend, strength };
    }

    static _detectRange(candles) {
        const last30 = candles.slice(-30);
        const highs = last30.map(c => c.high);
        const lows = last30.map(c => c.low);
        const high = Math.max(...highs);
        const low = Math.min(...lows);
        const range = (high - low) / low;

        // Consider it a range if price stayed within 5% band
        const inRange = range < 0.05;

        return {
            inRange,
            high,
            low,
            duration: inRange ? 30 : 0
        };
    }
}
