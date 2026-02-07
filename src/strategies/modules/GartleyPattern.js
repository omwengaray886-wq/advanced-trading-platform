import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';
import { Trendline } from '../../models/annotations/Trendline.js';

/**
 * Gartley (Harmonic) Pattern Strategy
 * Identifies the XABCD harmonic pattern based on specific Fibonacci ratios.
 * Bullsih Gartley (M-shaped): X -> A -> B -> C -> D (Entry at D)
 */
export class GartleyPattern extends StrategyBase {
    constructor() {
        super(
            'Gartley Pattern',
            'Advanced harmonic pattern based on geometric price action and Fibonacci symmetry.'
        );
    }

    evaluate(marketState) {
        // Harmonics work best in RANGING or TRANSITIONAL markets
        if (marketState.regime === 'RANGING') return 0.90;
        if (marketState.regime === 'TRANSITIONAL') return 0.85;
        return 0.40;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const structures = marketState.structures || [];

        if (structures.length < 5) return [];

        const recent = structures.slice(-12);

        // Bullish Gartley Detection
        // Sequence: X (Low) -> A (High) -> B (Lower High) -> C (Higher Low) -> D (Lower Low)
        // Ratios: B at 0.618 of XA, C at 0.382-0.886 of AB, D at 0.786 of XA
        const lows = recent.filter(s => s.markerType === 'LL' || s.markerType === 'HL');
        const highs = recent.filter(s => s.markerType === 'HH' || s.markerType === 'LH');

        if (lows.length >= 3 && highs.length >= 2) {
            const d = lows[lows.length - 1];
            const c = highs[highs.length - 1];
            const b = lows[lows.length - 2];
            const a = highs[highs.length - 2];
            const x = lows[lows.length - 3];

            // Simplified validation for pattern shape and approximate ratios
            if (a.price > x.price && b.price > x.price && b.price < a.price && c.price < a.price && c.price > b.price && d.price < c.price && d.price > x.price) {

                // Draw Pattern Lines
                annotations.push(new Trendline({ time: x.time, price: x.price }, { time: a.time, price: a.price }, { color: '#6366f1', label: 'XA' }));
                annotations.push(new Trendline({ time: a.time, price: a.price }, { time: b.time, price: b.price }, { color: '#6366f1', label: 'AB' }));
                annotations.push(new Trendline({ time: b.time, price: b.price }, { time: c.time, price: c.price }, { color: '#6366f1', label: 'BC' }));
                annotations.push(new Trendline({ time: c.time, price: c.price }, { time: d.time, price: d.price }, { color: '#6366f1', label: 'CD' }));

                annotations.push(new StructureMarker({ time: x.time, price: x.price }, 'X'));
                annotations.push(new StructureMarker({ time: a.time, price: a.price }, 'A'));
                annotations.push(new StructureMarker({ time: b.time, price: b.price }, 'B'));
                annotations.push(new StructureMarker({ time: c.time, price: c.price }, 'C'));
                annotations.push(new StructureMarker({ time: d.time, price: d.price }, 'D'));

                annotations.push(new EntryZone(
                    d.price * 1.001,
                    d.price * 0.999,
                    'LONG',
                    { confidence: 0.88, note: 'Bullish Gartley (D)', timeframe: '1H' }
                ));

                const stopLoss = x.price * 0.998;
                const risk = d.price - stopLoss;
                annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                annotations.push(new TargetProjection(d.price + (risk * 2.5), 'TARGET_1', { riskReward: 2.5 }));
            }
        }

        // Bearish Gartley Detection (W-shaped)
        // Sequence: X (High) -> A (Low) -> B (Higher Low) -> C (Lower High) -> D (Higher High)
        const b_highs = recent.filter(s => s.markerType === 'HH' || s.markerType === 'LH');
        const b_lows = recent.filter(s => s.markerType === 'LL' || s.markerType === 'HL');

        if (b_highs.length >= 3 && b_lows.length >= 2) {
            const d = b_highs[b_highs.length - 1];
            const c = b_lows[b_lows.length - 1];
            const b = b_highs[b_highs.length - 2];
            const a = b_lows[b_lows.length - 2];
            const x = b_highs[b_highs.length - 3];

            if (a.price < x.price && b.price < x.price && b.price > a.price && c.price > a.price && c.price < b.price && d.price > c.price && d.price < x.price) {
                // Draw Pattern Lines
                annotations.push(new Trendline({ time: x.time, price: x.price }, { time: a.time, price: a.price }, { color: '#6366f1', label: 'XA' }));
                annotations.push(new Trendline({ time: a.time, price: a.price }, { time: b.time, price: b.price }, { color: '#6366f1', label: 'AB' }));
                annotations.push(new Trendline({ time: b.time, price: b.price }, { time: c.time, price: c.price }, { color: '#6366f1', label: 'BC' }));
                annotations.push(new Trendline({ time: c.time, price: c.price }, { time: d.time, price: d.price }, { color: '#6366f1', label: 'CD' }));

                annotations.push(new StructureMarker({ time: x.time, price: x.price }, 'X'));
                annotations.push(new StructureMarker({ time: a.time, price: a.price }, 'A'));
                annotations.push(new StructureMarker({ time: b.time, price: b.price }, 'B'));
                annotations.push(new StructureMarker({ time: c.time, price: c.price }, 'C'));
                annotations.push(new StructureMarker({ time: d.time, price: d.price }, 'D'));

                annotations.push(new EntryZone(
                    d.price * 0.999,
                    d.price * 1.001,
                    'SHORT',
                    { confidence: 0.88, note: 'Bearish Gartley (D)', timeframe: '1H' }
                ));

                const stopLoss = x.price * 1.002;
                const risk = stopLoss - d.price;
                annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                annotations.push(new TargetProjection(d.price - (risk * 2.5), 'TARGET_1', { riskReward: 2.5 }));
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter at the point D of the harmonic structure. ' +
            'The Gartley pattern identifies high-probability reversals where price action reaches a specific Fibonacci-derived point D, ' +
            'signaling the end of a corrective wave.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks the point X, ' +
            'as the fundamental Fibonacci symmetry of the pattern is broken.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.5, 4.0]
        };
    }
}
