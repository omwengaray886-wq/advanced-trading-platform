import { StrategyBase } from '../StrategyBase.js';
import { SupplyDemandZone } from '../../models/annotations/SupplyDemandZone.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';

/**
 * Order Block Strategy
 * Trades institutional order blocks (SMC/ICT methodology)
 */
export class OrderBlock extends StrategyBase {
    constructor() {
        super(
            'Order Block',
            'Trading institutional order blocks (last opposite-colored candle before impulsive move)'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        const trend = marketState.trend.direction;
        const trendStrength = marketState.trend.strength;

        // Order blocks work best in the direction of the trend, but can signal reversals
        const isTrendAligned = (direction === 'LONG' && trend === 'BULLISH') ||
            (direction === 'SHORT' && trend === 'BEARISH');

        let score = 0.50; // Base score for finding an order block

        if (marketState.regime === 'TRENDING') {
            if (isTrendAligned) {
                if (trendStrength > 0.70) score = 0.85;
                else if (trendStrength > 0.50) score = 0.75;
            } else {
                // Counter-trend order blocks (reversal candidates)
                score = 0.45;
            }
        } else if (marketState.regime === 'TRANSITIONAL') {
            score = 0.70;
        }

        return score;
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        const obDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // Find order blocks based on the requested direction
        const allBlocks = SmartMoneyConcepts.detectOrderBlocks(candles, obDirection);

        // 1. Try Strict Filter: Only FRESH (unmitigated) and STRONG blocks
        let validBlocks = allBlocks.filter(ob => ob.fresh && ob.strength !== 'weak');

        // 2. Fallback: If no strict blocks, look for ANY fresh block (even if weak)
        if (validBlocks.length === 0) {
            validBlocks = allBlocks.filter(ob => ob.fresh);
        }

        // 3. Last Resort: Force signal generation (User Request)
        if (validBlocks.length === 0) {
            validBlocks = allBlocks;
        }

        // Take the most recent valid block
        const targetOB = validBlocks[validBlocks.length - 1];

        if (targetOB) {
            // INSTITUTIONAL PRECISION: Mean Threshold (50% of body)
            // Ideally, price shouldn't close beyond this level if it's a valid OB
            const obMid = (targetOB.high + targetOB.low) / 2;
            const bodySize = Math.abs(targetOB.high - targetOB.low);

            // INSTITUTIONAL PRECISION: Alignment with OB 'Open' and 'Mean Threshold' (50%)
            // For a Bullish OB (Demand), Entry is the HIGH of the candle.
            // For a Bearish OB (Supply), Entry is the LOW of the candle.
            const entryTop = direction === 'LONG' ? targetOB.high : obMid;
            const entryBottom = direction === 'LONG' ? obMid : targetOB.low;

            const entryZone = new EntryZone(
                entryTop,
                entryBottom,
                direction === 'LONG' ? 'LONG' : 'SHORT',
                {
                    id: `ob-entry-${targetOB.timestamp}`,
                    confidence: targetOB.strength === 'strong' ? 0.9 : 0.75,
                    timeframe: marketState.timeframe || '1H',
                    note: `Institutional Order Block [${targetOB.strength.toUpperCase()}]`,
                    startTime: targetOB.timestamp,
                    endTime: Date.now() / 1000 + (3600 * 48) // Extend visual connection
                }
            );
            annotations.push(entryZone);

            // Precision Stop Loss: Structural Invalidation or just beyond OB
            const structureSL = this.getStructuralInvalidation(candles, direction, marketState);
            const obFailureLevel = direction === 'LONG' ? targetOB.low - (bodySize * 0.2) : targetOB.high + (bodySize * 0.2);

            // Use the wider of the two for safety
            const stopLoss = direction === 'LONG' ? Math.min(structureSL, obFailureLevel) : Math.max(structureSL, obFailureLevel);

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', {
                label: `Invalidation: ${stopLoss.toFixed(5)}`
            }));

            // Standardized Targets using liquidity awareness
            const targets = this.generateStandardTargets(entryZone.getOptimalEntry(), stopLoss, marketState.liquidityPools, direction);
            targets.forEach((t, i) => {
                annotations.push(new TargetProjection(t.price, `TARGET_${i + 1}`, {
                    label: t.label,
                    riskReward: t.riskReward
                }));
            });
        }

        return annotations;
    }

    getDetailedRationale(candles, marketState, annotations) {
        const obZone = annotations.find(a => a.type === 'SUPPLY_DEMAND_ZONE');
        const direction = obZone?.zoneType === 'DEMAND' ? 'bullish' : 'bearish';

        return `This ${direction} Order Block represents the final price consolidation before a significant impulsive move. ` +
            `The rapid displacement away from this level suggests that institutional participants have unfilled orders remaining within the ${obZone?.coordinates?.bottom?.toFixed(5)} - ${obZone?.coordinates?.top?.toFixed(5)} range. ` +
            `A high-probability entry exists on the first return to this 'mitigation' area.`;
    }

    getInstitutionalTheme() {
        return 'Institutional Displacement & Order Flow';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.5, 4.0]
        };
    }
}
