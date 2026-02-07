import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';
import { detectCandlePatterns } from '../../analysis/indicators.js';

/**
 * Price Action Confirmation Strategy
 * Trades candlestick patterns (Pin Bars, Engulfing) at key levels
 */
export class PriceActionConfirmation extends StrategyBase {
    constructor() {
        super(
            'Price Action Confirmation',
            'Trading high-probability candlestick patterns (Pin Bar, Engulfing, Doji, Harami) at key structural levels.'
        );
    }

    evaluate(marketState) {
        // Price action works in all regimes, but best as confirmation in TRANSITIONAL or exhausted TRENDING
        if (marketState.regime === 'TRANSITIONAL') return 0.92;
        if (marketState.regime === 'RANGING') return 0.85;
        return 0.60;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const patterns = detectCandlePatterns(candles);
        const structures = marketState.structures || [];

        if (patterns.length === 0) return [];

        // Check the most recent 5 patterns
        const recentPatterns = patterns.slice(-5);

        recentPatterns.forEach(pattern => {
            // 1. Level Validation (Existing Structure + Bible Rule: Confluence)
            const nearStructure = structures.find(s =>
                Math.abs(s.price - pattern.price) / s.price < 0.003
            );

            // 2. Bible Rule: Dynamic SR (EMA 21)
            const ema21 = this.calculateEMA(candles, 21);
            const nearEMA21 = Math.abs(pattern.price - ema21) / ema21 < 0.002;

            // 3. Bible Rule: Fibonacci Confluence (50% / 61.8%)
            const fibConfluence = this.checkFibConfluence(candles, pattern.price);

            // Level check: Must be at a formal structure, EMA 21, OR Fib level
            if (!nearStructure && !nearEMA21 && !fibConfluence) return;

            // 4. Trend Logic (Bible Rule: Only trade WITH the trend for novices/high prob)
            const ema50 = this.calculateEMA(candles, 50);
            const trend = marketState.trend?.direction || (pattern.price > ema50 ? 'BULLISH' : 'BEARISH');

            if (pattern.direction !== 'NEUTRAL' && pattern.direction !== trend) {
                // Counter-trend trade: Bible says stay away or require "exceptional" confluence
                if (!nearStructure || nearStructure.significance !== 'exceptional') return;
            }

            // Passed all filters -> Add Annotation
            annotations.push(new StructureMarker(
                { time: pattern.time, price: pattern.price },
                pattern.type,
                { significance: 'high', direction: pattern.direction, confirmed: true }
            ));

            const direction = pattern.direction === 'NEUTRAL'
                ? (trend === 'BULLISH' ? 'LONG' : 'SHORT')
                : (pattern.direction === 'BULLISH' ? 'LONG' : 'SHORT');

            // Entry Zone
            annotations.push(new EntryZone(
                pattern.price * (direction === 'LONG' ? 1.0005 : 0.9995),
                pattern.price * (direction === 'LONG' ? 0.9995 : 1.0005),
                direction,
                { confidence: 0.95, timeframe: '1H' }
            ));

            // Standard Risk/Reward (Bible: Minimum 1:2)
            const stopLoss = direction === 'LONG' ?
                pattern.price * 0.995 :
                pattern.price * 1.005;

            const risk = Math.abs(pattern.price - stopLoss);
            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));

            annotations.push(new TargetProjection(
                direction === 'LONG' ? pattern.price + (risk * 2.0) : pattern.price - (risk * 2.0),
                'TARGET_1',
                { riskReward: 2.0 }
            ));

            annotations.push(new TargetProjection(
                direction === 'LONG' ? pattern.price + (risk * 3.5) : pattern.price - (risk * 3.5),
                'TARGET_2',
                { riskReward: 3.5 }
            ));
        });

        return annotations;
    }

    calculateEMA(candles, period) {
        if (!candles || candles.length < period) return null;
        const k = 2 / (period + 1);
        let ema = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
        for (let i = period; i < candles.length; i++) {
            ema = (candles[i].close * k) + (ema * (1 - k));
        }
        return ema;
    }

    checkFibConfluence(candles, price) {
        if (candles.length < 50) return null;
        const recent = candles.slice(-50);
        const high = Math.max(...recent.map(c => c.high));
        const low = Math.min(...recent.map(c => c.low));
        const range = high - low;

        const fib50 = high - (range * 0.5);
        const fib61 = high - (range * 0.618);

        if (Math.abs(price - fib50) / fib50 < 0.003) return 50;
        if (Math.abs(price - fib61) / fib61 < 0.003) return 61.8;

        return null;
    }

    getEntryLogic(analysis) {
        return 'Enter when a confirmed candlestick reversal pattern forms at a high-confluence structural level (Support/Resistance, EMA 21, or Fib 50/61). This ensures that the price action is validated by institutional levels.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks the pattern low/high or if the market structure shifts significantly.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: 'Signal candle low/high',
            targets: 'Standard Risk/Reward targets at 2.0x and 3.5x',
            riskReward: [2.0, 3.5]
        };
    }
}
