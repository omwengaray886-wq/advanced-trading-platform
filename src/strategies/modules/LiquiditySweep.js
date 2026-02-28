import { StrategyBase } from '../StrategyBase.js';
import { LiquidityZone } from '../../models/annotations/LiquidityZone.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';

/**
 * Liquidity Sweep Strategy
 * Trades liquidity grabs at equal highs/lows
 */
export class LiquiditySweep extends StrategyBase {
    constructor() {
        super(
            'Liquidity Sweep',
            'Trading liquidity grabs and stop hunts at equal highs/lows'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        // Liquidity sweeps can be counter-trend (reversals) or trend-following
        // They are often MORE powerful as counter-trend signals in ranging/transitional markets
        let score = 0.50;

        if (marketState.regime === 'RANGING') score = 0.70;
        else if (marketState.regime === 'TRANSITIONAL') score = 0.65;
        else if (marketState.regime === 'TRENDING') score = 0.50;

        return score;
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        const atr = marketState.atr || this.calculateATR(candles);
        const tolerance = atr * 0.2; // Use 0.2 ATR as "equal" tolerance

        // Use shared SMC detection for Equal Highs/Lows
        const equalHighs = this.detectEqualLevels(candles, 'highs', tolerance);
        const equalLows = this.detectEqualLevels(candles, 'lows', tolerance);

        // Add liquidity zones
        equalHighs.forEach(level => {
            const zone = new LiquidityZone(
                level.price,
                'EQUAL_HIGHS',
                {
                    liquidity: 'high',
                    timeframe: '1H',
                    width: atr * 0.1,
                    note: `EQH`
                }
            );
            annotations.push(zone);
        });

        equalLows.forEach(level => {
            const zone = new LiquidityZone(
                level.price,
                'EQUAL_LOWS',
                {
                    liquidity: 'high',
                    timeframe: '1H',
                    width: atr * 0.1,
                    note: `EQL`
                }
            );
            annotations.push(zone);
        });

        // Find most recent untouched liquidity in the requested direction
        const targetLiquidity = this.findTargetLiquidity(annotations, candles, direction);

        if (targetLiquidity) {
            const currentPrice = candles[candles.length - 1].close;
            const regime = marketState.regime || 'TRENDING';

            // ATR-based proximity for entry
            const proximity = atr * 0.1;
            const entryTop = direction === 'LONG' ? targetLiquidity.coordinates.price - proximity : targetLiquidity.coordinates.price + (proximity * 2);
            const entryBottom = direction === 'LONG' ? targetLiquidity.coordinates.price - (proximity * 2) : targetLiquidity.coordinates.price + proximity;

            const entryZone = new EntryZone(
                entryTop,
                entryBottom,
                direction,
                {
                    confidence: 0.70,
                    timeframe: '1H',
                    note: 'Sweep Entry'
                }
            );
            annotations.push(entryZone);

            // Stop Loss relative to Optimal Entry, using ATR
            const optimalEntry = entryZone.getOptimalEntry();
            const slMultiplier = regime === 'TRENDING' ? 1.0 : regime === 'RANGING' ? 0.3 : 0.5;
            const slBuffer = atr * slMultiplier;

            const stopLoss = direction === 'LONG' ?
                targetLiquidity.coordinates.price - slBuffer :
                targetLiquidity.coordinates.price + slBuffer;

            annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', {
                timeframe: '1H',
                label: `SL: ${stopLoss.toFixed(2)}`
            }));

            // Standardized Targets using regime-aware logic
            const targets = this.generateStandardTargets(optimalEntry, stopLoss, marketState.liquidityPools, direction, marketState);
            targets.forEach((t, i) => {
                annotations.push(new TargetProjection(t.price, `TARGET_${i + 1}`, {
                    label: t.label,
                    riskReward: t.riskReward,
                    probability: i === 0 ? 0.65 : 0.40
                }));
            });
        }

        return annotations;
    }

    /**
     * Detect equal highs or lows
     * @param {Array} candles - Candlestick data
     * @param {string} type - 'highs' or 'lows'
     * @param {number} tolerance - Price tolerance for "equal"
     * @returns {Array} - Equal levels
     */
    detectEqualLevels(candles, type, tolerance) {
        const levels = [];
        const prices = type === 'highs' ?
            candles.map(c => c.high) :
            candles.map(c => c.low);

        for (let i = 5; i < prices.length - 5; i++) {
            const currentPrice = prices[i];

            // Check for swing high/low
            const isSwing = type === 'highs' ?
                candles.slice(i - 5, i + 5).every(c => c.high <= currentPrice) :
                candles.slice(i - 5, i + 5).every(c => c.low >= currentPrice);

            if (isSwing) {
                // Check if equal to previous swing
                const lastLevel = levels[levels.length - 1];
                if (lastLevel) {
                    const diff = Math.abs(currentPrice - lastLevel.price);
                    if (diff < tolerance) {
                        lastLevel.count++;
                        continue;
                    }
                }

                levels.push({
                    price: currentPrice,
                    index: i,
                    count: 1
                });
            }
        }

        // Filter for at least 2 touches
        return levels.filter(l => l.count >= 2);
    }

    /**
     * Find target liquidity zone for trade
     * @param {Array} annotations - Liquidity zones
     * @param {Array} candles - Candlestick data
     * @returns {Object|null} - Target liquidity zone
     */
    findTargetLiquidity(annotations, candles, requestedDirection) {
        const currentPrice = candles[candles.length - 1].close;
        const liquidityZones = annotations.filter(a => a.type === 'LIQUIDITY_ZONE' && !a.touched);

        // Filter valid zones based on price relation (must approach from correct side)
        const validZones = liquidityZones.filter(zone => {
            const isBullishZone = zone.zoneType === 'EQUAL_LOWS' || zone.zoneType === 'SESSION_LOW';

            // Allow for 1.5% deviation (active sweep), otherwise it's a structural break
            const deviation = 0.015;

            if (isBullishZone) {
                // For bullish sweep, price should be ABOVE the lows (or currently sweeping them)
                // If price is > 1.5% below, it's a break
                return currentPrice >= zone.coordinates.price * (1 - deviation);
            } else {
                // For bearish sweep, price should be BELOW the highs
                // If price is > 1.5% above, it's a break
                return currentPrice <= zone.coordinates.price * (1 + deviation);
            }
        });

        // Find closest valid liquidity
        let closest = null;
        let minDistance = Infinity;

        validZones.forEach(zone => {
            const distance = Math.abs(zone.coordinates.price - currentPrice);
            if (distance < minDistance) {
                minDistance = distance;
                closest = zone;
            }
        });

        return closest;
    }

    getEntryLogic(analysis) {
        return 'Wait for price to sweep the liquidity zone (equal highs/lows) with a wick, ' +
            'then enter on reversal confirmation. Look for rejection candles and structure formation.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup invalidated if price closes beyond the liquidity zone without reversal, ' +
            'indicating genuine breakout rather than liquidity grab.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [2.0, 3.0]
        };
    }
}
