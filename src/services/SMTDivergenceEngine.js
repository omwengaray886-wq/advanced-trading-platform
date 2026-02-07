import { marketData } from './marketData.js';
import { DivergenceMarker } from '../models/annotations/DivergenceMarker.js';

/**
 * SMC Divergence Engine (Renamed from DivergenceEngine)
 * Detects SMT (Smart Money Technique) Divergence between correlated assets.
 * SMT occurs when correlated assets fail to make symmetrical movements at key pivots.
 */
export class SMTDivergenceEngine {
    static SIBLINGS = {
        'EURUSD': ['GBPUSD', 'AUDUSD', 'DXY', 'USDCHF'],
        'GBPUSD': ['EURUSD', 'AUDUSD', 'DXY'],
        'AUDUSD': ['EURUSD', 'GBPUSD', 'DXY', 'GOLD'],
        'XAUUSD': ['DXY', 'SILVER', 'US10Y'], // Gold
        'BTCUSDT': ['ETHUSDT', 'SOLUSDT', 'TOTAL', 'FDAX'], // FDAX correlation for risk-on
        'ETHUSDT': ['BTCUSDT', 'SOLUSDT'],
        'NAS100': ['US30', 'SPX500', 'US10Y'],
        'US30': ['NAS100', 'SPX500'],
        'SPX500': ['NAS100', 'US30', 'VIX']
    };

    /**
     * Detect Divergence for the current symbol using significant swings
     * @param {string} symbol - Current symbol
     * @param {Array} candles - Current asset candles
     * @param {string} timeframe - Current timeframe
     * @param {Array} significantSwings - (Optional) Pre-calculated swings from orchestration
     */
    static async detectDivergence(symbol, candles, timeframe, significantSwings = null) {
        const cleanSymbol = symbol.replace('/', '').toUpperCase();
        const targets = this.SIBLINGS[cleanSymbol] || [];
        const divergences = [];
        const scoreWeight = 100 / Math.max(targets.length, 1);

        if (!significantSwings) {
            // Fallback if not provided, though orchestrator should provide it
            significantSwings = this.findLocalSwings(candles);
        }

        // We need the last two major pivots to compare
        const lastHigh = this.getLastSwing(significantSwings, 'HIGH');
        const lastLow = this.getLastSwing(significantSwings, 'LOW');

        if (!lastHigh && !lastLow) return [];

        let confirmedWith = 0;
        let divergedWith = 0;


        const results = await Promise.allSettled(targets.map(async (target) => {
            // Fetch target candles (matching timeframe)
            const targetCandles = await marketData.fetchHistory(target, timeframe, candles.length);
            if (!targetCandles || targetCandles.length < 20) {
                console.log(`[SMT DEBUG] No candles for ${target}`);
                return null;
            }

            const targetSwings = this.findLocalSwings(targetCandles);
            // console.log(`[SMT DEBUG] ${target} Swings:`, targetSwings.length);

            const bearishSMT = lastHigh ? this.checkBearishSMT(cleanSymbol, lastHigh, target, targetSwings, targetCandles) : null;
            const bullishSMT = lastLow ? this.checkBullishSMT(cleanSymbol, lastLow, target, targetSwings, targetCandles) : null;

            if (bearishSMT) console.log(`[SMT DEBUG] Bearish SMT found with ${target}`);

            if (bearishSMT) return { smt: bearishSMT, target };
            if (bullishSMT) return { smt: bullishSMT, target };
            return { smt: null, target, confirmed: true };
        }));

        for (const res of results) {
            if (res.status === 'fulfilled' && res.value) {
                if (res.value.smt) {
                    divergences.push(res.value.smt);
                    divergedWith++;
                } else if (res.value.confirmed) {
                    confirmedWith++;
                }
            } else if (res.status === 'rejected') {
                console.warn(`[SMT WARNING] Failed to fetch data for sibling:`, res.reason);
            }
        }


        // Basket Analysis & Confluence Scoring
        let confluenceScore = 0;
        if (divergences.length > 0) {
            const ratio = divergedWith / (divergedWith + confirmedWith);
            confluenceScore = Math.round(ratio * 100);
            divergences.forEach(d => {
                d.metadata.basketStrength = confluenceScore + '%';
                d.metadata.divergedWith = divergedWith;
                d.metadata.confirmedWith = confirmedWith;
                d.metadata.confluenceScore = confluenceScore;
            });
        }

        return { divergences, confluenceScore, stats: { divergedWith, confirmedWith } };
    }

