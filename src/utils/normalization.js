/**
 * Common normalization for directional terminology
 * Standardizes LONG/BULLISH/UP and SHORT/BEARISH/DOWN
 */
export const normalizeDirection = (d) => {
    if (!d) return 'NEUTRAL';
    const upper = d.toUpperCase();
    if (upper.includes('BULLISH') || upper.includes('LONG') || upper === 'UP') return 'BULLISH';
    if (upper.includes('BEARISH') || upper.includes('SHORT') || upper === 'DOWN') return 'BEARISH';
    return 'NEUTRAL';
};

/**
 * Check if two assets are inversely correlated (primarily against DXY)
 */
export const isInversePair = (a, b) => {
    if (!a || !b) return false;
    const pairA = a.replace('/', '').toUpperCase();
    const pairB = b.replace('/', '').toUpperCase();

    // 1. Compare against DXY
    if (pairB === 'DXY') {
        if (pairA.startsWith('USD') && !pairA.includes('USDT') && !pairA.includes('USDC')) return false;
        return true;
    }
    if (pairA === 'DXY') {
        if (pairB.startsWith('USD') && !pairB.includes('USDT')) return false;
        return true;
    }

    // 2. Direct inverse pairs (Forex/Metals)
    const inversePairs = {
        'EURUSD': [], // Add valid inverses if any (e.g. DXY handled above)
        'XAUUSD': ['EURUSD'] // Gold often moves with EUR vs USD
    };

    return (inversePairs[pairA] || []).includes(pairB) || (inversePairs[pairB] || []).includes(pairA);
};
