import { StrategyBase } from '../StrategyBase.js';
import { SmartMoneyConcepts } from '../../analysis/smartMoneyConcepts.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { calculateOBV } from '../../analysis/indicators.js';

/**
 * Stop Run Accumulation Strategy
 * 
 * Aggressive reversal strategy that enters immediately after a Liquidity Sweep (Turtle Soup),
 * confirmed by volume/OBV divergence or immediate reclamation of the range.
 */
export class StopRunAccumulation extends StrategyBase {
    constructor() {
        super(
            'Stop Run Accumulation',
            'Aggressive reversal entry after a liquidity sweep (Stop Run) with volume confirmation.'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        // This is primarily a REVERSAL strategy (counter-trend usually, or trend-resumption after deep pullback)
        // Checks if we just swept liquidity

        // Requires a sweep event
        const sweep = marketState.liquiditySweep;
        if (!sweep) return 0;

        // Direction matching
        // If we swept LOWS, we want to go LONG (Accumulation)
        // If we swept HIGHS, we want to go SHORT (Distribution)

        const sweepType = sweep.type; // 'SELL_SIDE' (Low Sweep) or 'BUY_SIDE' (High Sweep)

        if (direction === 'LONG') {
            if (sweepType !== 'SELL_SIDE' && sweepType !== 'LOW_SWEEP') return 0;
        } else {
            if (sweepType !== 'BUY_SIDE' && sweepType !== 'HIGH_SWEEP') return 0;
        }

        // Score based on confirmation
        let score = 0.75;

        // Boost if OBV divergence exists?
        // (Logic would be in generateAnnotations or pre-calculated)

        if (marketState.volatility > 40) score += 0.1; // Like volatility for stops

        return score;
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        const sweep = marketState.liquiditySweep;

        // Double check validity inside generation
        if (!sweep) return [];
        const sweepType = sweep.type;
        if (direction === 'LONG' && (sweepType !== 'SELL_SIDE' && sweepType !== 'LOW_SWEEP')) return [];
        if (direction === 'SHORT' && (sweepType !== 'BUY_SIDE' && sweepType !== 'HIGH_SWEEP')) return [];

        // Confirmation Logic:
        // 1. Price must be back above the swept level (for Long)
        const currentPrice = candles[candles.length - 1].close;
        const sweptLevel = sweep.price;

        const isReclaimed = direction === 'LONG'
            ? currentPrice > sweptLevel
            : currentPrice < sweptLevel;

        if (!isReclaimed) return []; // Too risky if still below the swept level

        // 2. Volume Analysis (Optional but recommended)
        // Check OBV for divergence? 
        // Simple check: Is the sweep candle high volume?
        const lastCandle = candles[candles.length - 1];
        // If the sweep happened on the last few candles

        // Generate Signal
        const entryZone = new EntryZone(
            direction === 'LONG' ? sweptLevel : lastCandle.high,
            direction === 'LONG' ? lastCandle.low : sweptLevel,
            direction === 'LONG' ? 'LONG' : 'SHORT',
            {
                id: `stop-run-${Date.now()}`,
                confidence: 0.85,
                note: `Stop Run of ${sweep.levelType || 'Liquidity'}`,
                startTime: Date.now() / 1000,
                endTime: Date.now() / 1000 + 3600 * 4
            }
        );
        annotations.push(entryZone);

        // Tight Stop Loss: Just beyond the sweep wick
        const buffer = this.calculateATR(candles) * 0.5;
        const stopLoss = direction === 'LONG'
            ? sweep.low - buffer // Wick low
            : sweep.high + buffer; // Wick high

        annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS', {
            label: `Invalidation`
        }));

        // Targets: Return to range mean or opposite liquidity
        const risk = Math.abs(entryZone.getOptimalEntry() - stopLoss);
        const t1 = direction === 'LONG' ? entryZone.getOptimalEntry() + (risk * 3) : entryZone.getOptimalEntry() - (risk * 3);

        annotations.push(new TargetProjection(t1, 'TARGET_1', {
            label: 'Range Reversion (3R)',
            riskReward: 3.0
        }));

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Liquidity has been swept and price has immediately reclaimed the level, indicating a "Stop Run" or "Turtle Soup" reversal.';
    }

    getInvalidationLogic(analysis) {
        return 'New low/high beyond the sweep wick confirms the trend continuation.';
    }

    getRiskParameters(analysis) { return {}; }
}
