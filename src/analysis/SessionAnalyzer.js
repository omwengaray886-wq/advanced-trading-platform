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
        // Note: These are standard approximate UTC times. 
        // Real institutional sessions drift with DST, but we use these common benchmarks.
        const sessionDefinitions = {
            ASIAN: { name: 'ASIAN', start: 23, end: 8, killzone: { start: 0, end: 2 } },
            LONDON: { name: 'LONDON', start: 7, end: 16, killzone: { start: 8, end: 10 } },
            NY: { name: 'NY', start: 12, end: 21, killzone: { start: 13, end: 15 } }
        };

        const activeSessions = [];
        let killzone = null;

        // Detect all active sessions
        Object.values(sessionDefinitions).forEach(def => {
            if (this._isInRange(hour, def.start, def.end)) {
                activeSessions.push(def.name);
                if (def.killzone && this._isInRange(hour, def.killzone.start, def.killzone.killzoneEnd || def.killzone.end)) {
                    killzone = `${def.name}_OPEN`;
                }
            }
        });

        // Detect overlap specifically for London/NY
        const isLondon = activeSessions.includes('LONDON');
        const isNY = activeSessions.includes('NY');
        const isOverlap = isLondon && isNY;

        // Determine primary display session
        let displaySession = 'CLOSED';
        if (activeSessions.length > 0) {
            if (isOverlap) {
                displaySession = 'LONDON/NY';
            } else {
                // If multiple (rare besides Lon/NY), take the last one added
                displaySession = activeSessions[activeSessions.length - 1];
            }
        }

        return {
            session: displaySession,
            allActive: activeSessions,
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
