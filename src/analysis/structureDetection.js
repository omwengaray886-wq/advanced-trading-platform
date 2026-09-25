/**
 * Market Structure Detection
 * Identifies HH, HL, LH, LL, BOS, and CHOCH patterns
 */

/**
 * Detect market structure (HH, HL, LH, LL)
 * @param {Array} swingPoints - Array of swing points (must be ordered by time)
 * @returns {Array} - Array of structure markers
 */
export function detectMarketStructure(swingPoints) {
    if (swingPoints.length < 4) return [];

    const structures = [];
    const highs = swingPoints.filter(p => p.type === 'SWING_HIGH');
    const lows = swingPoints.filter(p => p.type === 'SWING_LOW');

    // Detect Higher Highs / Lower Highs
    for (let i = 1; i < highs.length; i++) {
        const prev = highs[i - 1];
        const current = highs[i];

        if (current.price > prev.price) {
            structures.push({
                ...current,
                markerType: 'HH',
                significance: calculateSignificance(current.price, prev.price)
            });
        } else if (current.price < prev.price) {
            structures.push({
                ...current,
                markerType: 'LH',
                significance: calculateSignificance(prev.price, current.price)
            });
        }
    }

    // Detect Higher Lows / Lower Lows
    for (let i = 1; i < lows.length; i++) {
        const prev = lows[i - 1];
        const current = lows[i];

        if (current.price > prev.price) {
            structures.push({
                ...current,
                markerType: 'HL',
                significance: calculateSignificance(current.price, prev.price)
            });
        } else if (current.price < prev.price) {
            structures.push({
                ...current,
                markerType: 'LL',
                significance: calculateSignificance(prev.price, current.price)
            });
        }
    }

    return structures.sort((a, b) => a.time - b.time);
}

/**
 * Detect Break of Structure (BOS)
 * @param {Array} candles - Candlestick data
 * @param {Array} structures - Market structure markers
 * @returns {Array} - BOS markers
 */
export function detectBOS(candles, structures) {
    const bosMarkers = [];
    if (candles.length < 5 || structures.length < 2) return [];

    // Bullish BOS: Price must CLOSE above the most recent Swing High
    const recentHighs = structures.filter(s => s.markerType === 'HH' || s.markerType === 'LH');
    if (recentHighs.length > 0) {
        const lastHigh = recentHighs[recentHighs.length - 1];

        // Look for body close above last high after its formation
        const postHighCandles = candles.filter(c => c.time > lastHigh.time);
        const breakCandle = postHighCandles.find(c => c.close > lastHigh.price);

        if (breakCandle) {
            bosMarkers.push({
                time: breakCandle.time,
                price: lastHigh.price,
                markerType: 'BOS',
                direction: 'BULLISH',
                significance: 'high',
                confirmedBy: breakCandle.close
            });
        }
    }

    // Bearish BOS: Price must CLOSE below the most recent Swing Low
    const recentLows = structures.filter(s => s.markerType === 'LL' || s.markerType === 'HL');
    if (recentLows.length > 0) {
        const lastLow = recentLows[recentLows.length - 1];

        const postLowCandles = candles.filter(c => c.time > lastLow.time);
        const breakCandle = postLowCandles.find(c => c.close < lastLow.price);

        if (breakCandle) {
            bosMarkers.push({
                time: breakCandle.time,
                price: lastLow.price,
                markerType: 'BOS',
                direction: 'BEARISH',
                significance: 'high',
                confirmedBy: breakCandle.close
            });
        }
    }

    return bosMarkers;
}

/**
 * Detect Change of Character (CHOCH)
 * Trend reversal indicator - More significant than BOS
 * @param {Array} structures - Market structure markers
 * @param {Array} candles - Recent candles
 * @returns {Array} - CHOCH markers
 */
export function detectCHOCH(structures, candles = []) {
    const chochMarkers = [];
    if (structures.length < 4) return [];

    // A CHoCH is defined by the price breaking the swing point that led to the last BOS.

    // 1. Bullish CHOCH (Downtrend Reversal)
    // Find the last Lower High (LH) that was responsible for the last Lower Low (LL)
    const bears = structures.filter(s => s.markerType === 'LH').slice(-2);
    if (bears.length > 0) {
        const lastLH = bears[bears.length - 1];

        // Find if any subsequent structure point or BOS has broken ABOVE this LH
        const breakEvent = structures.find(s => s.time > lastLH.time && s.price > lastLH.price && (s.markerType === 'HH' || s.markerType === 'BOS'));

        if (breakEvent) {
            chochMarkers.push({
                time: breakEvent.time,
                price: lastLH.price,
                markerType: 'CHOCH',
                direction: 'BULLISH',
                significance: 'exceptional',
                note: 'Structural LH Violated'
            });
        }
    }

    // 2. Bearish CHOCH (Uptrend Reversal)
    // Find the last Higher Low (HL) that was responsible for the last Higher High (HH)
    const bulls = structures.filter(s => s.markerType === 'HL').slice(-2);
    if (bulls.length > 0) {
        const lastHL = bulls[bulls.length - 1];

        // Find if any subsequent structure point or BOS has broken BELOW this HL
        const breakEvent = structures.find(s => s.time > lastHL.time && s.price < lastHL.price && (s.markerType === 'LL' || s.markerType === 'BOS'));

        if (breakEvent) {
            chochMarkers.push({
                time: breakEvent.time,
                price: lastHL.price,
                markerType: 'CHOCH',
                direction: 'BEARISH',
                significance: 'exceptional',
                note: 'Structural HL Violated'
            });
        }
    }

    return chochMarkers;
}

