import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';

/**
 * Quasimodo (Over-Under) Reversal Strategy
 * A sophisticated reversal pattern involving a fakeout (stop hunt)
 * followed by a break of structure and return to the shoulder level.
 */
export class QuasimodoReversal extends StrategyBase {
    constructor() {
        super(
            'Quasimodo (Over-Under)',
            'Advanced reversal pattern tracking fakeouts (stop hunts) followed by structure breaks.'
        );
    }

    evaluate(marketState) {
        // Quasimodo occurs at the end of trends, so TRANSITIONAL is ideal
        if (marketState.regime === 'TRANSITIONAL') return 0.95;
        // Also valid in TRENDING markets showing exhaustion
        if (marketState.regime === 'TRENDING' && marketState.trend.strength < 0.6) return 0.85;
        return 0.30;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const structures = marketState.structures || [];

        // Quasimodo Structure Requirements:
        // Bullish QM: Low -> High -> Lower Low -> Higher High. Entry at initial Low level.
        // Bearish QM: High -> Low -> Higher High -> Lower Low. Entry at initial High level.

        if (structures.length < 5) return [];

        const recent = structures.slice(-10);

        // Find potential Bearish QM (Over-Under)
        // Sequence: High (H1) -> Low (L1) -> Higher High (HH) -> Lower Low (LL)
        for (let i = 3; i < recent.length; i++) {
            const ll = recent[i]; // Lower Low
            const hh = recent[i - 1]; // Higher High
            const l1 = recent[i - 2]; // Initial Low
            const h1 = recent[i - 3]; // Initial High (The QM level)

            if (ll.markerType === 'LL' && hh.markerType === 'HH' && h1.markerType === 'HH') {
                // If LL broke L1 and HH broke H1, we have a QM structure
                if (hh.price > h1.price && ll.price < l1.price) {
                    annotations.push(new StructureMarker(
                        { time: h1.time, price: h1.price },
                        'QM_LEVEL',
                        { significance: 'high', direction: 'BEARISH' }
                    ));

                    annotations.push(new EntryZone(
                        h1.price * 1.001,
                        h1.price * 0.999,
                        'SHORT',
                        { confidence: 0.92, note: 'Quasimodo (Over-Under) Entry', timeframe: '1H' }
                    ));

                    const stopLoss = hh.price * 1.002;
                    const risk = stopLoss - h1.price;
                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));

                    annotations.push(new TargetProjection(
                        h1.price - (risk * 3.5),
                        'TARGET_1',
                        { riskReward: 3.5, probability: 0.70 }
                    ));
                    break;
                }
            }
        }

        // Find potential Bullish QM
        // Sequence: Low (L1) -> High (H1) -> Lower Low (LL) -> Higher High (HH)
        for (let i = 3; i < recent.length; i++) {
            const hh = recent[i];
            const ll = recent[i - 1];
            const h1 = recent[i - 2];
            const l1 = recent[i - 3];

            if (hh.markerType === 'HH' && ll.markerType === 'LL' && l1.markerType === 'LL') {
                if (ll.price < l1.price && hh.price > h1.price) {
                    annotations.push(new StructureMarker(
                        { time: l1.time, price: l1.price },
                        'QM_LEVEL',
                        { significance: 'high', direction: 'BULLISH' }
                    ));

                    annotations.push(new EntryZone(
                        l1.price * 0.999,
                        l1.price * 1.001,
                        'LONG',
                        { confidence: 0.92, note: 'Quasimodo Entry (Bullish)', timeframe: '1H' }
                    ));

                    const stopLoss = ll.price * 0.998;
                    const risk = l1.price - stopLoss;
                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));

                    annotations.push(new TargetProjection(
                        l1.price + (risk * 3.5),
                        'TARGET_1',
                        { riskReward: 3.5, probability: 0.70 }
                    ));
                    break;
                }
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter at the initial "shoulder" level after a Quasimodo structure is confirmed. ' +
            'The structure requires price to sweep liquidity (making a Higher High or Lower Low) ' +
            'before aggressively breaking structure in the opposite direction.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks the new extreme (HH/LL), ' +
            'indicating that the reversal was unsuccessful and momentum has returned to the trend.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [3.5, 5.0]
        };
    }
}
