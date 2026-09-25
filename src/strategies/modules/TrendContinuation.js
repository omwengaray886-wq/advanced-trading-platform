import { StrategyBase } from '../StrategyBase.js';
import { Trendline } from '../../models/annotations/Trendline.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SupplyDemandZone } from '../../models/annotations/SupplyDemandZone.js';

/**
 * Trend Continuation Strategy
 * Trades pullbacks in established trends
 */
export class TrendContinuation extends StrategyBase {
    constructor() {
        super(
            'Trend Continuation',
            'Trading pullbacks to demand/supply zones in trending markets'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        const trend = marketState.trend.direction;
        const trendStrength = marketState.trend.strength;

        // Trend Continuation is inherently trend-following
        const isTrendAligned = (direction === 'LONG' && trend === 'BULLISH') ||
            (direction === 'SHORT' && trend === 'BEARISH');

        if (!isTrendAligned) {
            // Very low suitability for trend continuation if against the trend
            return 0.15;
        }

        if (marketState.regime !== 'TRENDING') {
            if (marketState.regime === 'TRANSITIONAL') return 0.50;
            return 0.20;
        }

        const volatility = marketState.volatility === 'MODERATE' ? 1.1 : 0.9;
        if (trendStrength > 0.70) return 0.85;

        return trendStrength * volatility * 0.95;
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        const recentCandles = candles.slice(-50);

        // Find swing points for trendline
        const swingPoints = this.findTrendlinePoints(recentCandles, direction);
        if (swingPoints.length >= 2) {
            const trendline = new Trendline(
                swingPoints[0],
                swingPoints[swingPoints.length - 1],
                { strength: 'strong', touches: swingPoints.length, timeframe: '1H' }
            );
            annotations.push(trendline);
        }

        // Find demand/supply zone
        const zone = this.findRetraceZone(recentCandles, marketState);
        if (zone) {
            annotations.push(zone);
            const atr = marketState.atr || this.calculateATR(candles);
            const buffer = atr * 0.1;

            // Generate entry zone within the demand/supply zone with ATR buffer
            const entryZone = new EntryZone(
                zone.coordinates.top + (direction === 'LONG' ? buffer : -buffer),
                zone.coordinates.bottom - (direction === 'LONG' ? -buffer : buffer),
                direction === 'LONG' ? 'LONG' : 'SHORT',
                { confidence: 0.80, note: 'Trend Cont', timeframe: '1H' }
            );
            annotations.push(entryZone);

            // Precision Stop Loss (Structural Invalidation Point)
            const stopLoss = this.getStructuralInvalidation(candles, direction, marketState);

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: `SL: ${stopLoss.toFixed(5)}` }));

            // Standardized Targets using regime-aware logic
            const targets = this.generateStandardTargets(entryZone.getOptimalEntry(), stopLoss, marketState.liquidityPools, direction, marketState);
            targets.forEach((t, i) => {
                annotations.push(new TargetProjection(t.price, `TARGET_${i + 1}`, {
                    label: t.label,
                    riskReward: t.riskReward,
                    probability: i === 0 ? 0.70 : 0.45
                }));
            });
        }

        return annotations;
    }

    findTrendlinePoints(candles, direction) {
        const points = [];

        for (let i = 5; i < candles.length - 5; i++) {
            const isSwingLow = direction === 'BULLISH' &&
                candles.slice(i - 5, i + 5).every(c => c.low >= candles[i].low);
            const isSwingHigh = direction === 'BEARISH' &&
                candles.slice(i - 5, i + 5).every(c => c.high <= candles[i].high);

            if (isSwingLow || isSwingHigh) {
                points.push({
                    time: candles[i].time,
                    price: isSwingLow ? candles[i].low : candles[i].high
                });
            }
        }

        return points.slice(-4); // Last 4 swing points
    }

    findRetraceZone(candles, marketState) {
        const direction = marketState.trend.direction;
        // Find most recent swing point
        const recentSwing = direction === 'BULLISH' ?
            Math.min(...candles.slice(-20).map(c => c.low)) :
            Math.max(...candles.slice(-20).map(c => c.high));

        const atr = marketState.atr || this.calculateATR(candles);
        const zoneHeight = atr * 0.8; // Use 0.8 ATR for the zone depth

        return new SupplyDemandZone(
            recentSwing + (direction === 'BULLISH' ? zoneHeight : 0),
            recentSwing - (direction === 'BULLISH' ? 0 : zoneHeight),
            candles[candles.length - 1].time,
            direction === 'BULLISH' ? 'DEMAND' : 'SUPPLY',
            { strength: 'strong', fresh: true, timeframe: '1H' }
        );
    }

    getDetailedRationale(candles, marketState, annotations) {
        const direction = marketState.trend.direction;
        const trendline = annotations.find(a => a.type === 'TRENDLINE');
        const zone = annotations.find(a => a.type === 'SUPPLY_DEMAND_ZONE');

        return `The current ${direction.toLowerCase()} trend shows strong structural integrity. ` +
            `We've identified a confluent entry zone where a primary trendline with ${trendline?.metadata?.touches || 0} touches ` +
            `intersects with a ${zone?.metadata?.strength || 'valid'} ${zone?.zoneType.toLowerCase()} area. ` +
            `This alignment suggests institutional accumulation is likely to resume after this healthy corrective phase.`;
    }

    getInstitutionalTheme() {
        return 'Trend Integrity & Corrective Flow';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.0, 3.5]
        };
    }
}
