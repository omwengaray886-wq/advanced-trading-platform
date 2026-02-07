import { StrategyBase } from '../StrategyBase.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';

/**
 * CHoCH Reversal Strategy
 * Trades the first structural break after a sustained trend
 */
export class CHoCHReversal extends StrategyBase {
    constructor() {
        super(
            'Change of Character (CHoCH)',
            'Trading potential trend reversals identified by the first break of recent counter-trend structure'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // CHoCH is most valid in TRANSITIONAL or exhausted TRENDING markets
        let score = 0.25;

        if (marketState.regime === 'TRANSITIONAL') score = 0.90;
        else if (marketState.regime === 'TRENDING' && marketState.trend.strength < 0.4) score = 0.75;

        // Alignment with MTF global bias gives a boost
        if (marketState.mtf?.globalBias === structuralDirection) score *= 1.2;

        return Math.min(score, 1.0);
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        const structures = marketState.structures || [];
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // Find the latest CHOCH in the market state structures that matches our desired direction
        const latestChoch = structures.filter(s =>
            s.markerType === 'CHOCH' &&
            s.direction === structuralDirection
        ).slice(-1)[0];

        if (latestChoch) {
            annotations.push(new StructureMarker(
                { time: latestChoch.time, price: latestChoch.price },
                'CHOCH',
                { significance: 'high', direction: latestChoch.direction }
            ));

            const currentPrice = candles[candles.length - 1].close;

            // Find retracement zone for entry (around the CHOCH level with ATR buffer)
            const atr = this.calculateATR(candles);
            const buffer = atr * 0.2;

            const entryZone = new EntryZone(
                latestChoch.price + (direction === 'LONG' ? buffer : -buffer),
                latestChoch.price - (direction === 'LONG' ? buffer : -buffer),
                direction,
                { confidence: 0.82, note: 'CHOCH Institutional Entry', timeframe: marketState.timeframe }
            );
            annotations.push(entryZone);

            // STOP LOSS - at the structural low/high that preceded the CHOCH
            const stopLoss = this.getStructuralInvalidation(candles, direction, marketState);
            const risk = Math.abs(latestChoch.price - stopLoss);

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));

            // Targets based on fixed R:R for CHoCH reversals
            annotations.push(new TargetProjection(
                direction === 'LONG' ? currentPrice + (risk * 2.5) : currentPrice - (risk * 2.5),
                'TARGET_1',
                { riskReward: 2.5, probability: 0.65 }
            ));

            annotations.push(new TargetProjection(
                direction === 'LONG' ? currentPrice + (risk * 4.0) : currentPrice - (risk * 4.0),
                'TARGET_2',
                { riskReward: 4.0, probability: 0.45 }
            ));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter on the retest of the Change of Character (CHoCH) level. ' +
            'This confirms that institutional order flow has shifted and the previous trend structure is invalidated.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks back through the origin of the CHoCH move (the previous swing high/low), ' +
            'indicating the reversal was a fakeout and the original trend remains intact.';
    }

    getDetailedRationale(candles, marketState, annotations) {
        const direction = annotations.find(a => a.type === 'ENTRY_ZONE')?.direction || 'neutral';
        return `The ${this.name} setup identifies a ${direction} shift in market character. ` +
            `By waiting for the break of counter-trend structure, we align with the new institutional flow. ` +
            `Entry is optimized at the CHoCH level where significant liquidity was originaly injected.`;
    }

    getInstitutionalTheme() {
        return 'Structural Shift & Order Flow Reversal';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.5, 4.0]
        };
    }
}
