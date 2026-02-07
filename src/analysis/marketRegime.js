/**
 * Market Regime Analyzer
 * Detects market conditions: TRENDING, RANGING, TRANSITIONAL
 */

/**
 * Calculate Average True Range (ATR)
 * @param {Array} candles - Candlestick data
 * @param {number} period - ATR period (default: 14)
 * @returns {number} - ATR value
 */
function calculateATR(candles, period = 14) {
    if (candles.length < period) return 0;

    let atr = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = i > 0 ? candles[i - 1].close : candles[i].open;

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );

        atr += tr / period;
    }

    return atr;
}

/**
 * Detect market regime and detailed state
 * @param {Array} candles - Candlestick data
 * @param {Array} structures - Market structure markers
 * @returns {Object} - Complete Market State Model
 */
export function detectMarketRegime(candles, structures) {
    if (candles.length < 50) {
        return {
            regime: 'UNKNOWN',
            trend_state: 'neutral',
            phase: 'stable',
            condition: 'low_data',
            confidence: 0
        };
    }

    const recentCandles = candles.slice(-50);
    const prices = recentCandles.map(c => c.close);

    // 1. Core Trend Analysis
    const trend = calculateTrendStrength(prices);
    const atr = calculateATR(candles);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const volatilityPercent = (atr / avgPrice) * 100;

    // 2. Structure Consistency
    const recentStructures = structures.slice(-10);
    const bullishCount = recentStructures.filter(s => ['HH', 'HL', 'BOS'].includes(s.markerType)).length;
    const bearishCount = recentStructures.filter(s => ['LH', 'LL', 'BOS'].includes(s.markerType)).length;
    const bosCount = recentStructures.filter(s => s.markerType === 'BOS').length;

    // 3. Determine Stateful Parameters
    let regime, trend_state, phase, condition, confidence;
    let direction = trend.slope > 0 ? 'BULLISH' : 'BEARISH';

    // A. Trend State (Strength & Consistency)
    if (Math.abs(trend.slope) > 0.0015 && (bullishCount > 6 || bearishCount > 6)) {
        trend_state = 'impulsive';
        confidence = 0.85;
    } else if (Math.abs(trend.slope) > 0.0005) {
        trend_state = 'corrective';
        confidence = 0.65;
    } else {
        trend_state = 'ranging';
        confidence = 0.75;
    }

    // B. Phase Detection (Mapping Volume/Structure to Phases)
    if (trend_state === 'impulsive') {
        phase = bosCount > 0 ? 'expansion' : 'trending';
        regime = 'TRENDING';
    } else if (trend_state === 'corrective') {
        phase = 'retracement';
        regime = 'TRANSITIONAL';
    } else {
        // Ranging logic: Distinguish Accumulation vs Distribution
        const rsi = calculateSimpleRSI(prices, 14);
        phase = rsi < 40 ? 'accumulation' : rsi > 60 ? 'distribution' : 'ranging';
        regime = 'RANGING';
    }

    // C. Condition Analysis
    if (volatilityPercent > 1.5) condition = 'news_driven';
    else if (volatilityPercent < 0.4) condition = 'low_liquidity';
    else if (trend.r2 < 0.3) condition = 'choppy';
    else condition = 'clean';

    // D. Market Cycle Classification (Bull/Bear/Sideways)
    const cycleData = classifyMarketCycle(candles, trend, recentStructures);

    // E. Regime Shift Detection
    const regimeShift = detectRegimeShift(cycleData.cycle);

    return {
        regime,
        trend_state,
        phase,
        condition,
        trend: { direction, strength: Math.min(trend.r2, 1.0), slope: trend.slope },
        volatility: volatilityPercent < 0.5 ? 'LOW' : volatilityPercent > 1.2 ? 'HIGH' : 'MODERATE',
        confidence,
        atr,
        institutional_alignment: bosCount > 1 && trend.r2 > 0.7,

        // Phase 34: Cycle-Aware Enhancements
        cycle: cycleData.cycle,           // 'BULL' | 'BEAR' | 'SIDEWAYS'
        cycleStrength: cycleData.strength, // 0-100
        regimeShift: regimeShift.detected, // boolean
        shiftDirection: regimeShift.direction, // e.g., 'BULL→SIDEWAYS'
        shiftConfidence: regimeShift.confidence // 0-1
    };
}

/**
 * Simple RSI for phase classification
 */
function calculateSimpleRSI(prices, period) {
    if (prices.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = prices.length - period; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) gains += diff;
        else losses -= diff;
    }
    if (losses === 0) return 100;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
}

