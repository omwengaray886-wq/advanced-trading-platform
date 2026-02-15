/**
 * Execution Trigger Service
 * 
 * Provides "Reactionary" confirmation before entering a trade.
 * Instead of placing a blind limit order, we verify that price is reacting
 * to the level (e.g., wicking rejection) before committing capital.
 */
export class ExecutionTrigger {
    /**
     * Verify Candle Confirmation
     * @param {Object} lastCandle - The most recent closed candle
     * @param {string} direction - 'LONG' | 'SHORT'
     * @param {number} averageVolume - Optional: Average volume for relative comparison
     * @returns {Object} { isConfirmed, confidence, reason }
     */
    static verifyCandleConfirmation(lastCandle, direction, averageVolume = null) {
        if (!lastCandle) return { isConfirmed: false, reason: 'No candle data' };

        const bodySize = Math.abs(lastCandle.close - lastCandle.open);
        const totalRange = lastCandle.high - lastCandle.low;
        const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
        const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;

        // 0. Volume Validation (New Phase 75 Gate)
        // If averageVolume provided, we require at least 80% of average to confirm a trigger
        // Weak volume on a trigger candle = FAKEOUT risk
        let volumeConfidence = 1.0;
        let volumeReason = '';

        if (averageVolume && lastCandle.volume) {
            const rvol = lastCandle.volume / averageVolume;
            if (rvol < 0.8) {
                // Critical Failure: Weak Volume
                return {
                    isConfirmed: false,
                    confidence: 0.2,
                    reason: `Low Volume Trigger (RVOL: ${rvol.toFixed(1)}x) - Fakeout Risk`
                };
            } else if (rvol > 1.5) {
                volumeConfidence = 1.2; // Boost for high volume
                volumeReason = ' + High Vol';
            }
        }

        // 1. Rejection Wick Check
        // We want to see a wick rejecting our zone.
        // Long: Lower wick should be significant (> 30% of range)
        // Short: Upper wick should be significant (> 30% of range)

        let wickConfidence = 0;
        let reason = '';

        if (direction === 'LONG') {
            const wickRatio = lowerWick / totalRange;
            if (wickRatio > 0.3) {
                wickConfidence = wickRatio; // 0.3 to 1.0
                reason = `Bullish Rejection Wick (${(wickRatio * 100).toFixed(0)}%)`;
            } else {
                reason = 'No significant rejection wick';
            }
        } else { // SHORT
            const wickRatio = upperWick / totalRange;
            if (wickRatio > 0.3) {
                wickConfidence = wickRatio;
                reason = `Bearish Rejection Wick (${(wickRatio * 100).toFixed(0)}%)`;
            } else {
                reason = 'No significant rejection wick';
            }
        }

        // 2. Color Match Bonus
        // A green candle for Longs is better than a red one with a wick
        const isColorAligned = (direction === 'LONG' && lastCandle.close > lastCandle.open) ||
            (direction === 'SHORT' && lastCandle.close < lastCandle.open);

        // 3. Final Decision
        // If we have a massive wick, color matters less.
        // If we have a small wick, we need color alignment.

        if (wickConfidence > 0.5) {
            return { isConfirmed: true, confidence: 0.9 * volumeConfidence, reason: `Strong ${reason}${volumeReason}` };
        }

        if (wickConfidence > 0.3 && isColorAligned) {
            return { isConfirmed: true, confidence: 0.7 * volumeConfidence, reason: `${reason} + Color Aligned${volumeReason}` };
        }

        return {
            isConfirmed: false,
            confidence: wickConfidence,
            reason: `Insufficient reaction. ${reason}`
        };
    }
}
