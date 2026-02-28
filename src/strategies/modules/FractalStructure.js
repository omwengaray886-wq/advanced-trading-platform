import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';

/**
 * Fractal Structure Strategy (MTF Alignment)
 * Trades internal structure moves that align with major trend bias
 */
export class FractalStructure extends StrategyBase {
    constructor() {
        super(
            'Fractal Structure Alignment',
            'Trading internal structural pullbacks that align with the major higher-timeframe trend bias'
        );
    }

    evaluate(marketState) {
        // Works best in strong TRENDING markets where we look for "nested" entries
        if (marketState.regime === 'TRENDING' && marketState.trend.strength > 0.6) return 0.95;
        if (marketState.regime === 'TRANSITIONAL') return 0.50;
        return 0.20;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const structures = marketState.structures || [];
        const direction = marketState.trend.direction;

        // identify "Major" vs "Internal" structure
        // Major structure = HH/LL with high significance
        // Internal structure = recent swing points between major ones
        const majorStructures = structures.filter(s => s.significance === 'high');
        const internalStructures = structures.filter(s => s.significance !== 'high');

        if (majorStructures.length > 0 && internalStructures.length > 0) {
            const latestMajor = majorStructures[majorStructures.length - 1];
            const latestInternal = internalStructures[internalStructures.length - 1];

            // If major trend is Bullish, look for internal HL/HH alignment
            const alignment = (direction === 'BULLISH' && ['HL', 'HH'].includes(latestInternal.markerType)) ||
                (direction === 'BEARISH' && ['LH', 'LL'].includes(latestInternal.markerType));

            if (alignment) {
                const entryType = direction === 'BULLISH' ? 'LONG' : 'SHORT';
                const atr = marketState.atr || this.calculateATR(candles);
                const buffer = atr * 0.1;

                const entryZone = new EntryZone(
                    latestInternal.price + (entryType === 'LONG' ? buffer : -buffer),
                    latestInternal.price - (entryType === 'LONG' ? buffer : -buffer),
                    entryType,
                    { confidence: 0.90, note: 'Fractal Entry', timeframe: '1H' }
                );
                annotations.push(entryZone);

                const stopLoss = this.getStructuralInvalidation(candles, entryType, marketState);

                annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: `SL: ${stopLoss.toFixed(5)}` }));

                // Standardized Targets using regime-aware logic
                const targets = this.generateStandardTargets(entryZone.getOptimalEntry(), stopLoss, marketState.liquidityPools, entryType, marketState);
                targets.forEach((t, i) => {
                    annotations.push(new TargetProjection(t.price, `TARGET_${i + 1}`, {
                        label: t.label,
                        riskReward: t.riskReward,
                        probability: i === 0 ? 0.75 : 0.50
                    }));
                });
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter when internal (lower-timeframe) structure aligns with the major (higher-timeframe) trend. ' +
            'This strategy focuses on trading the "market within a market" to find high-probability pullbacks.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if the internal structure breaks against the major bias (Internal CHOCH), ' +
            'suggesting a deeper pullback or trend reversal is underway.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [3.0, 5.0]
        };
    }
}
