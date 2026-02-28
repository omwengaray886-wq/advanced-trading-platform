import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { ChartAnnotation } from '../../models/ChartAnnotation.js';
import { AssetClassAdapter } from '../../services/assetClassAdapter.js';

/**
 * London Fakeout Strategy (ICT Judas Swing)
 * Trades the false move at London Open
 */
export class LondonFakeout extends StrategyBase {
    constructor() {
        super(
            'London Fakeout (Judas Swing)',
            'Trading the false breakout of Asian range at London open (SMC/ICT methodology)'
        );
    }

    evaluate(marketState) {
        if (marketState.assetClass !== 'FOREX') return 0.1;

        const now = Date.now() / 1000;
        const hour = new Date(now * 1000).getUTCHours();

        // Prime time: 08:00 - 09:30 UTC
        if (hour >= 8 && hour < 10) return 0.92;

        return 0.20;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const lastCandle = candles[candles.length - 1];

        const asianWindow = AssetClassAdapter.getSessionWindow(lastCandle.time, 'ASIAN');
        if (!asianWindow) return [];

        const asianCandles = candles.filter(c => c.time >= asianWindow.start && c.time < asianWindow.end);
        if (asianCandles.length < 5) return [];

        const asianHigh = Math.max(...asianCandles.map(c => c.high));
        const asianLow = Math.min(...asianCandles.map(c => c.low));

        // Detect fakeout
        // Logic: Price sweeps Asian High/Low but fails to close outside on higher timeframe,
        // or shows immediate rejection wicks.
        const currentPrice = lastCandle.close;
        const reachedAbove = lastCandle.high > asianHigh;
        const reachedBelow = lastCandle.low < asianLow;

        let setup = null;

        if (reachedAbove && currentPrice < asianHigh) {
            // Potential Bullish Fakeout (Sweep High, going Short)
            setup = { direction: 'SHORT', entry: asianHigh, stop: lastCandle.high * 1.0005, target: asianLow };
        } else if (reachedBelow && currentPrice > asianLow) {
            // Potential Bearish Fakeout (Sweep Low, going Long)
            setup = { direction: 'LONG', entry: asianLow, stop: lastCandle.low * 0.9995, target: asianHigh };
        }

        if (setup) {
            const atr = marketState.atr || this.calculateATR(candles);
            const buffer = atr * 0.05;

            annotations.push(new EntryZone(
                setup.direction === 'LONG' ? asianLow + buffer : asianHigh - buffer,
                setup.direction === 'LONG' ? asianLow - buffer : asianHigh + buffer,
                setup.direction,
                { confidence: 0.88, note: 'Judas', timeframe: '1H' }
            ));

            annotations.push(new TargetProjection(setup.stop, 'STOP_LOSS', { label: `SL: ${setup.stop.toFixed(5)}` }));

            // Standardized Targets using regime-aware logic
            const targets = this.generateStandardTargets(setup.entry, setup.stop, marketState.liquidityPools, setup.direction, marketState);
            targets.forEach((t, i) => {
                annotations.push(new TargetProjection(t.price, `TARGET_${i + 1}`, {
                    label: t.label,
                    riskReward: t.riskReward,
                    probability: i === 0 ? 0.70 : 0.45
                }));
            });
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter when price sweeps the Asian range high or low and immediately rejects back inside. ' +
            'This "Judas Swing" is designed to trap breakout traders and hunt stops before the real daily move begins.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price continues beyond the sweep high/low with strong momentum ' +
            'and fails to reclaim the Asian range level.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [3.0, 5.0]
        };
    }
}
