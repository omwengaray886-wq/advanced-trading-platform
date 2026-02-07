import { StrategyBase } from '../StrategyBase.js';
import { StructureMarker } from '../../models/annotations/StructureMarker.js';
import { SupplyDemandZone } from '../../models/annotations/SupplyDemandZone.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';

/**
 * Wyckoff Distribution Strategy
 * Detects institutional distribution patterns (Phases A-E)
 * Entry: After UTAD or Sign of Weakness (SOW)
 */
export class WyckoffDistribution extends StrategyBase {
    constructor() {
        super(
            'Wyckoff Distribution',
            'Institutional-grade distribution detection based on Wyckoff Phase analysis'
        );
    }

    /**
     * Evaluate market suitability for Wyckoff Distribution
     */
    evaluate(marketState, direction = 'SHORT') {
        if (direction !== 'SHORT') return 0.1; // Distribution is inherently bearish

        const trend = marketState.trend.direction;
        const volumeAnalysis = marketState.volumeAnalysis || {};

        // Wyckoff Distribution occurs at trend tops or consolidation
        let score = 0.4;

        if (trend === 'BULLISH') {
            // Potential top reversal
            if (marketState.trend.strength < 0.3) score = 0.75; // Weakening bullish trend = high potential
        } else if (trend === 'NEUTRAL') {
            score = 0.85; // Ideal for range-bound distribution
        } else if (trend === 'BEARISH') {
            score = 0.6; // Potential SOW or re-distribution
        }

        // Boost if institutional volume or climax is detected
        if (volumeAnalysis.isInstitutional) {
            if (volumeAnalysis.subType === 'CLIMAX') score += 0.15;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Generate chart annotations for Wyckoff Distribution
     */
    generateAnnotations(candles, marketState, direction = 'SHORT') {
        if (direction !== 'SHORT') return [];

        const annotations = [];

        // 1. Detect Preliminary Supply / Buying Climax (Phase A)
        const climaxes = SmartMoneyConcepts.detectVolumeClimax(candles);
        const buyingClimax = climaxes
            .filter(c => c.type === 'BUYING_CLIMAX')
            .sort((a, b) => b.timestamp - a.timestamp)[0];

        if (!buyingClimax) return [];

        annotations.push(new StructureMarker(
            { time: buyingClimax.timestamp, price: buyingClimax.high },
            'BC',
            {
                note: `Phase A: Buying Climax (Vol: ${buyingClimax.volume?.toFixed(0) || 'N/A'})`,
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
                'SUPPLY',
                {
                    id: 'wyckoff-dist-range',
                    note: `Phase B: Distribution Range`,
                    endTime: range.endTime,
                    strength: 'strong'
                }
            ));

            // 3. Detect UTAD (Phase C)
            const utad = SmartMoneyConcepts.detectUTAD(candles, range);
            if (utad) {
                annotations.push(new StructureMarker(
                    { time: utad.timestamp, price: utad.highPoint },
                    'UTAD',
                    { note: 'Phase C: Upthrust After Distribution (Institutional Trap)', significance: 'high' }
                ));

                // 4. Generate Entry Setup (Phase D/E)
                const currentPrice = candles[candles.length - 1].close;
                const isBelowRange = currentPrice < range.support;

                if (isBelowRange || currentPrice < (range.support + (range.resistance - range.support) * 0.3)) {
                    // Entry Zone near support breakdown or UTAD retest
                    const entryTop = range.support * 1.01;
                    const entryBottom = range.support * 0.99;

                    annotations.push(new EntryZone(
                        entryTop,
                        entryBottom,
                        'SHORT',
                        { note: isBelowRange ? 'SOW Breakdown Entry' : 'UTAD Retest Entry' }
                    ));

                    // Targets & Stop Loss
                    const rangeSize = range.resistance - range.support;
                    const stopLoss = utad.highPoint * 1.005;
                    const t1 = range.support - (rangeSize * 1.5);
                    const t2 = range.support - (rangeSize * 3.0);

                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: 'Structural Stop' }));
                    annotations.push(new TargetProjection(t1, 'TARGET_1', { label: 'TP1: Range Extension' }));
                    annotations.push(new TargetProjection(t2, 'TARGET_2', { label: 'TP2: Institutional Objective' }));
                }
            }
        }

        return annotations;
    }

    getDetailedRationale(candles, marketState, annotations) {
        const hasUTAD = annotations.some(a => a.metadata?.note?.includes('UTAD'));
        const hasRange = annotations.some(a => a.type === 'SUPPLY_DEMAND_ZONE');

        if (!hasRange) return 'Searching for institutional distribution range and exhaustion volume.';

        let rationale = 'Institutional distribution detected within a professional range. ';
        if (hasUTAD) {
            rationale += 'A significant "Upthrust" has occurred, trapping breakout traders before the primary markdown. ';
        } else {
            rationale += 'Supply is overwhelming demand as institutional participants rotate out of positions. ';
        }

        rationale += 'Look for high-volume breakdowns (SOW) to confirm the transition to the Markdown Phase (Phase E).';
        return rationale;
    }

    getInstitutionalTheme() {
        return 'Liquidity Distribution & Institutional Exit';
    }

    getRiskParameters(analysis) {
        return {
            riskReward: [3.0, 5.0],
            positionSizing: 'Conservative'
        };
    }
}
