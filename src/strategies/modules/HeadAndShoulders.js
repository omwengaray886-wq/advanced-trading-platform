import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';
import { Trendline } from '../../models/annotations/Trendline.js';

/**
 * Head & Shoulders Strategy
 * Identifies the classic reversal pattern consisting of three peaks:
 * a higher middle peak (head) between two lower peaks (shoulders).
 */
export class HeadAndShoulders extends StrategyBase {
    constructor() {
        super(
            'Head & Shoulders',
            'Classic multi-peak reversal pattern signaling the end of a major trend.'
        );
    }

    evaluate(marketState) {
        // Head & Shoulders is a major reversal pattern
        if (marketState.regime === 'TRANSITIONAL') return 0.95;
        if (marketState.regime === 'TRENDING' && marketState.trend.strength < 0.5) return 0.85;
        return 0.30;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const structures = marketState.structures || [];

        if (structures.length < 5) return [];

        const recent = structures.slice(-15);

        // Detect Bearish Head & Shoulders
        // Sequence: LS (High) -> Head (Higher High) -> RS (Lower High)
        const highs = recent.filter(s => s.markerType === 'HH' || s.markerType === 'LH');
        const lows = recent.filter(s => s.markerType === 'LL' || s.markerType === 'HL');

        if (highs.length >= 3 && lows.length >= 2) {
            const h3 = highs[highs.length - 1]; // Right Shoulder
            const h2 = highs[highs.length - 2]; // Head
            const h1 = highs[highs.length - 3]; // Left Shoulder

            const l2 = lows[lows.length - 1]; // Right Neckline low
            const l1 = lows[lows.length - 2]; // Left Neckline low

            // Bearish H&S logic
            if (h2.price > h1.price && h2.price > h3.price && Math.abs(h1.price - h3.price) / h1.price < 0.02) {
                // Neckline is the line connecting l1 and l2
                annotations.push(new Trendline(
                    { time: l1.time, price: l1.price },
                    { time: l2.time, price: l2.price },
                    { color: '#ef4444', style: 'solid', label: 'Neckline' }
                ));

                annotations.push(new StructureMarker({ time: h1.time, price: h1.price }, 'LS'));
                annotations.push(new StructureMarker({ time: h2.time, price: h2.price }, 'HEAD'));
                annotations.push(new StructureMarker({ time: h3.time, price: h3.price }, 'RS'));

                const currentPrice = candles[candles.length - 1].close;

                // Potential Entry on neckline break/retest
                if (currentPrice < l2.price) {
                    annotations.push(new EntryZone(
                        l2.price * 1.0005,
                        l2.price * 0.9995,
                        'SHORT',
                        { confidence: 0.90, note: 'H&S Neckline Break', timeframe: '1H' }
                    ));

                    const stopLoss = h3.price;
                    const headHeight = h2.price - l2.price;

                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                    annotations.push(new TargetProjection(l2.price - headHeight, 'TARGET_MAX', { riskReward: headHeight / (stopLoss - l2.price) }));
                }
            }
        }

        // Detect Inverse Head & Shoulders (Bullish)
        // Sequence: LS (Low) -> Head (Lower Low) -> RS (Higher Low)
        const inv_lows = recent.filter(s => s.markerType === 'LL' || s.markerType === 'HL');
        const inv_highs = recent.filter(s => s.markerType === 'HH' || s.markerType === 'LH');

        if (inv_lows.length >= 3 && inv_highs.length >= 2) {
            const l3 = inv_lows[inv_lows.length - 1]; // RS
            const l2 = inv_lows[inv_lows.length - 2]; // Head
            const l1 = inv_lows[inv_lows.length - 3]; // LS

            const h2 = inv_highs[inv_highs.length - 1]; // Right Neckline peak
            const h1 = inv_highs[inv_highs.length - 2]; // Left Neckline peak

            if (l2.price < l1.price && l2.price < l3.price && Math.abs(l1.price - l3.price) / l1.price < 0.02) {
                annotations.push(new Trendline(
                    { time: h1.time, price: h1.price },
                    { time: h2.time, price: h2.price },
                    { color: '#10b981', style: 'solid', label: 'Neckline' }
                ));

                annotations.push(new StructureMarker({ time: l1.time, price: l1.price }, 'LS'));
                annotations.push(new StructureMarker({ time: l2.time, price: l2.price }, 'HEAD'));
                annotations.push(new StructureMarker({ time: l3.time, price: l3.price }, 'RS'));

                const currentPrice = candles[candles.length - 1].close;

                if (currentPrice > h2.price) {
                    annotations.push(new EntryZone(
                        h2.price * 0.9995,
                        h2.price * 1.0005,
                        'LONG',
                        { confidence: 0.90, note: 'Inverse H&S Break', timeframe: '1H' }
                    ));

                    const stopLoss = l3.price;
                    const headDepth = h2.price - l2.price;

                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                    annotations.push(new TargetProjection(h2.price + headDepth, 'TARGET_MAX', { riskReward: headDepth / (h2.price - stopLoss) }));
                }
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter on the break or retest of the neckline after the Right Shoulder has formed. ' +
            'The Head & Shoulders is a high-significance pattern that marks the definitive exhaustion of a trend.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price returns above/below the Right Shoulder peak, ' +
            'indicating the pattern has failed and the trend may continue.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [3.0, 5.0]
        };
    }
}
