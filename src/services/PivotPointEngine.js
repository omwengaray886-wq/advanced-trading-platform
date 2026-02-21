/**
 * PivotPointEngine.js
 * 
 * Calculates institutional pivot point levels from previous day OHLC data.
 * 
 * Supported methods:
 *  - CLASSIC  : Standard floor pivot points (most common)
 *  - CAMARILLA : Camarilla equation (tight levels for intraday scalping)
 *  - WOODIE   : Woodie's pivots (similar to classic but weights close more heavily)
 *
 * Formula reference:
 *  Classic  : PP = (H + L + C) / 3
 *  Woodie   : PP = (H + L + 2C) / 4
 *  Camarilla: PP = (H + L + C) / 3  (same pp, but R/S levels differ)
 */

/**
 * Extracts the previous day's OHLC (high, low, close, open) from chart candle data.
 * candles: array of { time, open, high, low, close } (time is UNIX seconds)
 * Returns { high, low, close, open } or null if not enough data.
 */
export function getPreviousDayOHLC(candles) {
    if (!candles || candles.length < 2) return null;

    const now = new Date();
    // Start of TODAY (UTC midnight, in seconds)
    const todayStart = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ) / 1000;

    // Start of YESTERDAY
    const yesterdayStart = todayStart - 86400;

    // Filter previous day candles
    const prevDayCandles = candles.filter(
        c => c.time >= yesterdayStart && c.time < todayStart
    );

    if (prevDayCandles.length === 0) {
        // Fallback: use the last 24 candles worth of data if no clean daily separation
        // (handles cases where the user is on a lower timeframe with limited history)
        const fallback = candles.slice(-48);
        if (fallback.length < 2) return null;
        const half = Math.floor(fallback.length / 2);
        const prevSet = fallback.slice(0, half);
        return {
            high: Math.max(...prevSet.map(c => c.high)),
            low: Math.min(...prevSet.map(c => c.low)),
            close: prevSet[prevSet.length - 1].close,
            open: prevSet[0].open,
        };
    }

    return {
        high: Math.max(...prevDayCandles.map(c => c.high)),
        low: Math.min(...prevDayCandles.map(c => c.low)),
        close: prevDayCandles[prevDayCandles.length - 1].close,
        open: prevDayCandles[0].open,
    };
}

/**
 * Computes Classic pivot points.
 *  PP  = (H + L + C) / 3
 *  R1  = 2*PP - L
 *  R2  = PP + (H - L)
 *  R3  = H + 2*(PP - L)
 *  S1  = 2*PP - H
 *  S2  = PP - (H - L)
 *  S3  = L - 2*(H - PP)
 */
export function calcClassicPivots({ high, low, close }) {
    const PP = (high + low + close) / 3;
    const range = high - low;
    return {
        PP,
        R1: 2 * PP - low,
        R2: PP + range,
        R3: high + 2 * (PP - low),
        S1: 2 * PP - high,
        S2: PP - range,
        S3: low - 2 * (high - PP),
    };
}

/**
 * Computes Woodie pivot points.
 * Woodie gives more weight to the closing price.
 *  PP  = (H + L + 2C) / 4
 *  R1  = 2*PP - L
 *  R2  = PP + H - L
 *  R3  = H + 2*(PP - L)
 *  R4  = R3 + (H - L)
 *  S1  = 2*PP - H
 *  S2  = PP - H + L
 *  S3  = L - 2*(H - PP)
 *  S4  = S3 - (H - L)
 */
export function calcWoodiePivots({ high, low, close }) {
    const PP = (high + low + 2 * close) / 4;
    const range = high - low;
    return {
        PP,
        R1: 2 * PP - low,
        R2: PP + range,
        R3: high + 2 * (PP - low),
        R4: high + 2 * (PP - low) + range,
        S1: 2 * PP - high,
        S2: PP - range,
        S3: low - 2 * (high - PP),
        S4: low - 2 * (high - PP) - range,
    };
}

/**
 * Computes Camarilla pivot points.
 * Camarilla levels are tighter than Classic and designed for intraday reversion.
 *  PP  = (H + L + C) / 3
 *  R1  = C + range * 1.1/12
 *  R2  = C + range * 1.1/6
 *  R3  = C + range * 1.1/4
 *  R4  = C + range * 1.1/2
 *  S1  = C - range * 1.1/12
 *  S2  = C - range * 1.1/6
 *  S3  = C - range * 1.1/4
 *  S4  = C - range * 1.1/2
 */
