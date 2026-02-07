import { StrategyBase } from '../StrategyBase.js';
import { SupplyDemandZone } from '../../models/annotations/SupplyDemandZone.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';

/**
 * Breaker Block Strategy
 * Trades "failed" order blocks that have been broken (broken supply becomes demand)
 */
export class BreakerBlock extends StrategyBase {
    constructor() {
        super(
            'Breaker Block',
            'Trading failed order blocks that have been broken by price (SMC methodology)'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // Breakers are excellent for reversal/transitional markets
        let score = 0.40;

        if (marketState.regime === 'TRANSITIONAL') score = 0.85;
        else if (marketState.regime === 'TRENDING') score = 0.70;

        // Alignment with MTF global bias gives a boost
        if (marketState.mtf?.globalBias === structuralDirection) score *= 1.2;

        return Math.min(score, 1.0);
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // Find failed order blocks (Breakers) in the requested direction
        const breakers = SmartMoneyConcepts.detectBreakers(candles, structuralDirection);

        breakers.forEach(breaker => {
            const zone = new SupplyDemandZone(
                breaker.high,
                breaker.low,
                breaker.timestamp,
                breaker.type === 'BULLISH' ? 'DEMAND' : 'SUPPLY',
                { strength: 'strong', fresh: true, note: 'Breaker Block', timeframe: marketState.timeframe }
            );
            annotations.push(zone);
        });

        // Find most recent valid breaker
        const targetBreaker = breakers[breakers.length - 1];

        if (targetBreaker) {
            const currentPrice = candles[candles.length - 1].close;

            // Entry zone in the breaker block
            const entryZone = new EntryZone(
                targetBreaker.high,
                targetBreaker.low,
                direction,
                { confidence: 0.82, note: 'Breaker Institutional Entry', timeframe: marketState.timeframe }
            );
            annotations.push(entryZone);

            // STOP LOSS - using professional invalidation logic
            const stopLoss = this.getStructuralInvalidation(candles, direction, marketState);
            const risk = Math.abs(entryZone.getOptimalEntry() - stopLoss);

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: 'Thesis Invalidation' }));

            // Targets
            annotations.push(new TargetProjection(
                direction === 'LONG' ? currentPrice + (risk * 2.5) : currentPrice - (risk * 2.5),
                'TARGET_1',
                { riskReward: 2.5, probability: 0.65 }
            ));

            annotations.push(new TargetProjection(
                direction === 'LONG' ? currentPrice + (risk * 4.5) : currentPrice - (risk * 4.5),
                'TARGET_2',
                { riskReward: 4.5, probability: 0.45 }
            ));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter when price retraces into the Breaker Block zone (former supply/demand). ' +
            'Breakers occur when an institutional level is failed and then retested from the other side.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price breaks back through the breaker origin or closes deep into the block, ' +
            'indicating that the structural failure lacked true institutional follow-through.';
    }

    getDetailedRationale(candles, marketState, annotations) {
        const breaker = annotations.find(a => a.type === 'SUPPLY_DEMAND_ZONE');
        const direction = breaker?.zoneType === 'DEMAND' ? 'bullish' : 'bearish';

        return `The ${this.name} identifies a high-probability ${direction} flip. ` +
            `Originally a level of institutional supply/demand, the aggressive break shows a shift in dominance. ` +
            `The return to this block represents a 'confirmation' retest where previous losing participants exit and new flow enters.`;
    }

    getInstitutionalTheme() {
        return 'Structural Failure & S/D Flip';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.5, 4.5]
        };
    }
}
