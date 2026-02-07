import { StrategyBase } from '../StrategyBase.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';
import { SupplyDemandZone } from '../../models/annotations/SupplyDemandZone.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';

/**
 * Wyckoff Accumulation Strategy
 * Detects institutional accumulation patterns (Phases A-E)
 * Entry: After Spring or Sign of Strength (SOS)
 */
export class WyckoffAccumulation extends StrategyBase {
    constructor() {
        super(
            'Wyckoff Accumulation',
            'Institutional-grade accumulation detection based on Wyckoff Phase analysis'
        );
    }

    /**
     * Evaluate market suitability for Wyckoff Accumulation
     */
    evaluate(marketState, direction = 'LONG') {
        if (direction !== 'LONG') return 0.1; // Accumulation is inherently bullish

        const trend = marketState.trend.direction;
        const volumeAnalysis = marketState.volumeAnalysis || {};

        // Wyckoff Accumulation occurs at trend bottoms or consolidation
        let score = 0.4;

        if (trend === 'BEARISH') {
            // Potential bottom reversal
            if (marketState.trend.strength < 0.3) score = 0.75; // Weakening bearish trend = high potential
        } else if (trend === 'NEUTRAL') {
            score = 0.85; // Ideal for range-bound accumulation
        } else if (trend === 'BULLISH') {
            score = 0.6; // Potential SOS or re-accumulation
        }

        // Boost if institutional volume or absorption is detected
        if (volumeAnalysis.isInstitutional) {
            if (volumeAnalysis.subType === 'ABSORPTION') score += 0.15;
            if (volumeAnalysis.subType === 'CLIMAX') score += 0.1;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Generate chart annotations for Wyckoff Accumulation
     */
    generateAnnotations(candles, marketState, direction = 'LONG') {
        if (direction !== 'LONG') return [];

        const annotations = [];

        // 1. Detect Preliminary Support / Selling Climax (Phase A)
        const climaxes = SmartMoneyConcepts.detectVolumeClimax(candles);
        const sellingClimax = climaxes
            .filter(c => c.type === 'SELLING_CLIMAX')
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (!sellingClimax) return [];

        annotations.push(new StructureMarker(
            { time: sellingClimax.timestamp, price: sellingClimax.low },
            'SC',
            {
                note: `Phase A: Selling Climax (Vol: ${sellingClimax.volume?.toFixed(0) || 'N/A'})`,
                significance: 'high'
            }
        ));

        // 2. Detect Range Formation (Phase B)
        const range = SmartMoneyConcepts.detectRangeFormation(candles);
        if (range) {
            annotations.push(new SupplyDemandZone(
                range.resistance,
                range.support,
                range.startTime,
                'DEMAND',
                {
                    id: 'wyckoff-acc-range',
                    note: `Phase B: Accumulation Range`,
                    endTime: range.endTime,
                    strength: 'strong'
                }
            ));

            // 3. Detect Spring (Phase C)
            const spring = SmartMoneyConcepts.detectSpring(candles, range);
            if (spring) {
                annotations.push(new StructureMarker(
                    { time: spring.timestamp, price: spring.lowPoint },
                    'SPRING',
                    { note: 'Phase C: Spring (Institutional Shakeout)', significance: 'high' }
                ));

                // 4. Generate Entry Setup (Phase D/E)
                const currentPrice = candles[candles.length - 1].close;
                const isAboveRange = currentPrice > range.resistance;

                if (isAboveRange || currentPrice > (range.support + (range.resistance - range.support) * 0.7)) {
                    // Entry Zone near resistance breakout or spring retest
                    const entryTop = range.resistance * 1.01;
                    const entryBottom = range.resistance * 0.99;

                    annotations.push(new EntryZone(
                        entryTop,
                        entryBottom,
                        'LONG',
                        { note: isAboveRange ? 'SOS Breakout Entry' : 'Spring Retest Entry' }
                    ));

                    // Targets & Stop Loss
                    const rangeSize = range.resistance - range.support;
                    const stopLoss = spring.lowPoint * 0.995;
                    const t1 = range.resistance + (rangeSize * 1.5);
                    const t2 = range.resistance + (rangeSize * 3.0);

                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: 'Structural Stop' }));
                    annotations.push(new TargetProjection(t1, 'TARGET_1', { label: 'TP1: Range Extension' }));
                    annotations.push(new TargetProjection(t2, 'TARGET_2', { label: 'TP2: Institutional Objective' }));
                }
            }
        }

        return annotations;
    }

    getDetailedRationale(candles, marketState, annotations) {
        const hasSpring = annotations.some(a => a.metadata?.note?.includes('SPRING'));
        const hasRange = annotations.some(a => a.type === 'SUPPLY_DEMAND_ZONE');

        if (!hasRange) return 'Searching for institutional accumulation range and climax volume.';

        let rationale = 'Institutional accumulation detected within a defined range. ';
        if (hasSpring) {
            rationale += 'A significant "Spring" event has occurred, clearing out retail liquidity before the primary markup phase. ';
        } else {
            rationale += 'The range is maturing, showing signs of absorption as supply is removed from the market. ';
        }

        rationale += 'Look for high-volume breakouts (SOS) to confirm the transition to the Markup Phase (Phase E).';
        return rationale;
    }

    getInstitutionalTheme() {
        return 'Liquidity Accumulation & Composite Man Intent';
    }

    getRiskParameters(analysis) {
        // Fallback or dynamic risk calculation
        return {
            riskReward: [3.0, 5.0],
            positionSizing: 'Conservative to Moderate'
        };
    }
}