export function calcCamarillaPivots({ high, low, close }) {
    const PP = (high + low + close) / 3;
    const range = high - low;
    return {
        PP,
        R1: close + range * (1.1 / 12),
        R2: close + range * (1.1 / 6),
        R3: close + range * (1.1 / 4),
        R4: close + range * (1.1 / 2),
        S1: close - range * (1.1 / 12),
        S2: close - range * (1.1 / 6),
        S3: close - range * (1.1 / 4),
        S4: close - range * (1.1 / 2),
    };
}

/**
 * Master function: returns all pivot levels for the given method.
 * @param {Array} candles - chart candle array [{ time, open, high, low, close }]
 * @param {'CLASSIC'|'WOODIE'|'CAMARILLA'} method
 * @returns {{ PP, R1, R2, R3, [R4], S1, S2, S3, [S4] } | null}
 */
export function computePivotPoints(candles, method = 'CLASSIC') {
    const ohlc = getPreviousDayOHLC(candles);
    if (!ohlc) return null;

    switch (method) {
        case 'WOODIE': return calcWoodiePivots(ohlc);
        case 'CAMARILLA': return calcCamarillaPivots(ohlc);
        case 'CLASSIC':
        default: return calcClassicPivots(ohlc);
    }
}

/**
 * Converts computed pivot levels into chart price-line objects ready
 * for rendering in Markets.jsx.
 *
 * @param {Object} pivots   - result from computePivotPoints()
 * @param {string} method   - 'CLASSIC' | 'WOODIE' | 'CAMARILLA'
 * @param {Function} fmt    - price formatting function, e.g. p => p.toFixed(5)
 * @returns {Array<{ price, color, lineWidth, lineStyle, title, label }>}
 */
export function pivotLevelsToLines(pivots, method = 'CLASSIC', fmt = p => p.toFixed(5)) {
    if (!pivots) return [];

    // Color palette:
    // PP  → gold/amber
    // R1-R4 → red shades (R1 lightest, R4 darkest/most opaque)
    // S1-S4 → green shades

    const ppColor = 'rgba(251, 191, 36, 0.85)';  // amber
    const r1Color = 'rgba(239, 68, 68, 0.55)';
    const r2Color = 'rgba(239, 68, 68, 0.70)';
    const r3Color = 'rgba(239, 68, 68, 0.85)';
    const r4Color = 'rgba(185, 28, 28, 0.90)';
    const s1Color = 'rgba(34, 197, 94, 0.55)';
    const s2Color = 'rgba(34, 197, 94, 0.70)';
    const s3Color = 'rgba(34, 197, 94, 0.85)';
    const s4Color = 'rgba(21, 128, 61, 0.90)';

    // lineStyle: 0=Solid, 1=Dotted, 2=Dashed
    const lines = [
        { key: 'PP', color: ppColor, lineWidth: 2, lineStyle: 0 },
        { key: 'R1', color: r1Color, lineWidth: 1, lineStyle: 2 },
        { key: 'R2', color: r2Color, lineWidth: 1, lineStyle: 2 },
        { key: 'R3', color: r3Color, lineWidth: 1, lineStyle: 1 },
        { key: 'S1', color: s1Color, lineWidth: 1, lineStyle: 2 },
        { key: 'S2', color: s2Color, lineWidth: 1, lineStyle: 2 },
        { key: 'S3', color: s3Color, lineWidth: 1, lineStyle: 1 },
    ];

    // Extra R4/S4 only for Camarilla and Woodie
    if (method === 'CAMARILLA' || method === 'WOODIE') {
        lines.push({ key: 'R4', color: r4Color, lineWidth: 2, lineStyle: 0 });
        lines.push({ key: 'S4', color: s4Color, lineWidth: 2, lineStyle: 0 });
    }

    const prefix = method === 'CAMARILLA' ? '[C]' : method === 'WOODIE' ? '[W]' : '';

    return lines
        .filter(l => pivots[l.key] != null && isFinite(pivots[l.key]))
        .map(l => ({
            price: pivots[l.key],
            color: l.color,
            lineWidth: l.lineWidth,
            lineStyle: l.lineStyle,
            title: `${prefix}${l.key}`,
            label: `${prefix}${l.key} @ ${fmt(pivots[l.key])}`,
        }));
}
