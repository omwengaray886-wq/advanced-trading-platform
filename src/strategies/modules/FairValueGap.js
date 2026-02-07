import { StrategyBase } from '../StrategyBase.js';
import { ChartAnnotation } from '../../models/ChartAnnotation.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { ImbalanceDetector } from '../../analysis/imbalanceDetector.js';

/**
 * Fair Value Gap (FVG) Strategy
 * ICT concept - gap in price showing imbalance
 */
export class FairValueGap extends StrategyBase {
    constructor() {
        super(
            'Fair Value Gap (FVG)',
            'Trading imbalances (gaps) that price tends to fill - ICT methodology'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // FVG works very well in trending markets (ICT methodology)
        let score = 0.55;

        if (marketState.regime === 'TRENDING') score = 0.82;
        else if (marketState.regime === 'TRANSITIONAL') score = 0.75;
        else if (marketState.regime === 'RANGING') score = 0.60;

        // Alignment with MTF global bias gives a boost
        if (marketState.mtf?.globalBias === structuralDirection) score *= 1.15;

        // Alignment with relative strength leadership
        if (marketState.relativeStrength?.status === (direction === 'LONG' ? 'LEADER' : 'LAGGARD')) score *= 1.1;

        return Math.min(score, 1.0);
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        const structuralDirection = direction === 'LONG' ? 'BULLISH' : 'BEARISH';

        // Detect FVGs
        const fvgs = ImbalanceDetector.detectFVGs(candles);

        // Add FVG annotations
        fvgs.forEach(fvg => {
            annotations.push(new FVGAnnotation(
                fvg.top,
                fvg.bottom,
                fvg.timestamp || candles[fvg.index]?.time, // Ensure timestamp exists
                fvg.type === 'BULLISH_FVG' ? 'BULLISH' : 'BEARISH'
            ));
        });

        // Find valid FVG for entry aligned with our desired direction
        const validFVG = fvgs.find(fvg => {
            const fvgDir = fvg.type === 'BULLISH_FVG' ? 'BULLISH' : 'BEARISH';
            return fvgDir === structuralDirection && !fvg.mitigated;
        });

        if (validFVG) {
            const currentPrice = candles[candles.length - 1].close;

            // Entry zone in FVG (usually 50% equilibrium or open of the gap)
            const entryZone = new EntryZone(
                validFVG.top,
                validFVG.bottom,
                direction,
                { confidence: 0.75, note: 'FVG Imbalance Entry', timeframe: marketState.timeframe }
            );
            annotations.push(entryZone);

            // STOP LOSS - using structural invalidation logic
            const stopLoss = this.getStructuralInvalidation(candles, direction, marketState);
            const risk = Math.abs(entryZone.getOptimalEntry() - stopLoss);

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: 'Thesis Invalidation' }));

            // Targets seeking liquidity pools or fixed R:R
            annotations.push(new TargetProjection(
                direction === 'LONG' ? currentPrice + (risk * 2.0) : currentPrice - (risk * 2.0),
                'TARGET_1',
                { riskReward: 2.0, probability: 0.65 }
            ));

            annotations.push(new TargetProjection(
                direction === 'LONG' ? currentPrice + (risk * 3.5) : currentPrice - (risk * 3.5),
                'TARGET_2',
                { riskReward: 3.5, probability: 0.40 }
            ));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter on a retrace into the Fair Value Gap (imbalance zone). The optimal entry is often the 50% equilibrium of the gap.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price completely fills the gap and closes beyond its origin without reaction, suggesting a trend SHIFT rather than a rebalance.';
    }

    getDetailedRationale(candles, marketState, annotations) {
        const fvg = annotations.find(a => a.type === 'FVG');
        const direction = fvg?.direction === 'BULLISH' ? 'long' : 'short';

        return `A ${direction} Fair Value Gap (FVG) has been detected between ${fvg?.coordinates?.bottom?.toFixed(5)} and ${fvg?.coordinates?.top?.toFixed(5)}. ` +
            `This imbalance represents a range where the market moved too quickly for opposing orders to be met. ` +
            `Standard institutional behavior involves price returning to rebalance this area (filling the 'magnet' gap) before continuing the primary expansion.`;
    }

    getInstitutionalTheme() {
        return 'Price Imbalance & Re-delivery';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.0, 3.5]
        };
    }
}

/**
 * Custom FVG Annotation
 */
class FVGAnnotation extends ChartAnnotation {
    constructor(top, bottom, timestamp, direction) {
        super('FVG', {
            top,
            bottom,
            time: timestamp
        }, { direction });

        this.direction = direction;
    }
}
