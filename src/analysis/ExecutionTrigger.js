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
     * @returns {Object} { isConfirmed, confidence, reason }
     */
    static verifyCandleConfirmation(lastCandle, direction) {
        if (!lastCandle) return { isConfirmed: false, reason: 'No candle data' };

        const bodySize = Math.abs(lastCandle.close - lastCandle.open);
        const totalRange = lastCandle.high - lastCandle.low;
        const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
        const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;

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
            return { isConfirmed: true, confidence: 0.9, reason: `Strong ${reason}` };
        }

        if (wickConfidence > 0.3 && isColorAligned) {
            return { isConfirmed: true, confidence: 0.7, reason: `${reason} + Color Aligned` };
        }

        return {
            isConfirmed: false,
            confidence: wickConfidence,
            reason: `Insufficient reaction. ${reason}`
        };
    }
}
