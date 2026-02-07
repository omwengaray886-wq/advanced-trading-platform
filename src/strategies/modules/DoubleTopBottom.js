import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';

/**
 * Double Top / Bottom Strategy
 * Trades price reversals at equal highs/lows (W and M patterns)
 */
export class DoubleTopBottom extends StrategyBase {
    constructor() {
        super(
            'Double Top / Bottom',
            'Trading reversals at significant equal price levels (M and W patterns)'
        );
    }

    evaluate(marketState) {
        // Works best in RANGING or exhausting TRENDING markets
        if (marketState.regime === 'RANGING') return 0.85;
        if (marketState.regime === 'TRANSITIONAL') return 0.70;
        return 0.35;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const structures = marketState.structures || [];

        // Find potential Double Top (M-Pattern)
        const recentHighs = structures.filter(s => s.type === 'SWING_HIGH').slice(-4);
        if (recentHighs.length >= 2) {
            for (let i = 1; i < recentHighs.length; i++) {
                const prev = recentHighs[i - 1];
                const curr = recentHighs[i];

                // If prices are within 0.1% proximity
                const diff = Math.abs(prev.price - curr.price) / prev.price;
                if (diff < 0.001) {
                    annotations.push(new StructureMarker(
                        { time: curr.time, price: curr.price },
                        'DOUBLE_TOP',
                        { significance: 'high', direction: 'BEARISH' }
                    ));

                    // Entry Zone near the second top
                    annotations.push(new EntryZone(
                        curr.price * 1.001,
                        curr.price * 0.999,
                        'SHORT',
                        { confidence: 0.78, note: 'Double Top Entry', timeframe: '1H' }
                    ));

                    const stopLoss = Math.max(prev.price, curr.price) * 1.005;
                    const risk = Math.abs(curr.price - stopLoss);
                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));

                    annotations.push(new TargetProjection(
                        curr.price - (risk * 3),
                        'TARGET_1',
                        { riskReward: 3.0, probability: 0.60 }
                    ));
                    break;
                }
            }
        }

        // Find potential Double Bottom (W-Pattern)
        const recentLows = structures.filter(s => s.type === 'SWING_LOW').slice(-4);
        if (recentLows.length >= 2) {
            for (let i = 1; i < recentLows.length; i++) {
                const prev = recentLows[i - 1];
                const curr = recentLows[i];

                const diff = Math.abs(prev.price - curr.price) / prev.price;
                if (diff < 0.001) {
                    annotations.push(new StructureMarker(
                        { time: curr.time, price: curr.price },
                        'DOUBLE_BOTTOM',
                        { significance: 'high', direction: 'BULLISH' }
                    ));

                    annotations.push(new EntryZone(
                        curr.price * 0.999,
                        curr.price * 1.001,
                        'LONG',
                        { confidence: 0.78, note: 'Double Bottom Entry', timeframe: '1H' }
                    ));

                    const stopLoss = Math.min(prev.price, curr.price) * 0.995;
                    const risk = Math.abs(curr.price - stopLoss);
                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));

                    annotations.push(new TargetProjection(
                        curr.price + (risk * 3),
                        'TARGET_1',
                        { riskReward: 3.0, probability: 0.60 }
                    ));
                    break;
                }
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter when price establishes a second peak or trough at approximately the same level as the first. ' +
            'This suggests that the market is unable to break the level, leading to a likely reversal.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks clearly through the double top/bottom level, ' +
            'indicating that the level has been breached and the previous trend is likely continuing.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.5, 4.0]
        };
    }
}
