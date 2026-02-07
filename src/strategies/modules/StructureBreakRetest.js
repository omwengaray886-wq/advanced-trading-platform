import { StrategyBase } from '../StrategyBase.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';

/**
 * Structure Break & Retest Strategy
 * Trades BOS (Break of Structure) retests
 */
export class StructureBreakRetest extends StrategyBase {
    constructor() {
        super(
            'Structure Break & Retest',
            'Trading retests after confirmed breaks of structure'
        );
    }

    evaluate(marketState) {
        // Excellent for transitional markets (structure changes)
        if (marketState.regime === 'TRANSITIONAL') return 0.80;

        // Good for trending markets with strong momentum
        if (marketState.regime === 'TRENDING') {
            if (marketState.trend.strength > 0.70) return 0.72;
            if (marketState.trend.strength > 0.50) return 0.60;
        }

        return 0.30;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const currentPrice = candles[candles.length - 1].close;
        const trend = marketState.trend;
        const direction = trend.direction === 'BULLISH' ? 'LONG' : 'SHORT';

        // Add BOS marker (Break of Structure)
        const bosCandidate = marketState.structures?.find(s => s.markerType === 'BOS');
        const fallbackIndex = Math.max(0, candles.length - 15);
        const bos = bosCandidate || {
            time: candles[fallbackIndex].time,
            price: candles[fallbackIndex].high
        };

        annotations.push(new StructureMarker(
            { time: bos.time, price: bos.price },
            'BOS',
            { significance: 'high', timeframe: marketState.timeframe || '1H' }
        ));

        // Find broken structure level
        const sliceStart = Math.max(0, candles.length - 40);
        const sliceEnd = Math.max(0, candles.length - 5);
        const rangeCandles = candles.slice(sliceStart, sliceEnd);

        const brokenLevel = direction === 'LONG' ?
            (rangeCandles.length > 0 ? Math.max(...rangeCandles.map(c => c.high)) : currentPrice) :
            (rangeCandles.length > 0 ? Math.min(...rangeCandles.map(c => c.low)) : currentPrice);

        // Entry zone at retest
        const buffer = this.getVolatilityBuffer(candles, marketState.assetClass || 'FOREX', 0.5);

        const entryTop = direction === 'LONG' ? brokenLevel + buffer : brokenLevel + (buffer * 2);
        const entryBottom = direction === 'LONG' ? brokenLevel - (buffer * 2) : brokenLevel - buffer;

        const entryZone = new EntryZone(
            entryTop,
            entryBottom,
            direction,
            {
                id: `entry-${marketState.timeframe || '1H'}-${direction}`,
                confidence: 0.82,
                timeframe: marketState.timeframe || '1H',
                note: 'Structural Retest Zone',
                startTime: bos.time,
                endTime: candles[candles.length - 1].time + (3600 * 48)
            }
        );
        annotations.push(entryZone);

        // STOP LOSS
        const stopLoss = this.getStructuralInvalidation(candles, direction, marketState);
        annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', {
            id: `sl-${marketState.timeframe || '1H'}-${direction}`,
            label: `Invalidation: ${stopLoss.toFixed(5)}`
        }));

        // Standardized Targets using liquidity awareness
        const targets = this.generateStandardTargets(entryZone.getOptimalEntry(), stopLoss, marketState.liquidityPools, direction);
        targets.forEach((t, i) => {
            annotations.push(new TargetProjection(t.price, `TARGET_${i + 1}`, {
                id: `tp${i + 1}-${marketState.timeframe || '1H'}-${direction}`,
                label: t.label,
                riskReward: t.riskReward,
                probability: i === 0 ? 0.65 : 0.40
            }));
        });

        return annotations;
    }

    getEntryLogic(analysis) {
        return `Enter on the first retest of the broken structural level. Look for 'rejection wicks' and institutional confluence inside the ATR-buffered zone.`;
    }

    getInvalidationLogic(analysis) {
        return `Setup is invalidated if price closes beyond the identified structural pivot, suggesting the Break of Structure was a false move or 'inducement'.`;
    }

    getDetailedRationale(candles, marketState, annotations) {
        const direction = marketState.trend.direction === 'BULLISH' ? 'bullish' : 'bearish';
        return `Confirmed ${direction} Break of Structure (BOS) detected. Institutional flow has shifted, and we are targeting a retest of the 'point of breach'.`;
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.5, 4.5]
        };
    }
}
