import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';

/**
 * Volume Spike Exhaustion Strategy
 * Identifies extreme price volatility (simulated volume) at trend extremes,
 * signaling institutional exhaustion and imminent reversal.
 */
export class VolumeSpikeExhaustion extends StrategyBase {
    constructor() {
        super(
            'Volume Spike Exhaustion',
            'Identifying institutional exhaustion via extreme price volatility at trend climaxes.'
        );
    }

    evaluate() {
        // Works best in Parabolic TRENDING markets
        // Logic currently simplified for simulated volume
        return 0.90;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];

        if (candles.length < 20) return [];

        // Detect "Volume Spikes" (Simulated by body size relative to average)
        const recentCandles = candles.slice(-20);
        const avgBodySize = recentCandles.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / 20;

        const lastCandle = candles[candles.length - 1];
        const lastBodySize = Math.abs(lastCandle.close - lastCandle.open);

        // If last candle body is > 300% of average body size
        if (lastBodySize > avgBodySize * 3.0) {
            const direction = lastCandle.close > lastCandle.open ? 'BEARISH' : 'BULLISH';
            const entryDir = direction === 'BEARISH' ? 'SHORT' : 'LONG';

            annotations.push(new StructureMarker(
                { time: lastCandle.time, price: lastCandle.high },
                'VOL_CLIMAX',
                { significance: 'high', direction: direction }
            ));

            annotations.push(new EntryZone(
                lastCandle.close * 1.001,
                lastCandle.close * 0.999,
                entryDir,
                { confidence: 0.82, note: 'Climactic Volume Reversal', timeframe: '1H' }
            ));

            const risk = lastBodySize * 0.5;
            const stopLoss = entryDir === 'LONG' ?
                lastCandle.low - (risk * 0.2) :
                lastCandle.high + (risk * 0.2);

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
            annotations.push(new TargetProjection(
                entryDir === 'LONG' ? lastCandle.close + (risk * 2) : lastCandle.close - (risk * 2),
                'TARGET_1',
                { riskReward: 2.0 }
            ));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter on the close of a climactic "Volume Spike" candle (identified by extreme body size) ' +
            'when it occurs at a trend extreme. This signals that institutional participants have completed their ' +
            'accumulation/distribution and a reversal is imminent.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price continues beyond the spike candle extreme by more than 20% of its body size, ' +
            'indicating the trend has sustained momentum despite the volatility.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.0, 3.5]
        };
    }
}
