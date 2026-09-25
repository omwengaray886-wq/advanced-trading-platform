/**
 * Tactical News Engine
 * Detects "Tactical Sweep" opportunities (fake-outs) during high-impact news releases.
 */
export class TacticalNewsEngine {
    constructor() { }

    /**
     * Analyze if a tactical sweep opportunity exists
     * @param {Object} marketState - Current market state with candles and pools
     * @param {Object} fundamentals - Fundamental context including proximity
     * @returns {Object|null} - Tactical setup or null
     */
    detectTacticalOpportunity(marketState, fundamentals) {
        const proximity = fundamentals?.proximityAnalysis;
        if (!proximity?.event || (!proximity.isImminent && proximity.minutesToEvent > -120)) {
            // Only active 2 hours before and 2 hours after
            return null;
        }

        const { candles, volumeAnalysis, liquidityPools } = marketState;
        if (!candles || candles.length < 5) return null;

        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];
        const indicator = fundamentals.impact?.newsAdvice || 'NORMAL';

        // 1. Identify "Imminent Sweep" phase (Pre-release or Release window)
        // If price is very close to a major pool during a release
        const nearbyPool = (liquidityPools || []).find(p => {
            const dist = Math.abs(p.price - lastCandle.close) / lastCandle.close;
            return dist < 0.002; // Within 0.2%
        });

        // 2. Identify "Rejection" phase (Already swiped and reversing)
        const isRejection = this._detectRejectionWick(lastCandle, prevCandle);

        // 3. Match with Fundamental Bias
        const tacticalType = this._determineTacticalType(isRejection, nearbyPool, indicator);

        if (!tacticalType) return null;

        return {
            type: tacticalType,
            status: isRejection ? 'SWEEP_CONFIRMED' : 'WAITING_FOR_GRAB',
            targetLevel: nearbyPool?.price || null,
            bias: indicator,
            confidence: proximity.event.tier === 'TIER 1' ? 0.85 : 0.65,
            message: this._generateMessage(tacticalType, isRejection, proximity.event.type)
        };
    }

    _detectRejectionWick(current, previous) {
        const body = Math.abs(current.open - current.close);
        const upperWick = current.high - Math.max(current.open, current.close);
        const lowerWick = Math.min(current.open, current.close) - current.low;
        const totalSize = current.high - current.low;

        if (totalSize === 0) return false;

        // Long wick rejection (70% of candle is wick)
        return (upperWick / totalSize > 0.6) || (lowerWick / totalSize > 0.6);
    }

    _determineTacticalType(isRejection, nearbyPool, indicator) {
        if (isRejection) return 'TACTICAL_REVERSED';
        if (nearbyPool) return 'POTENTIAL_SWEEP_ZONE';
        return null;
    }

    _generateMessage(type, confirmed, eventType) {
        if (type === 'TACTICAL_REVERSED') return `Tactical rejection detected following ${eventType}. entering fundamental bias.`;
        if (type === 'POTENTIAL_SWEEP_ZONE') return `Price in liquidity zone during ${eventType}. Waiting for fake-out rejection.`;
        return `Monitoring tactical fake-outs for ${eventType}.`;
    }
}

export const tacticalNewsEngine = new TacticalNewsEngine();