    /**
     * Check for Bearish SMT (Distribution) at Highs
     * Rule: Asset A makes Higher High, Asset B makes Lower High (or vice versa)
     * If Inverse (e.g. DXY), Asset A Higher High, Asset B Higher Low (Failure to make lower low)
     */
    static checkBearishSMT(symbolA, swingA, symbolB, swingsB, candlesB) {
        // Find the swing in B that happened around the same time as swingA
        const swingB = this.findMatchingSwing(swingA, swingsB, candlesB);
        if (!swingB) return null;

        const isInverse = this.isInversePair(symbolA, symbolB);

        // Compare previous highs
        const prevSwingA = swingA.prevSwing; // Need previous high point
        if (!prevSwingA) return null;

        const prevSwingB = this.findMatchingSwing(prevSwingA, swingsB, candlesB);
        if (!prevSwingB) return null;

        // Logic:
        // A: Current High > Prev High (HH)
        // B (Correlated): Current High < Prev High (LH) -> SMT
        // B (Correlated): Current High > Prev High (HH) -> Confirmation

        // B (Inverse): Current Low > Prev Low (HL) -> Normal (DXY goes up, EUR goes down)
        // B (Inverse): Current Low < Prev Low (LL) -> Divergence?
        // Actually simpler: Just check direction.

        const aMadeHH = swingA.price > prevSwingA.price;

        let smtDetected = false;
        let type = 'BEARISH';

        if (isInverse) {
            // Inverse Logic (e.g. EURUSD vs DXY)
            // EURUSD makes HH. DXY should make LL.
            // IF DXY makes HL (Strength), that is bearish for EURUSD? 
            // Wait. 
            // Bearish SMT on EURUSD: EURUSD makes HH. DXY makes LL (Confirmed). 
            // Bearish SMT: EURUSD makes HH. DXY makes HL (DXY shows strength). Yes.

            // Find matching LOW for DXY if we are looking at HIGHs
            // But wait, findMatchingSwing returns the swing at that time.
            // If DXY is inverse, at EURUSD High, DXY should be at a Low.

            if (swingB.type === 'LOW' && prevSwingB.type === 'LOW') {
                const bMadeLL = swingB.price < prevSwingB.price;
                // If A (EURUSD) HH, and B (DXY) fails to make LL (HL) -> Bearish SMT
                if (aMadeHH && !bMadeLL) {
                    smtDetected = true;
                }
            } else if (swingB.type === 'HIGH' && prevSwingB.type === 'HIGH') {
                // Sometimes DXY is mapped to a direct proxy that isn't yet inverted in the data
                const bMadeLL = swingB.price < prevSwingB.price;
                if (aMadeHH && bMadeLL) smtDetected = true;
            }
        } else {
            // Correlated Logic
            if (swingB.type === 'HIGH' && prevSwingB.type === 'HIGH') {
                const bMadeHH = swingB.price > prevSwingB.price;
                if (aMadeHH && !bMadeHH) {
                    // A HH, B LH (Weakness) -> Bearish SMT (if A is laggard? No, A is sweeping liquidity)
                    // Usually SMT is defined as: One asset takes liquidity, the other doesn't.
                    // If A takes liquidity (HH) and B doesn't (LH), it suggests the move in A is a trap.
                    smtDetected = true;
                }
            }
        }

        if (smtDetected) {
            return new DivergenceMarker(
                swingA.time,
                swingA.price,
                'BEARISH',
                `Bearish SMT with ${symbolB}`,
                { sibling: symbolB, pivotPrice: swingB.price, reference: 'Highs' }
            );
        }
        return null;
    }

