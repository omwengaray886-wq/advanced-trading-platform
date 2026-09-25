import { StrategyBase } from '../StrategyBase.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';

/**
 * Order Block Flip Strategy / Breaker Blocks
 * 
 * Trades failed order blocks (Breakers and Mitigation Blocks).
 * When a strong Supply Zone is broken, it becomes Demand (and vice versa).
 */
export class OrderBlockFlip extends StrategyBase {
    constructor() {
        super(
            'Order Block Flip',
            'Trades retests of failed Order Blocks (Breakers) and Mitigation Blocks.'
        );
    }

    /**
     * Evaluate market suitability
     */
    evaluate(marketState, direction = 'LONG') {
        // Breakers are high-probability trend continuation or reversal patterns
        // They work best when the flip aligns with the current trend or a new trend structure

        const trend = marketState.trend.direction;
        const trendStrength = marketState.trend.strength;
        const isTrendAligned = (direction === 'LONG' && trend === 'BULLISH') ||
            (direction === 'SHORT' && trend === 'BEARISH');

        let score = 0.5;

        if (isTrendAligned) {
            score = 0.8; // High confidence if aligned with trend
            if (trendStrength > 0.6) score = 0.9;
        } else {
            // Counter-trend breakers are valid reversals
            score = 0.6;
            // But require confirming structure
            if (marketState.regime === 'TRANSITIONAL') score = 0.75;
        }

        return score;
    }

    /**
     * Generate Annotations and Signals
     */
    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];

        // 1. Detect Breakers (Failed OBs with a sweep)
        // If we want a LONG setup, we look for a BULLISH BREAKER (Failed Supply)
        const breakers = SmartMoneyConcepts.detectBreakers(candles, direction === 'LONG' ? 'BULLISH' : 'BEARISH');

        // 2. Detect Mitigation Blocks (Failed OBs without sweep)
        const mitigations = SmartMoneyConcepts.detectMitigations(candles, direction === 'LONG' ? 'BULLISH' : 'BEARISH');

        // Combine and sort by recency
        const allFlips = [...breakers, ...mitigations].sort((a, b) => b.timestamp - a.timestamp);

        if (allFlips.length === 0) return [];

        // Take the most recent relevant flip
        const targetFlip = allFlips[0];

        // Logic check: Is price currently near the retest level?
        const currentPrice = candles[candles.length - 1].close;
        const flipZoneMid = (targetFlip.high + targetFlip.low) / 2;

        // Filter: Price must be reasonably close to the zone (or inside it) to be actionable
        // We don't want to signal a breaker from 200 candles ago that we are far away from
        const calcATR = (c) => {
            let trSum = 0;
            for (let i = c.length - 15; i < c.length; i++) {
                const h = c[i].high; const l = c[i].low; const pc = c[i - 1].close;
                trSum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
            }
            return trSum / 14;
        };
        const atr = calcATR(candles);
        const distance = Math.abs(currentPrice - flipZoneMid);

        // If distance is > 3 ATRs, it's likely too far or already played out
        // However, if we haven't touched it yet, it might still be valid. 
        // For this strategy, let's assume valid if price is returning to it.

        // Create Annotation
        const entryZone = new EntryZone(
            targetFlip.high,
            targetFlip.low,
            direction === 'LONG' ? 'LONG' : 'SHORT',
            {
                id: `flip-${targetFlip.timestamp}`,
                confidence: targetFlip.brokenAt ? 0.85 : 0.75, // Breakers > Mitigations
                timeframe: marketState.timeframe || '1H',
                note: targetFlip.brokenAt ? 'Breaker Block (Flip)' : 'Mitigation Block (Flip)',
                startTime: targetFlip.timestamp,
                endTime: Date.now() / 1000 + (3600 * 24)
            }
        );
        annotations.push(entryZone);

        // Stop Loss: Just beyond the breaker candle
        const zoneHeight = targetFlip.high - targetFlip.low;
        const stopLoss = direction === 'LONG'
            ? targetFlip.low - (zoneHeight * 0.5)
            : targetFlip.high + (zoneHeight * 0.5);

        annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', {
            label: `Invalidation: ${stopLoss.toFixed(5)}`
        }));

        // Targets
        const targets = this.generateStandardTargets(flipZoneMid, stopLoss, marketState.liquidityPools, direction);
        targets.forEach((t, i) => {
            annotations.push(new TargetProjection(t.price, `TARGET_${i + 1}`, {
                label: t.label,
                riskReward: t.riskReward
            }));
        });

        return annotations;
    }

    getEntryLogic(analysis) {
        return `Price has reclaimed a violated ${analysis.direction === 'LONG' ? 'supply' : 'demand'} zone. ` +
            `The flip from resistance to support confirms institutional intention to defend this level.`;
    }

    getInvalidationLogic(analysis) {
        return `Acceptance back inside the failed range invalides the flip logic.`;
    }

    getRiskParameters(analysis) {
        // Will be extracted from annotations by the Selector
        return {};
    }
}