/**
 * Calculate trend strength using linear regression
 * @param {Array} prices - Array of prices
 * @returns {Object} - { slope, r2 }
 */
function calculateTrendStrength(prices) {
    const n = prices.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += prices[i];
        sumXY += i * prices[i];
        sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const yMean = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    for (let i = 0; i < n; i++) {
        const predicted = slope * i + intercept;
        ssTotal += Math.pow(prices[i] - yMean, 2);
        ssResidual += Math.pow(prices[i] - predicted, 2);
    }

    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
}

/**
 * Detect if market is consolidating
 * @param {Array} candles - Candlestick data
 * @param {number} lookback - Number of candles to analyze
 * @returns {boolean} - True if consolidating
 */
export function isConsolidating(candles, lookback = 20) {
    if (candles.length < lookback) return false;

    const recent = candles.slice(-lookback);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);

    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    const range = highestHigh - lowestLow;
    const avgPrice = (highestHigh + lowestLow) / 2;

    const rangePercent = (range / avgPrice) * 100;

    return rangePercent < 2; // Less than 2% range = consolidation
}

/**
 * Classify Market Cycle: BULL, BEAR, or SIDEWAYS
 * @param {Array} candles - Candlestick data
 * @param {Object} trend - Trend analysis from calculateTrendStrength
 * @param {Array} structures - Recent market structures
 * @returns {Object} - { cycle: string, strength: number }
 */
function classifyMarketCycle(candles, trend, structures) {
    if (candles.length < 50) {
        return { cycle: 'SIDEWAYS', strength: 0 };
    }

    // Multi-timeframe trend analysis
    const shortTerm = calculateTrendStrength(candles.slice(-20).map(c => c.close));
    const mediumTerm = trend;  // Already calculated (50 candles)
    const longTerm = candles.length >= 100
        ? calculateTrendStrength(candles.slice(-100).map(c => c.close))
        : mediumTerm;

    // Structure analysis
    const hhCount = structures.filter(s => s.markerType === 'HH').length;
    const hlCount = structures.filter(s => s.markerType === 'HL').length;
    const lhCount = structures.filter(s => s.markerType === 'LH').length;
    const llCount = structures.filter(s => s.markerType === 'LL').length;

    const bullishStructure = hhCount + hlCount;
    const bearishStructure = lhCount + llCount;
    const structureBias = bullishStructure > bearishStructure ? 1 : -1;

    // Cycle Classification Logic
    const slopeThreshold = 0.001;
    const trendStrengthThreshold = 0.5;

    // BULL MARKET: Sustained uptrend with HH/HL dominance
    if (mediumTerm.slope > slopeThreshold &&
        mediumTerm.r2 > trendStrengthThreshold &&
        bullishStructure > bearishStructure) {

        // Calculate strength score (0-100)
        const slopeScore = Math.min((mediumTerm.slope / 0.003) * 40, 40);  // Max 40 pts
        const r2Score = mediumTerm.r2 * 30;  // Max 30 pts
        const structureScore = Math.min((bullishStructure / 7) * 30, 30);  // Max 30 pts
        const strength = Math.min(Math.round(slopeScore + r2Score + structureScore), 100);

        return { cycle: 'BULL', strength };
    }

    // BEAR MARKET: Sustained downtrend with LH/LL dominance
    else if (mediumTerm.slope < -slopeThreshold &&
        mediumTerm.r2 > trendStrengthThreshold &&
        bearishStructure > bullishStructure) {

        const slopeScore = Math.min((Math.abs(mediumTerm.slope) / 0.003) * 40, 40);
        const r2Score = mediumTerm.r2 * 30;
        const structureScore = Math.min((bearishStructure / 7) * 30, 30);
        const strength = Math.min(Math.round(slopeScore + r2Score + structureScore), 100);

        return { cycle: 'BEAR', strength };
    }

    // SIDEWAYS: Low correlation, tight range
    else {
        // Strength = how "locked" the range is
        const recent = candles.slice(-50);
        const highs = recent.map(c => c.high);
        const lows = recent.map(c => c.low);
        const range = (Math.max(...highs) - Math.min(...lows)) / ((Math.max(...highs) + Math.min(...lows)) / 2) * 100;

        // Tighter range = stronger sideways (paradox but makes sense for "conviction")
        const rangeScore = Math.max(0, 100 - (range * 10)); // < 2% range = 80+ strength
        const lowR2Score = (1 - mediumTerm.r2) * 50; // Low R² = more sideways
        const strength = Math.min(Math.round((rangeScore + lowR2Score) / 2), 100);

        return { cycle: 'SIDEWAYS', strength };
    }
}

