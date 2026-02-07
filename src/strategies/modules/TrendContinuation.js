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
        const zone = this.findRetraceZone(recentCandles, direction);
        if (zone) {
            annotations.push(zone);

            // Generate entry zone within the demand/supply zone
            const entryZone = new EntryZone(
                zone.coordinates.top * 1.002,
                zone.coordinates.bottom * 0.998,
                direction === 'LONG' ? 'LONG' : 'SHORT',
                { confidence: 0.80, timeframe: '1H' }
            );
            annotations.push(entryZone);

            // Precision Stop Loss (Structural Invalidation Point)
            const stopLoss = this.getStructuralInvalidation(candles, direction, marketState);
            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', { label: 'Structural Invalidation' }));

            // Precision Targets (Institutional Pulls)
            const pools = marketState.liquidityPools || [];
            const attractivePools = pools.filter(p =>
                direction === 'LONG' ? p.price > zone.coordinates.top : p.price < zone.coordinates.bottom
            ).sort((a, b) =>
                direction === 'LONG' ? a.price - b.price : b.price - a.price
            );

            const optimalEntry = entryZone.getOptimalEntry();
            const risk = Math.abs(optimalEntry - stopLoss);

            // Target 1: First major liquidity cluster or 2.0 RR pivot
            const t1Price = attractivePools[0]?.price ||
                (direction === 'LONG' ? optimalEntry + (risk * 2.2) : optimalEntry - (risk * 2.2));

            annotations.push(new TargetProjection(t1Price, 'TARGET_1', {
                label: attractivePools[0] ? `Cluster: ${attractivePools[0].label}` : 'Structural Pivot',
                riskReward: Math.abs(t1Price - optimalEntry) / risk
            }));

            // Target 2: High-strength pool or trend extension
            const t2Price = attractivePools[1]?.price ||
                (direction === 'LONG' ? optimalEntry + (risk * 3.8) : optimalEntry - (risk * 3.8));

            annotations.push(new TargetProjection(t2Price, 'TARGET_2', {
                label: attractivePools[1] ? `High Conviction: ${attractivePools[1].label}` : 'Trend Extension',
                riskReward: Math.abs(t2Price - optimalEntry) / risk
            }));
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

    findRetraceZone(candles, direction) {
        // Find most recent swing point
        const recentSwing = direction === 'BULLISH' ?
            Math.min(...candles.slice(-20).map(c => c.low)) :
            Math.max(...candles.slice(-20).map(c => c.high));

        const zoneHeight = recentSwing * 0.002; // 0.2% zone

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
