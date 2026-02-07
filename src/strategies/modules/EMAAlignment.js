import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { calculateEMA } from '../../analysis/indicators.js';

/**
 * EMA Alignment Strategy
 * Trades trend continuation using 50 and 200 EMA crossovers and pullbacks
 */
export class EMAAlignment extends StrategyBase {
    constructor() {
        super(
            'EMA Alignment (50/200)',
            'Trading trend continuation when the 50 EMA is aligned with the 200 EMA and price pulls back to the averages'
        );
    }

    evaluate(marketState) {
        // Works best in strong TRENDING markets
        if (marketState.regime === 'TRENDING' && marketState.trend.strength > 0.7) return 0.95;
        if (marketState.regime === 'TRANSITIONAL') return 0.60;
        return 0.25;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const ema50 = calculateEMA(candles, 50);
        const ema200 = calculateEMA(candles, 200);

        if (ema200.length === 0) return [];

        const currentPrice = candles[candles.length - 1].close;
        const current50 = ema50[ema50.length - 1];
        const current200 = ema200[ema200.length - 1];

        // BULLISH ALIGNMENT (50 > 200)
        if (current50 > current200) {
            // Check if price is near EMA50 (pullback)
            const nearEMA50 = Math.abs(currentPrice - current50) / current50 < 0.005;

            if (nearEMA50) {
                annotations.push(new EntryZone(
                    current50 * 1.002,
                    current50 * 0.998,
                    'LONG',
                    { confidence: 0.85, note: '50 EMA Pullback', timeframe: '1H' }
                ));

                const stopLoss = current200 * 0.995;
                const risk = currentPrice - stopLoss;

                annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                annotations.push(new TargetProjection(currentPrice + (risk * 2), 'TARGET_1', { riskReward: 2.0 }));
                annotations.push(new TargetProjection(currentPrice + (risk * 4), 'TARGET_2', { riskReward: 4.0 }));
            }
        }

        // BEARISH ALIGNMENT (50 < 200)
        if (current50 < current200) {
            const nearEMA50 = Math.abs(currentPrice - current50) / current50 < 0.005;

            if (nearEMA50) {
                annotations.push(new EntryZone(
                    current50 * 0.998,
                    current50 * 1.002,
                    'SHORT',
                    { confidence: 0.85, note: '50 EMA Pullback', timeframe: '1H' }
                ));

                const stopLoss = current200 * 1.005;
                const risk = stopLoss - currentPrice;

                annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                annotations.push(new TargetProjection(currentPrice - (risk * 2), 'TARGET_1', { riskReward: 2.0 }));
                annotations.push(new TargetProjection(currentPrice - (risk * 4), 'TARGET_2', { riskReward: 4.0 }));
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter when price pulls back to the 50 EMA while it is trending above/below the 200 EMA. ' +
            'This "moving average alignment" indicates a strong institutional trend is in place.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks clearly through the 200 EMA, ' +
            'suggesting the long-term trend has shifted or a deep correction is starting.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.0, 4.0]
        };
    }
}
