import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { ChartAnnotation } from '../../models/ChartAnnotation.js';

/**
 * Range Trading Strategy
 * Mean reversion within defined ranges
 */
export class RangeTrading extends StrategyBase {
    constructor() {
        super(
            'Range Trading',
            'Mean reversion trades within range high/low boundaries'
        );
    }

    evaluate(marketState) {
        // Excellent in ranging markets
        if (marketState.regime === 'RANGING') return 0.80;

        // Moderate in transitional (potential range formation)
        if (marketState.regime === 'TRANSITIONAL') return 0.55;

        // Poor in trending markets
        return 0.25;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];

        // Detect range
        const range = this.detectRange(candles);

        if (range) {
            // Add range boundary annotations
            annotations.push(new RangeBoundary(range.high, 'HIGH'));
            annotations.push(new RangeBoundary(range.low, 'LOW'));

            const currentPrice = candles[candles.length - 1].close;
            const rangeMiddle = (range.high + range.low) / 2;

            // Determine entry direction based on current position
            let direction, entryPrice, stopPrice;

            if (currentPrice > rangeMiddle + (range.height * 0.3)) {
                // Near range high - SHORT
                direction = 'SHORT';
                entryPrice = range.high * 0.995;
                stopPrice = range.high * 1.003;
            } else if (currentPrice < rangeMiddle - (range.height * 0.3)) {
                // Near range low - LONG
                direction = 'LONG';
                entryPrice = range.low * 1.005;
                stopPrice = range.low * 0.997;
            }

            if (direction) {
                const atr = marketState.atr || this.calculateATR(candles);
                const buffer = atr * 0.15;

                const entryZone = new EntryZone(
                    entryPrice + (direction === 'LONG' ? -buffer : buffer),
                    entryPrice + (direction === 'LONG' ? buffer : -buffer),
                    direction,
                    { confidence: 0.75, timeframe: '1H', note: 'Range Edge' }
                );
                annotations.push(entryZone);

                const stopLoss = direction === 'LONG' ? range.low - (atr * 0.5) : range.high + (atr * 0.5);
                annotations.push(new TargetProjection(stopLoss, 'SL', { label: `SL: ${stopLoss.toFixed(2)}` }));

                const targets = this.generateStandardTargets(entryPrice, stopLoss, marketState.liquidityPools, direction, marketState);
                targets.forEach((t, idx) => {
                    annotations.push(new TargetProjection(t.price, `TP${idx + 1}`, {
                        riskReward: t.riskReward,
                        label: t.label
                    }));
                });
            }
        }

        return annotations;
    }

    /**
     * Detect price range
     * @param {Array} candles - Candlestick data
     * @returns {Object|null} - Range definition
     */
    detectRange(candles) {
        const lookback = 30;
        const recentCandles = candles.slice(-lookback);

        const highs = recentCandles.map(c => c.high);
        const lows = recentCandles.map(c => c.low);

        const rangeHigh = Math.max(...highs);
        const rangeLow = Math.min(...lows);
        const rangeHeight = rangeHigh - rangeLow;
        const avgPrice = (rangeHigh + rangeLow) / 2;

        // Validate it's actually a range (height < 3% of price)
        if ((rangeHeight / avgPrice) > 0.03) return null;

        // Check for multiple touches of boundaries
        const highTouches = highs.filter(h => Math.abs(h - rangeHigh) / rangeHigh < 0.005).length;
        const lowTouches = lows.filter(l => Math.abs(l - rangeLow) / rangeLow < 0.005).length;

        if (highTouches < 2 || lowTouches < 2) return null;

        return {
            high: rangeHigh,
            low: rangeLow,
            height: rangeHeight,
            touches: { high: highTouches, low: lowTouches }
        };
    }

    getEntryLogic(analysis) {
        return 'Enter near range boundaries with expectation of mean reversion. ' +
            'Wait for rejection candles at range high (for shorts) or range low (for longs). ' +
            'Target the opposite range boundary.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup invalidated if price breaks and closes outside the range, ' +
            'indicating range expansion or breakout.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [1.5, 3.0]
        };
    }
}

/**
 * Range Boundary Annotation
 */
class RangeBoundary extends ChartAnnotation {
    constructor(price, type) {
        super('RANGE_BOUNDARY', { price }, { boundaryType: type });
        this.boundaryType = type;
    }
}
