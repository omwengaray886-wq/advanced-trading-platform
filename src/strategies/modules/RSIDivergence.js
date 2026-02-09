import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { Trendline } from '../../models/annotations/Trendline.js';
import { calculateRSI } from '../../analysis/indicators.js';

/**
 * RSI Divergence Strategy
 * Identifies momentum exhaustion and potential reversals
 */
export class RSIDivergence extends StrategyBase {
    constructor() {
        super(
            'RSI Divergence',
            'Detecting momentum exhaustion where price makes new highs/lows but RSI fails to confirm'
        );
    }

    evaluate(marketState) {
        // Works best in Exhausted TRENDING or RANGING markets
        if (marketState.regime === 'TRANSITIONAL') return 0.85;
        if (marketState.regime === 'RANGING') return 0.80;
        if (marketState.regime === 'TRENDING' && marketState.trend.strength < 0.5) return 0.75;
        return 0.30;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const rsiValues = calculateRSI(candles, 14);

        if (rsiValues.length < 20) return [];

        // Simple divergence detection logic
        // Looking at the last 20 candles
        const scope = 20;
        const recentCandles = candles.slice(-scope);
        const recentRSI = rsiValues.slice(-scope);

        // Find recent highs in price and RSI
        const priceHighIdx = recentCandles.reduce((max, c, i) => c.high > recentCandles[max].high ? i : max, 0);
        const rsiHighIdx = recentRSI.reduce((max, v, i) => v > recentRSI[max] ? i : max, 0);

        // BULLISH DIVERGENCE (Price lower low, RSI higher low)
        const priceLows = recentCandles.map((c, i) => ({ price: c.low, time: c.time, rsi: recentRSI[i], idx: i }));
        priceLows.sort((a, b) => a.price - b.price);

        const lowestPrice = priceLows[0];
        const secondLowest = priceLows.find(p => Math.abs(p.idx - lowestPrice.idx) > 5);

        if (secondLowest && lowestPrice.price < secondLowest.price && lowestPrice.rsi > secondLowest.rsi) {
            // Potential Bullish Divergence
            annotations.push(new Trendline(
                { time: secondLowest.time, price: secondLowest.price },
                { time: lowestPrice.time, price: lowestPrice.price },
                { color: '#10b981', style: 'dashed', label: 'Bullish Div' }
            ));

            annotations.push(new EntryZone(
                lowestPrice.price * 0.999,
                lowestPrice.price * 1.001,
                'LONG',
                { confidence: 0.80, note: 'RSI Bullish Divergence', timeframe: '1H' }
            ));

            // Dynamic ATR-based Stop Loss (Institutional standard)
            const atr = marketState.atr || (lowestPrice.price * 0.005);
            const stopLoss = lowestPrice.price - (atr * 1.5);
            const risk = lowestPrice.price - stopLoss;

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
            annotations.push(new TargetProjection(lowestPrice.price + (risk * 3), 'TARGET_1', { riskReward: 3.0 }));
        }

        // BEARISH DIVERGENCE (Price higher high, RSI lower high)
        const priceHighs = recentCandles.map((c, i) => ({ price: c.high, time: c.time, rsi: recentRSI[i], idx: i }));
        priceHighs.sort((a, b) => b.price - a.price);

        const highestPrice = priceHighs[0];
        const secondHighest = priceHighs.find(p => Math.abs(p.idx - highestPrice.idx) > 5);

        if (secondHighest && highestPrice.price > secondHighest.price && highestPrice.rsi < secondHighest.rsi) {
            // Potential Bearish Divergence
            annotations.push(new Trendline(
                { time: secondHighest.time, price: secondHighest.price },
                { time: highestPrice.time, price: highestPrice.price },
                { color: '#ef4444', style: 'dashed', label: 'Bearish Div' }
            ));

            annotations.push(new EntryZone(
                highestPrice.price * 1.001,
                highestPrice.price * 0.999,
                'SHORT',
                { confidence: 0.80, note: 'RSI Bearish Divergence', timeframe: '1H' }
            ));

            // Dynamic ATR-based Stop Loss (Institutional standard)
            const atr = marketState.atr || (highestPrice.price * 0.005);
            const stopLoss = highestPrice.price + (atr * 1.5);
            const risk = stopLoss - highestPrice.price;

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
            annotations.push(new TargetProjection(highestPrice.price - (risk * 3), 'TARGET_1', { riskReward: 3.0 }));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter when price makes a new extreme but RSI fails to confirm the momentum, creating a divergence. ' +
            'This often signals a reversal as trend exhaustion is confirmed by oscillators.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks the new extreme clearly, ' +
            'suggesting momentum has returned and the divergence was a false signal.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [3.0]
        };
    }
}
