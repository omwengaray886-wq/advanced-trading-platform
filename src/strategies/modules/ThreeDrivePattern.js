import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';

/**
 * Three-Drive Pattern Strategy
 * Identifies 3-stepped price exhaustion (Harmonic pattern)
 */
export class ThreeDrivePattern extends StrategyBase {
    constructor() {
        super(
            'Three-Drive Pattern',
            'Trading price exhaustion identified by three distinct, symmetrical drives in a single direction.'
        );
    }

    evaluate(marketState) {
        // Works best in Exhausted TRENDING or RANGING markets
        if (marketState.regime === 'TRANSITIONAL') return 0.88;
        if (marketState.regime === 'TRENDING' && marketState.trend.strength < 0.6) return 0.82;
        return 0.35;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const structures = marketState.structures || [];

        if (structures.length < 6) return [];

        const recent = structures.slice(-12);

        // Detect Bearish Three-Drive (Exhaustion at highs)
        // Sequence: Drive 1 (Peak) -> Drive 2 (Higher Peak) -> Drive 3 (Highest Peak)
        const highs = recent.filter(s => s.markerType === 'HH' || s.markerType === 'LH');
        if (highs.length >= 3) {
            const d3 = highs[highs.length - 1];
            const d2 = highs[highs.length - 2];
            const d1 = highs[highs.length - 3];

            // Check for symmetry and ascending highs
            if (d3.price > d2.price && d2.price > d1.price) {
                const move1 = d2.price - d1.price;
                const move2 = d3.price - d2.price;
                const symmetry = Math.abs(move1 - move2) / move1;

                if (symmetry < 0.25) { // Within 25% symmetry
                    annotations.push(new StructureMarker(
                        { time: d3.time, price: d3.price },
                        '3-DRIVE (Peak)',
                        { significance: 'high', direction: 'BEARISH' }
                    ));

                    annotations.push(new EntryZone(
                        d3.price * 1.0005,
                        d3.price * 0.9995,
                        'SHORT',
                        { confidence: 0.84, note: 'Three-Drive Exhaustion', timeframe: '1H' }
                    ));

                    const stopLoss = d3.price + (move2 * 0.5);
                    const risk = stopLoss - d3.price;
                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                    annotations.push(new TargetProjection(d3.price - (risk * 3), 'TARGET_1', { riskReward: 3.0 }));
                }
            }
        }

        // Detect Bullish Three-Drive (Exhaustion at lows)
        const lows = recent.filter(s => s.markerType === 'LL' || s.markerType === 'HL');
        if (lows.length >= 3) {
            const d3 = lows[lows.length - 1];
            const d2 = lows[lows.length - 2];
            const d1 = lows[lows.length - 3];

            if (d3.price < d2.price && d2.price < d1.price) {
                const move1 = d1.price - d2.price;
                const move2 = d2.price - d3.price;
                const symmetry = Math.abs(move1 - move2) / move1;

                if (symmetry < 0.25) {
                    annotations.push(new StructureMarker(
                        { time: d3.time, price: d3.price },
                        '3-DRIVE (Bottom)',
                        { significance: 'high', direction: 'BULLISH' }
                    ));

                    annotations.push(new EntryZone(
                        d3.price * 0.9995,
                        d3.price * 1.0005,
                        'LONG',
                        { confidence: 0.84, note: 'Three-Drive Bottom', timeframe: '1H' }
                    ));

                    const stopLoss = d3.price - (move2 * 0.5);
                    const risk = d3.price - stopLoss;
                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                    annotations.push(new TargetProjection(d3.price + (risk * 3), 'TARGET_1', { riskReward: 3.0 }));
                }
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter at the third drive (peak/trough) of a symmetrical exhaustion pattern. ' +
            'This harmonic structure identifies when a trend has run out of momentum after three distinct pushes.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price continues through the third drive level without rejection, ' +
            'indicating that the trend has successfully extended into a new phase of momentum.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [3.0, 4.5]
        };
    }
}
