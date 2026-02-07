import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { ChartAnnotation } from '../../models/ChartAnnotation.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';

/**
 * Optimal Trade Entry (OTE) Strategy
 * Fibonacci-based entries (61.8%, 70.5%, 78.6%)
 */
export class OptimalTradeEntry extends StrategyBase {
    constructor() {
        super(
            'Optimal Trade Entry (OTE)',
            'Trading deep retracements into the 61.8% - 78.6% Fibonacci zone (ICT methodology)'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // OTE works best in strong trending markets
        let score = 0.30;

        if (marketState.regime === 'TRENDING' && marketState.trend.strength > 0.6) score = 0.90;
        else if (marketState.regime === 'TRANSITIONAL') score = 0.65;

        // Alignment with MTF global bias gives a boost
        if (marketState.mtf?.globalBias === structuralDirection) score *= 1.15;

        return Math.min(score, 1.0);
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];

        // Detect current swing (impulsive move)
        const swing = SmartMoneyConcepts.detectImpulsiveSwing(candles);

        if (swing) {
            const range = swing.high - swing.low;

            // Calculate Fib levels
            const fib618 = direction === 'LONG' ? swing.high - (range * 0.618) : swing.low + (range * 0.618);
            const fib705 = direction === 'LONG' ? swing.high - (range * 0.705) : swing.low + (range * 0.705);
            const fib786 = direction === 'LONG' ? swing.high - (range * 0.786) : swing.low + (range * 0.786);

            // Add Fib level markers
            annotations.push(new FibLevel(fib618, '61.8%'));
            annotations.push(new FibLevel(fib705, '70.5% (OTE)'));
            annotations.push(new FibLevel(fib786, '78.6%'));

            // Entry zone (between 61.8% and 78.6%)
            const entryZone = new EntryZone(
                direction === 'LONG' ? fib618 : fib786,
                direction === 'LONG' ? fib786 : fib618,
                direction,
                {
                    id: `ote-entry-${swing.low.time}`,
                    confidence: 0.85,
                    note: 'OTE Zone',
                    timeframe: marketState.timeframe,
                    startTime: swing.low.time // Start at the beginning of the impulsive swing
                }
            );
            annotations.push(entryZone);

            // STOP LOSS - using professional invalidation logic
            const stopLoss = this.getStructuralInvalidation(candles, direction, marketState);
            const entryPrice = fib705;
            const risk = Math.abs(entryPrice - stopLoss);

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: 'Thesis Invalidation' }));

            // Target 1: Swing High/Low (1:1 or dynamic)
            annotations.push(new TargetProjection(
                direction === 'LONG' ? swing.high : swing.low,
                'TARGET_1',
                { riskReward: Math.abs((direction === 'LONG' ? swing.high : swing.low) - entryPrice) / risk, probability: 0.75 }
            ));

            // Target 2: Fibonacci Extension (e.g., -27.2%)
            const target2Price = direction === 'LONG' ?
                swing.high + (range * 0.272) :
                swing.low - (range * 0.272);

            annotations.push(new TargetProjection(
                target2Price,
                'TARGET_2',
                { riskReward: Math.abs(target2Price - entryPrice) / risk, probability: 0.50 }
            ));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter within the Optimal Trade Entry zone (61.8% - 78.6% retracement). ' +
            'The 70.5% level is the preferred "sweet spot" for institutional displacement entry.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks back through the 100% retracement level, ' +
            'indicating that the impulsive move has been completely erased and lack of institutional support.';
    }

    getDetailedRationale(candles, marketState, annotations) {
        const zone = annotations.find(a => a.type === 'ENTRY_ZONE');
        const direction = zone?.direction === 'LONG' ? 'bullish' : 'bearish';

        return `The ${this.name} setup identifies a deep retracement of a ${direction} impulsive move. ` +
            `Institutions often use these deep levels to obtain better pricing before the next expansion phase. ` +
            `By entering between the 62% and 79% Fibonacci levels, we maximize R:R while aligning with the dominant order flow.`;
    }

    getInstitutionalTheme() {
        return 'Deep Discount & Trend Expansion';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.5, 4.0]
        };
    }
}

/**
 * Fibonacci Level Annotation
 */
class FibLevel extends ChartAnnotation {
    constructor(price, label) {
        super('FIB_LEVEL', { price }, { label });
        this.label = label;
    }
}
