import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { ChartAnnotation } from '../../models/ChartAnnotation.js';
import { AssetClassAdapter } from '../../services/assetClassAdapter.js';

/**
 * Asian Range Breakout Strategy
 * Trades breakouts of the Asian session price range
 */
export class AsianRangeBreakout extends StrategyBase {
    constructor() {
        super(
            'Asian Range Breakout',
            'Trading breakouts of the Asian session high/low boundaries during London open'
        );
    }

    evaluate(marketState) {
        // Only relevant for Forex
        if (marketState.assetClass !== 'FOREX') return 0.1;

        // Check current time - best during London open (08:00 - 10:00 UTC)
        const now = Date.now() / 1000;
        const date = new Date(now * 1000);
        const hour = date.getUTCHours();

        if (hour >= 8 && hour <= 10) return 0.90;
        if (hour > 10 && hour < 13) return 0.60;

        return 0.30;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const lastCandle = candles[candles.length - 1];

        // Find Asian range window
        const asianWindow = AssetClassAdapter.getSessionWindow(lastCandle.time, 'ASIAN');
        if (!asianWindow) return [];

        const asianCandles = candles.filter(c => c.time >= asianWindow.start && c.time < asianWindow.end);
        if (asianCandles.length < 5) return [];

        const asianHigh = Math.max(...asianCandles.map(c => c.high));
        const asianLow = Math.min(...asianCandles.map(c => c.low));
        const range = asianHigh - asianLow;

        // Add Asian Range box annotation
        annotations.push(new SessionBox(asianWindow.start, asianWindow.end, asianHigh, asianLow, 'Asian Range'));

        const currentPrice = lastCandle.close;
        const isBreakingHigh = currentPrice > asianHigh;
        const isBreakingLow = currentPrice < asianLow;

        if (isBreakingHigh || isBreakingLow) {
            const direction = isBreakingHigh ? 'LONG' : 'SHORT';
            const entryPrice = isBreakingHigh ? asianHigh : asianLow;
            const atr = marketState.atr || this.calculateATR(candles);
            const buffer = atr * 0.1;

            // Entry zone at the breakout level with ATR buffer
            const entryZone = new EntryZone(
                entryPrice + (direction === 'LONG' ? buffer : -buffer),
                entryPrice - (direction === 'LONG' ? buffer : -buffer),
                direction,
                { confidence: 0.85, note: 'Asian Brk', timeframe: '1H' }
            );
            annotations.push(entryZone);

            // STOP LOSS - mid-range or opposite end
            const stopLoss = isBreakingHigh ? asianHigh - (range * 0.5) : asianLow + (range * 0.5);

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: `SL: ${stopLoss.toFixed(5)}` }));

            // Standardized Targets using regime-aware logic
            const targets = this.generateStandardTargets(entryZone.getOptimalEntry(), stopLoss, marketState.liquidityPools, direction, marketState);
            targets.forEach((t, i) => {
                annotations.push(new TargetProjection(t.price, `TARGET_${i + 1}`, {
                    label: t.label,
                    riskReward: t.riskReward,
                    probability: i === 0 ? 0.65 : 0.40
                }));
            });
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter on a confirmed close above or below the Asian session high/low. ' +
            'The London open often provides the momentum needed to sustain the breakout ' +
            'and establish the daily trend.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price fails to sustain the breakout and ' +
            'returns inside the Asian range, indicating a potential fakeout.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.0, 4.0]
        };
    }
}

/**
 * Session Box Annotation
 */
class SessionBox extends ChartAnnotation {
    constructor(start, end, high, low, label) {
        super('SESSION_BOX', { start, end, high, low }, { label });
        this.label = label;
    }
}