// Regime history tracking (module-level state)
let regimeHistory = [];

/**
 * Detect Regime Shift
 * Tracks previous cycles and detects when a shift occurs
 * @param {string} currentCycle - Current cycle ('BULL' | 'BEAR' | 'SIDEWAYS')
 * @returns {Object} - { detected: boolean, direction: string, confidence: number }
 */
function detectRegimeShift(currentCycle) {
    // Add current cycle to history
    regimeHistory.push(currentCycle);

    // Keep only last 5 readings
    if (regimeHistory.length > 5) {
        regimeHistory.shift();
    }

    // Need at least 4 readings to detect shift
    if (regimeHistory.length < 4) {
        return { detected: false, direction: null, confidence: 0 };
    }

    // Check if regime changed in last 3 readings
    const previous = regimeHistory[regimeHistory.length - 4];
    const recent = regimeHistory.slice(-3);

    // Count how many of the recent 3 match the current (new) regime
    const matchCount = recent.filter(r => r === currentCycle).length;

    // Shift detected if:
    // - Current cycle differs from 4 readings ago
    // - At least 2 of the last 3 readings agree with current
    if (previous !== currentCycle && matchCount >= 2) {
        const direction = `${previous}→${currentCycle}`;
        const confidence = matchCount / 3; // 0.66 or 1.0

        return { detected: true, direction, confidence };
    }

    return { detected: false, direction: null, confidence: 0 };
}

/**
 * PHASE 50: REGIME TRANSITION PREDICTOR
 * Detect early warnings before major regime changes
 */

/**
 * Detect volatility compression (Bollinger Band squeeze)
 * @param {Array} candles - Candlestick data
 * @param {number} atr - Current ATR
 * @returns {Object} - { compressed: boolean, level: number, bbSqueeze: boolean }
 */
export function detectVolatilityCompression(candles, atr) {
    if (candles.length < 20) {
        return { compressed: false, level: 0, bbSqueeze: false };
    }

    // Calculate historical ATR range
    const atrHistory = [];
    for (let i = 0; i < 20; i++) {
        const slice = candles.slice(-(20 + i), -(i || candles.length));
        if (slice.length >= 14) {
            atrHistory.push(calculateATR(slice, 14));
        }
    }

    const avgATR = atrHistory.reduce((sum, val) => sum + val, 0) / atrHistory.length;
    const compressionLevel = atr / avgATR;

    // Bollinger Band squeeze (range < 1.5% of price)
    const recent = candles.slice(-20);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    const range = Math.max(...highs) - Math.min(...lows);
    const avgPrice = (Math.max(...highs) + Math.min(...lows)) / 2;
    const rangePercent = (range / avgPrice) * 100;

    return {
        compressed: compressionLevel < 0.7,
        level: Math.round((1 - compressionLevel) * 100), // 0-100, higher = more compressed
        bbSqueeze: rangePercent < 1.5,
        rangePercent
    };
}

/**
 * Track failed BOS and sweep patterns
 * @param {Array} structures - Market structure array
 * @returns {Object} - { failedBOS: number, failedSweeps: number, failureRate: number }
 */
export function trackFailedPatterns(structures) {
    if (!structures || structures.length < 5) {
        return { failedBOS: 0, failedSweeps: 0, failureRate: 0 };
    }

    const recent = structures.slice(-10);
    const failedBOS = recent.filter(s => s.markerType === 'BOS' && s.status === 'FAILED').length;
    const totalBOS = recent.filter(s => s.markerType === 'BOS').length;

    // Count failed sweeps (sweeps without displacement)
    const failedSweeps = recent.filter(s =>
        s.markerType === 'SWEEP' && !s.displacement
    ).length;

    const failureRate = totalBOS > 0 ? (failedBOS / totalBOS) : 0;

    return {
        failedBOS,
        failedSweeps,
        failureRate: Math.round(failureRate * 100),
        isAnomalous: failureRate > 0.5 // More than 50% failure = regime change imminent
    };
}

/**
 * Calculate time-in-range exhaustion
 * @param {Array} consolidations - Consolidation zones
 * @param {number} currentTime - Current timestamp
 * @returns {Object} - { timeInRange: number, exhausted: boolean }
 */