/**
 * Calculate hierarchical score for a structure element
 * @param {Object} structure - Structure marker
 * @param {string} currentTF - Current timeframe
 * @param {Object} mtfContext - Context from higher/lower timeframes
 * @returns {Object} - { strength, alignment_bonus }
 */
export function calculateHierarchicalScore(structure, currentTF, mtfContext = {}) {
    const tfWeights = {
        '1m': 0.1, '5m': 0.2, '15m': 0.4, '30m': 0.5,
        '1h': 0.7, '4h': 0.9, '1d': 1.0, '1w': 1.2
    };

    const baseWeight = tfWeights[currentTF.toLowerCase()] || 0.5;
    let strength = baseWeight;

    // HTF Alignment Bonus
    let alignmentBonus = 0;
    if (mtfContext.htf_direction === structure.direction) {
        alignmentBonus = 0.2;
        strength += alignmentBonus;
    }

    // LTF Confirmation Bonus (Inner structure confirmed)
    if (mtfContext.ltf_confirmation) {
        strength += 0.1;
    }

    return {
        strength: Math.min(strength, 1.0),
        alignment_bonus: alignmentBonus,
        is_dominant: baseWeight >= 0.9
    };
}

/**
 * Get current trend based on structure with hierarchical weighting
 */
export function getCurrentTrend(structures, timeframe = '1H') {
    if (structures.length < 4) return 'NEUTRAL';

    const recent = structures.slice(-10);
    let score = 0;

    recent.forEach(s => {
        const weight = s.markerType === 'BOS' ? 1.5 : 1.0;
        const importance = s.significance === 'high' ? 1.2 : 0.8;

        if (['HH', 'HL', 'BOS'].includes(s.markerType) && s.direction !== 'BEARISH') {
            score += weight * importance;
        } else if (['LH', 'LL', 'BOS'].includes(s.markerType) || s.direction === 'BEARISH') {
            score -= weight * importance;
        }
    });

    if (score > 2.5) return 'BULLISH';
    if (score < -2.5) return 'BEARISH';
    return 'NEUTRAL';
}

// Helper function
function calculateSignificance(price1, price2) {
    const change = Math.abs(price1 - price2) / Math.min(price1, price2);
    if (change > 0.02) return 'high';
    if (change > 0.01) return 'medium';
    return 'low';
}


/**
 * Detect Fractal Alignment between multiple structural analyses
 * @param {Object} ltfAnalysis - Lower Timeframe analysis
 * @param {Object} htfAnalysis - Higher Timeframe analysis
 * @returns {Object} - Alignment status and strength
 */
export function checkFractalAlignment(ltfAnalysis, htfAnalysis) {
    if (!ltfAnalysis || !htfAnalysis) return { aligned: false, strength: 0 };

    const ltfTrend = ltfAnalysis.trend || 'NEUTRAL';
    const htfTrend = htfAnalysis.trend || 'NEUTRAL';

    const aligned = ltfTrend === htfTrend && ltfTrend !== 'NEUTRAL';

    let strength = 0;
    if (aligned) {
        strength = 50;
        // Boost strength if both have recent BOS in the same direction
        const hasLtfBOS = (ltfAnalysis.breaks || []).some(b => b.type === 'BOS' && b.direction === ltfTrend);
        const hasHtfBOS = (htfAnalysis.breaks || []).some(b => b.type === 'BOS' && b.direction === htfTrend);

        if (hasLtfBOS) strength += 25;
        if (hasHtfBOS) strength += 25;
    }

    return {
        aligned,
        trend: aligned ? ltfTrend : 'MIXED',
        strength,
        rationale: aligned ?
            `Fractal synchronization detected: Both HTF and LTF are currently **${ltfTrend}**.` :
            `Mixed structure: HTF is ${htfTrend} while LTF is ${ltfTrend}.`
    };
}