    /**
     * Check for Bullish SMT (Accumulation) at Lows
     */
    static checkBullishSMT(symbolA, swingA, symbolB, swingsB, candlesB) {
        const swingB = this.findMatchingSwing(swingA, swingsB, candlesB);
        if (!swingB) return null;

        const isInverse = this.isInversePair(symbolA, symbolB);
        const prevSwingA = swingA.prevSwing;

        if (!prevSwingA) return null;

        const prevSwingB = this.findMatchingSwing(prevSwingA, swingsB, candlesB);
        if (!prevSwingB) return null;

        const aMadeLL = swingA.price < prevSwingA.price;
        let smtDetected = false;

        if (isInverse) {
            // Inverse (EURUSD Lows vs DXY Highs)
            // EURUSD Make LL. DXY should make HH.
            // If DXY makes LH (Weakness), that is Bullish for EURUSD.
            if (swingB.type === 'HIGH' && prevSwingB.type === 'HIGH') {
                const bMadeHH = swingB.price > prevSwingB.price;
                if (aMadeLL && !bMadeHH) {
                    smtDetected = true;
                }
            }
        } else {
            // Correlated
            // A Make LL. B Make HL (Strength).
            if (swingB.type === 'LOW' && prevSwingB.type === 'LOW') {
                const bMadeLL = swingB.price < prevSwingB.price;
                if (aMadeLL && !bMadeLL) {
                    smtDetected = true;
                }
            }
        }

        if (smtDetected) {
            return new DivergenceMarker(
                swingA.time,
                swingA.price,
                'BULLISH',
                `Bullish SMT with ${symbolB}`,
                { sibling: symbolB, pivotPrice: swingB.price, reference: 'Lows' }
            );
        }
        return null;
    }


    /**
     * Helper: Find a swing point in target asset that roughly matches the time of source swing
     */
    static findMatchingSwing(sourceSwing, targetSwings, targetCandles) {
        // Allow for small time deviation (e.g. 1-2 candles)
        const timeTol = 7200; // 2 hours (assuming 4H/1H mostly) or 2 bars

        const distinctSwings = targetSwings.filter(s => Math.abs(s.time - sourceSwing.time) < timeTol);
        if (distinctSwings.length > 0) return distinctSwings[0];

        // If no exact swing found, find the HIGH/LOW within that window in raw candles
        // This handles cases where one asset printed a fractal swing and the other didn't explicitly
        return null;
    }

    static getLastSwing(swings, type) {
        const filtered = swings.filter(s => s.type === type);
        if (filtered.length < 2) return null;
        // Return the most recent one, with reference to the previous one
        const current = filtered[filtered.length - 1];
        const prev = filtered[filtered.length - 2];
        return { ...current, prevSwing: prev };
    }

    static isInversePair(a, b) {
        // Normalize
        const pairA = a.replace('/', '').toUpperCase();
        const pairB = b.replace('/', '').toUpperCase();

        // 1. Compare against DXY
        if (pairB === 'DXY') {
            // If Base is USD (e.g. USDJPY), it moves WITH DXY -> Not Inverse
            if (pairA.startsWith('USD') && !pairA.includes('USDT') && !pairA.includes('USDC')) return false;

            // If Quote is USD (e.g. EURUSD, GBPUSD, XAUUSD), it moves AGAINST DXY -> Inverse
            // (Assuming standard forex pairs where non-USD is base)
            return true;
        }

        // 2. Compare against Inverse Pairs directly (e.g. EURUSD vs USDCHF)
        if (pairA === 'EURUSD' || pairA === 'GBPUSD' || pairA === 'AUDUSD' || pairA === 'NZDUSD') {
            if (pairB === 'USDCHF' || pairB === 'USDCAD' || pairB === 'USDJPY') return true;
        }

        // 3. Compare DXY against others
        if (pairA === 'DXY') {
            if (pairB.startsWith('USD') && !pairB.includes('USDT')) return false; // DXY vs USDJPY -> Correlated
            return true; // DXY vs EURUSD -> Inverse
        }

        return false;
    }

    // Basic local swing detection if not provided (Legacy/Backup)
    static findLocalSwings(candles) {
        const swings = [];
        for (let i = 2; i < candles.length - 2; i++) {
            const c = candles[i];
            const isHigh = c.high > candles[i - 1].high && c.high > candles[i - 2].high &&
                c.high > candles[i + 1].high && c.high > candles[i + 2].high;
            const isLow = c.low < candles[i - 1].low && c.low < candles[i - 2].low &&
                c.low < candles[i + 1].low && c.low < candles[i + 2].low;

            if (isHigh) swings.push({ type: 'HIGH', price: c.high, time: c.time, index: i });
            if (isLow) swings.push({ type: 'LOW', price: c.low, time: c.time, index: i });
        }
        return swings;
    }

}