export function calculateRangeExhaustion(consolidations, currentTime) {
    if (!consolidations || consolidations.length === 0) {
        return { timeInRange: 0, exhausted: false };
    }

    // Find most recent/active consolidation
    const activeRange = consolidations.find(c => c.status === 'ACTIVE') || consolidations[consolidations.length - 1];

    if (!activeRange) {
        return { timeInRange: 0, exhausted: false };
    }

    const timeInRange = currentTime - activeRange.startTime;
    const hoursInRange = timeInRange / (1000 * 60 * 60);

    // Range exhaustion thresholds (in hours)
    const exhaustionThreshold = activeRange.timeframe === '1H' ? 48 : // 48 hours for 1H
        activeRange.timeframe === '4H' ? 72 : // 72 hours for 4H
            120; // 120 hours for daily

    return {
        timeInRange: Math.round(hoursInRange),
        exhausted: hoursInRange > exhaustionThreshold,
        exhaustionPercent: Math.min((hoursInRange / exhaustionThreshold) * 100, 100)
    };
}

/**
 * Detect momentum divergence clustering
 * @param {Array} candles - Candlestick data
 * @param {Array} rsi - RSI values (if available)
 * @returns {Object} - { divergenceDetected: boolean, type: string, confidence: number }
 */
export function detectMomentumDivergence(candles, rsi = null) {
    if (candles.length < 30) {
        return { divergenceDetected: false, type: null, confidence: 0 };
    }

    const recent = candles.slice(-30);
    const prices = recent.map(c => c.close);

    // Calculate RSI if not provided
    if (!rsi) {
        rsi = calculateSimpleRSI(prices, 14);
    }

    // Find price peaks and troughs
    const priceHighs = [];
    const priceLows = [];

    for (let i = 1; i < recent.length - 1; i++) {
        if (recent[i].high > recent[i - 1].high && recent[i].high > recent[i + 1].high) {
            priceHighs.push({ index: i, price: recent[i].high });
        }
        if (recent[i].low < recent[i - 1].low && recent[i].low < recent[i + 1].low) {
            priceLows.push({ index: i, price: recent[i].low });
        }
    }

    // Bearish divergence: Higher price high, lower RSI high
    if (priceHighs.length >= 2) {
        const lastTwo = priceHighs.slice(-2);
        if (lastTwo[1].price > lastTwo[0].price && rsi < 60) {
            return {
                divergenceDetected: true,
                type: 'BEARISH',
                confidence: 0.75
            };
        }
    }

    // Bullish divergence: Lower price low, higher RSI low
    if (priceLows.length >= 2) {
        const lastTwo = priceLows.slice(-2);
        if (lastTwo[1].price < lastTwo[0].price && rsi > 40) {
            return {
                divergenceDetected: true,
                type: 'BULLISH',
                confidence: 0.75
            };
        }
    }

    return { divergenceDetected: false, type: null, confidence: 0 };
}

/**
 * Calculate regime transition probability
 * Combines all transition signals
 * @param {Object} marketState - Current market state
 * @param {Array} structures - Market structures
 * @param {Array} consolidations - Consolidation zones
 * @returns {Object} - { probability: number, expectedRegime: string, triggers: [] }
 */
export function calculateTransitionProbability(marketState, structures, consolidations) {
    let probability = 0;
    const triggers = [];

    // 1. Volatility compression (30 points)
    const compression = detectVolatilityCompression(marketState.candles || [], marketState.atr);
    if (compression.compressed) {
        probability += Math.min(compression.level * 0.3, 30);
        triggers.push(`Volatility compression (${compression.level}%)`);
    }

    // 2. Failed patterns (25 points)
    const failures = trackFailedPatterns(structures);
    if (failures.isAnomalous) {
        probability += 25;
        triggers.push(`Failed BOS rate (${failures.failureRate}%)`);
    }

    // 3. Range exhaustion (20 points)
    const exhaustion = calculateRangeExhaustion(consolidations, Date.now());
    if (exhaustion.exhausted) {
        probability += 20;
        triggers.push(`Range exhaustion (${exhaustion.timeInRange}h)`);
    }

    // 4. Momentum divergence (25 points)
    const divergence = detectMomentumDivergence(marketState.candles || []);
    if (divergence.divergenceDetected) {
        probability += 25;
        triggers.push(`${divergence.type} divergence`);
    }

    // Predict expected regime
    let expectedRegime = marketState.regime;

    if (probability > 60) {
        if (marketState.regime === 'RANGING') {
            expectedRegime = 'TRENDING';
        } else if (marketState.regime === 'TRENDING') {
            expectedRegime = divergence.type === 'BEARISH' ? 'TRANSITIONAL' : 'RANGING';
        } else {
            expectedRegime = 'RANGING';
        }
    }

    return {
        probability: Math.min(probability, 100),
        expectedRegime,
        triggers,
        confidence: probability / 100
    };
}
