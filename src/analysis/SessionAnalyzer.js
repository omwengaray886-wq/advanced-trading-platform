/**
 * Session Analyzer - Killzone Detection & Volatility Windows
 * Identifies high-probability trading windows based on session timing and volatility
 */

export class SessionAnalyzer {
    /**
     * Detect current active session and killzone status
     * @param {number} timestamp - Unix timestamp (seconds)
     * @returns {Object} Session details
     */
    static analyzeSession(timestamp) {
        const date = new Date(timestamp * 1000);
        const hour = date.getUTCHours();
        const minute = date.getUTCMinutes();

        // Session definitions (UTC)
        const sessions = {
            ASIAN: { start: 23, end: 8, killzone: { start: 0, end: 2 } },      // Tokyo: 00:00-02:00 UTC
            LONDON: { start: 7, end: 16, killzone: { start: 8, end: 10 } },    // London: 08:00-10:00 UTC
            NY: { start: 12, end: 21, killzone: { start: 13, end: 15 } },      // NY: 13:00-15:00 UTC
            OVERLAP: { start: 12, end: 16 }                                     // London/NY Overlap: 12:00-16:00 UTC
        };

        let activeSession = null;
        let killzone = null;
        let isOverlap = false;

        // Detect active session
        if (this._isInRange(hour, sessions.ASIAN.start, sessions.ASIAN.end)) {
            activeSession = 'ASIAN';
            if (this._isInRange(hour, sessions.ASIAN.killzone.start, sessions.ASIAN.killzone.end)) {
                killzone = 'ASIAN_OPEN';
            }
        } else if (this._isInRange(hour, sessions.LONDON.start, sessions.LONDON.end)) {
            activeSession = 'LONDON';
            if (this._isInRange(hour, sessions.LONDON.killzone.start, sessions.LONDON.killzone.end)) {
                killzone = 'LONDON_OPEN';
            }
        } else if (this._isInRange(hour, sessions.NY.start, sessions.NY.end)) {
            activeSession = 'NY';
            if (this._isInRange(hour, sessions.NY.killzone.start, sessions.NY.killzone.end)) {
                killzone = 'NY_OPEN';
            }
        }

        // Detect overlap
        if (this._isInRange(hour, sessions.OVERLAP.start, sessions.OVERLAP.end)) {
            isOverlap = true;
            if (!killzone) killzone = 'OVERLAP';
        }

        return {
            session: activeSession || 'CLOSED',
            killzone,
            isOverlap,
            hour,
            minute,
            isPeakLiquidity: isOverlap || killzone !== null
        };
    }

    /**
     * Calculate session-specific volatility thresholds
     * @param {Array} candles - Historical candles
     * @param {string} session - Session name
     * @returns {Object} Volatility metrics
     */
    static calculateSessionVolatility(candles, session) {
        if (!candles || candles.length < 50) return null;

        // Filter candles by session
        const sessionCandles = candles.filter(c => {
            const sessionInfo = this.analyzeSession(c.time);
            return sessionInfo.session === session;
        });

        if (sessionCandles.length < 10) return null;

        // Calculate ATR for this session
        let atrSum = 0;
        for (let i = 1; i < sessionCandles.length; i++) {
            const range = sessionCandles[i].high - sessionCandles[i].low;
            atrSum += range;
        }

        const sessionATR = atrSum / sessionCandles.length;

        // Calculate volatility percentile
        const ranges = sessionCandles.map(c => c.high - c.low);
        ranges.sort((a, b) => a - b);
        const medianRange = ranges[Math.floor(ranges.length / 2)];
        const p75Range = ranges[Math.floor(ranges.length * 0.75)];
        const p90Range = ranges[Math.floor(ranges.length * 0.9)];

        return {
            sessionATR,
            medianRange,
            p75Range,
            p90Range,
            isHighVolatility: sessionATR > medianRange * 1.5
        };
    }

    /**
     * Generate session boundaries for chart overlay
     * @param {Array} candles - Historical candles
     * @returns {Array} Session boundary objects
     */
    static generateSessionBoundaries(candles) {
        if (!candles || candles.length === 0) return [];

        const boundaries = [];
        let currentSession = null;
        let sessionStart = null;

        candles.forEach((candle, index) => {
            const sessionInfo = this.analyzeSession(candle.time);

            // Session change detected
            if (sessionInfo.session !== currentSession) {
                // Close previous session
                if (currentSession && sessionStart !== null) {
                    boundaries.push({
                        session: currentSession,
                        startTime: sessionStart,
                        endTime: candle.time,
                        startIndex: sessionStart,
                        endIndex: index
                    });
                }

                // Start new session
                currentSession = sessionInfo.session;
                sessionStart = candle.time;
            }
        });

        // Close final session
        if (currentSession && sessionStart !== null) {
            boundaries.push({
                session: currentSession,
                startTime: sessionStart,
                endTime: candles[candles.length - 1].time,
                startIndex: sessionStart,
                endIndex: candles.length - 1
            });
        }

        return boundaries;
    }

    /**
     * Check if session has high probability setup conditions
     * @param {Object} sessionInfo - From analyzeSession()
     * @param {Object} volatility - From calculateSessionVolatility()
     * @returns {Object} Probability assessment
     */
    static assessSessionProbability(sessionInfo, volatility) {
        let probability = 50; // Base
        const reasons = [];

        // Killzone boost
        if (sessionInfo.killzone) {
            probability += 20;
            reasons.push(`${sessionInfo.killzone} killzone (first 2h)`);
        }

        // Overlap boost
        if (sessionInfo.isOverlap) {
            probability += 15;
            reasons.push('London/NY overlap (peak liquidity)');
        }

        // High volatility boost
        if (volatility?.isHighVolatility) {
            probability += 10;
            reasons.push('Above-average volatility');
        }

        // Asian session penalty (low liquidity)
        if (sessionInfo.session === 'ASIAN' && !sessionInfo.killzone) {
            probability -= 15;
            reasons.push('Asian ranging (low volume)');
        }

        return {
            probability: Math.min(Math.max(probability, 0), 100),
            rating: probability >= 70 ? 'HIGH' : probability >= 50 ? 'MEDIUM' : 'LOW',
            reasons
        };
    }

    /**
     * Helper: Check if hour is within range (handles overnight wraparound)
     * @private
     */
    static _isInRange(hour, start, end) {
        if (start <= end) {
            return hour >= start && hour < end;
        } else {
            // Overnight range (e.g., 23:00 to 08:00)
            return hour >= start || hour < end;
        }
    }
}
