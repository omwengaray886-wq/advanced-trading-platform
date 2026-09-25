import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';
import { SupplyDemandZone } from '../../models/annotations/SupplyDemandZone.js';

/**
 * Supply/Demand Flip Strategy (Phase 32 Upgraded)
 * Identifies zones that swap roles from Supply to Demand (or vice versa).
 * All proximity thresholds and SL buffers are now ATR-based and regime-aware,
 * matching the dynamic geometry applied by _verifyTargetGeometry in the orchestrator.
 */
export class SupplyDemandFlip extends StrategyBase {
    constructor() {
        super(
            'Supply/Demand Flip',
            'Trading zones that swap roles (S2D or D2S) after a breakout and retest.'
        );
    }

    evaluate(marketState) {
        // Works best in TRANSITIONAL or strongly TRENDING markets
        if (marketState.regime === 'TRANSITIONAL') return 0.90;
        if (marketState.regime === 'TRENDING') return 0.82;
        return 0.40;
    }

    generateAnnotations(candles, marketState) {
        const annotations = [];
        const structures = marketState.structures || [];

        const recentHighs = structures.filter(s => s.markerType === 'HH' || s.markerType === 'LH').slice(-5);
        const recentLows = structures.filter(s => s.markerType === 'LL' || s.markerType === 'HL').slice(-5);
        const currentPrice = candles[candles.length - 1].close;

        // --- ATR-based Dynamic Parameters ---
        // ATR sourced from marketState (calculated by the orchestrator); falls back to 0.5% of price
        const atr = marketState.atr || (currentPrice * 0.005);
        const regime = marketState.regime || 'TRENDING';

        // Proximity: consider price "at" a flip level if within 0.5 ATR
        // (replaces the previous hardcoded 0.5% check)
        const proximityThreshold = atr * 0.5;

        // SL buffer scaled by regime — mirrors _verifyTargetGeometry's atrMultiplier logic:
        //   TRENDING  → 1.0× ATR  (wider, absorbs trend pullbacks)
        //   RANGING   → 0.3× ATR  (tight, behind range edge)
        //   default   → 0.5× ATR
        const slMultiplier = regime === 'TRENDING' ? 1.0 : regime === 'RANGING' ? 0.3 : 0.5;
        const slBuffer = atr * slMultiplier;

        // Regime-aware R:R values (aligned with _verifyTargetGeometry's minRR):
        //   TRENDING  → minRR 1.5  → T1=1.5, T2=2.0, T3=3.5
        //   RANGING   → minRR 1.0  → T1=1.0, T2=1.5, T3=3.0
        //   default   → minRR 1.2  → T1=1.2, T2=1.7, T3=3.2
        const minRR = regime === 'TRENDING' ? 1.5 : regime === 'RANGING' ? 1.0 : 1.2;
        const rr1 = minRR;
        const rr2 = minRR + 0.5;
        const rr3 = minRR + 2.0; // Swing extension target

        // Bullish Flip Detection (S2D): prior resistance broken → now demand
        for (const high of recentHighs) {
            if (currentPrice > high.price) {
                const distance = currentPrice - high.price;
                if (distance < proximityThreshold) {
                    // Zone width scales with 10% of ATR either side of the level
                    annotations.push(new SupplyDemandZone(
                        high.price + (atr * 0.1),
                        high.price - (atr * 0.1),
                        'DEMAND',
                        { confidence: 0.88, note: `S→D Flip`, strength: 0.9 }
                    ));

                    // Entry zone is 5% of ATR either side for precision
                    annotations.push(new EntryZone(
                        high.price + (atr * 0.05),
                        high.price - (atr * 0.05),
                        'LONG',
                        { confidence: 0.85, note: 'S2D Entry', timeframe: '1H' }
                    ));

                    const stopLoss = high.price - slBuffer;
                    const risk = high.price - stopLoss; // always positive

                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                    annotations.push(new TargetProjection(high.price + (risk * rr1), 'TARGET_1', { riskReward: rr1 }));
                    annotations.push(new TargetProjection(high.price + (risk * rr2), 'TARGET_2', { riskReward: rr2 }));
                    annotations.push(new TargetProjection(high.price + (risk * rr3), 'TARGET_3', { riskReward: rr3 }));
                    break;
                }
            }
        }

        // Bearish Flip Detection (D2S): prior support broken → now supply
        for (const low of recentLows) {
            if (currentPrice < low.price) {
                const distance = low.price - currentPrice;
                if (distance < proximityThreshold) {
                    annotations.push(new SupplyDemandZone(
                        low.price + (atr * 0.1),
                        low.price - (atr * 0.1),
                        'SUPPLY',
                        { confidence: 0.88, note: `D→S Flip`, strength: 0.9 }
                    ));

                    annotations.push(new EntryZone(
                        low.price - (atr * 0.05),
                        low.price + (atr * 0.05),
                        'SHORT',
                        { confidence: 0.85, note: 'D2S Entry', timeframe: '1H' }
                    ));

                    const stopLoss = low.price + slBuffer;
                    const risk = stopLoss - low.price; // always positive

                    annotations.push(new TargetProjection(stopLoss, 'STOP_LOSS'));
                    annotations.push(new TargetProjection(low.price - (risk * rr1), 'TARGET_1', { riskReward: rr1 }));
                    annotations.push(new TargetProjection(low.price - (risk * rr2), 'TARGET_2', { riskReward: rr2 }));
                    annotations.push(new TargetProjection(low.price - (risk * rr3), 'TARGET_3', { riskReward: rr3 }));
                    break;
                }
            }
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Enter when price returns to a high-significance level that previously acted as the opposite ' +
            'supply/demand barrier. A "Flip" indicates that the market bias at that level has shifted definitively.';
    }

    getInvalidationLogic(analysis) {
        return 'Setup is invalidated if price passes through the zone without rejection, ' +
            'indicating that the level has lost its significance or the "flip" was a fakeout.';
    }

    getRiskParameters(analysis) {
        return {
            stopLoss: analysis.stopLoss,
            targets: analysis.targets,
            riskReward: [1.5, 2.0, 3.5] // Regime-aware; actual values sourced from minRR at analysis time
        };
    }
}
