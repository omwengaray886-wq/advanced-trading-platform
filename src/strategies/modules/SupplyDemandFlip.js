import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SupplyDemandZone } from '../../models/annotations/SupplyDemandZone.js';

/**
 * Supply/Demand Flip Strategy
 * Identifies zones that swap roles from Supply to Demand (or vice versa)
 */
export class SupplyDemandFlip extends StrategyBase {
    constructor() {
        super(
            'Supply/Demand Flip',
            'Trading zones that swap roles (S2D or D2S) after a breakout and retest.'
        );
    }

    evaluate(marketState) {
        // Works best in TRANSITIONAL or strongly TRENDING markets
        if (marketState.regime === 'TRANSITIONAL') return 0.90;
        if (marketState.regime === 'TRENDING') return 0.82;
        return 0.40;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const structures = marketState.structures || [];

        // Find "Old" zones that were broken
        // A bullish flip (S2D): Previous Supply High broken, now being retested as Demand
        const recentHighs = structures.filter(s => s.markerType === 'HH' || s.markerType === 'LH').slice(-5);
        const recentLows = structures.filter(s => s.markerType === 'LL' || s.markerType === 'HL').slice(-5);
        const currentPrice = candles[candles.length - 1].close;

        // Bullish Flip Detection (S2D)
        for (const high of recentHighs) {
            // If current price is above this high, it's a potential flip zone
            if (currentPrice > high.price) {
                // If price is currently pulling back towards this level
                const distance = (currentPrice - high.price) / high.price;
                if (distance < 0.005) {
                    annotations.push(new SupplyDemandZone(
                        high.price * 1.002,
                        high.price * 0.998,
                        'DEMAND',
                        { confidence: 0.88, note: 'Supply to Demand Flip', strength: 0.9 }
                    ));

                    annotations.push(new EntryZone(
                        high.price * 1.001,
                        high.price * 0.999,
                        'LONG',
                        { confidence: 0.85, note: 'S2D Retest Entry', timeframe: '1H' }
                    ));

                    const stopLoss = high.price * 0.994;
                    const risk = high.price - stopLoss;
                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                    annotations.push(new TargetProjection(high.price + (risk * 3), 'TARGET_1', { riskReward: 3.0 }));
                    break;
                }
            }
        }

        // Bearish Flip Detection (D2S)
        for (const low of recentLows) {
            if (currentPrice < low.price) {
                const distance = (low.price - currentPrice) / low.price;
                if (distance < 0.005) {
                    annotations.push(new SupplyDemandZone(
                        low.price * 1.002,
                        low.price * 0.998,
                        'SUPPLY',
                        { confidence: 0.88, note: 'Demand to Supply Flip', strength: 0.9 }
                    ));

                    annotations.push(new EntryZone(
                        low.price * 0.999,
                        low.price * 1.001,
                        'SHORT',
                        { confidence: 0.85, note: 'D2S Retest Entry', timeframe: '1H' }
                    ));

                    const stopLoss = low.price * 1.006;
                    const risk = stopLoss - low.price;
                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                    annotations.push(new TargetProjection(low.price - (risk * 3), 'TARGET_1', { riskReward: 3.0 }));
                    break;
                }
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter when price returns to a high-significance level that previously acted as the opposite ' +
            'supply/demand barrier. A "Flip" indicates that the market bias at that level has shifted definitively.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price passes through the zone without rejection, ' +
            'indicating that the level has lost its significance or the "flip" was a fakeout.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [3.0, 4.5]
        };
    }
}
