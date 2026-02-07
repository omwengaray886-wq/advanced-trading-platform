import { StrategyBase } from '../StrategyBase.js';
import { SupplyDemandZone } from '../../models/annotations/SupplyDemandZone.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';

/**
 * Mitigation Block Strategy
 * Trading failed order blocks that didn't sweep liquidity before failing
 */
export class MitigationBlock extends StrategyBase {
    constructor() {
        super(
            'Mitigation Block',
            'Trading failed order blocks that did not sweep liquidity before being broken (SMC methodology)'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // Mitigation blocks are common in strong trends where OBs fail to hold
        let score = 0.35;

        if (marketState.regime === 'TRENDING') score = 0.82;
        else if (marketState.regime === 'TRANSITIONAL') score = 0.70;

        // Alignment with MTF global bias gives a boost
        if (marketState.mtf?.globalBias === structuralDirection) score *= 1.15;

        return Math.min(score, 1.0);
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        const mitigations = SmartMoneyConcepts.detectMitigations(candles, structuralDirection);

        mitigations.forEach(block => {
            const zone = new SupplyDemandZone(
                block.high,
                block.low,
                block.timestamp,
                block.type === 'BULLISH' ? 'DEMAND' : 'SUPPLY',
                { strength: 'moderate', fresh: true, note: 'Mitigation Block', timeframe: marketState.timeframe }
            );
            annotations.push(zone);
        });

        const targetBlock = mitigations[mitigations.length - 1];

        if (targetBlock) {
            const currentPrice = candles[candles.length - 1].close;

            const entryZone = new EntryZone(
                targetBlock.high,
                targetBlock.low,
                direction,
                { confidence: 0.78, note: 'Mitigation Entry', timeframe: marketState.timeframe }
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
                { riskReward: 2.5, probability: 0.70 }
            ));

            annotations.push(new TargetProjection(
                direction === 'LONG' ? currentPrice + (risk * 4.0) : currentPrice - (risk * 4.0),
                'TARGET_2',
                { riskReward: 4.0, probability: 0.50 }
            ));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter on retest of a broken order block that failed to reach its target. ' +
            'Mitigation blocks indicate a shift in market favor where trapped orders are being neutralized.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price moves aggressively back through the mitigation zone, ' +
            'indicating the structural transition failed to hold institutional interest.';
    }

    getDetailedRationale(candles, marketState, annotations) {
        const block = annotations.find(a => a.type === 'SUPPLY_DEMAND_ZONE');
        const direction = block?.zoneType === 'DEMAND' ? 'bullish' : 'bearish';

        return `The ${this.name} setup identifies a ${direction} relief on an overextended move. ` +
            `Unlike a breaker, a mitigation block occurs when price fails to sweep significant liquidity before breaking the trend. ` +
            `This retest represents a 'safe exit' for institutional participants who were caught on the wrong side.`;
    }

    getInstitutionalTheme() {
        return 'Trapped Liquidity & Order Neutralization';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.5, 4.0]
        };
    }
}
