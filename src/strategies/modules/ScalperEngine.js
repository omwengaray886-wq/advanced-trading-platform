/**
 * Scalper Engine (Phase 73 Upgrade)
 * Automated logic for High-Frequency Scalping using Order Book data + Micro-Structure
 */
import { MicroStructureEngine } from './MicroStructureEngine.js';

export class ScalperEngine {
    /**
     * Analyze Order Book for Scalp Setups
     * @param {Array} liquidityMaps - Normalized LiquidityMap objects from LiquidityMapService
     * @param {number} currentPrice - Current market price
     * @returns {Object|null} - Scalp Setup or null
     */
    static analyze(liquidityMaps, currentPrice, marketState) {
        // 1. Order Book Scalps (Wall Front-Run)
        if (liquidityMaps && liquidityMaps.length > 0) {
            const obi = this.calculateImbalance(liquidityMaps);
            const wallSetup = this.findWallFrontRun(liquidityMaps, currentPrice);

            // Logic: Require CONFLUENCE of Imbalance + Wall
            if (wallSetup && obi.direction === wallSetup.direction) {
                return {
                    type: 'SCALP_V1',
                    direction: wallSetup.direction,
                    entry: wallSetup.entry,
                    stopLoss: wallSetup.stopLoss,
                    target: wallSetup.target,
                    rationale: `Scalp: ${obi.direction} Flow (${obi.ratio.toFixed(1)}x) front-running wall at ${wallSetup.wallPrice}`,
                    confidence: Math.min(0.95, 0.5 + (obi.ratio / 10))
                };
            }
        }

        // 2. Liquidity Sweep Scalps (Phase 40 Upgrade)
        // Requires marketState with liquiditySweep data
        if (marketState && marketState.liquiditySweep) {
            const sweepSetup = this.analyzeSweeps(marketState.liquiditySweep, currentPrice);
            if (sweepSetup) return sweepSetup;
        }

        // 3. Phase 73: Micro-Structure Analysis (Order Flow + Momentum Bursts)
        if (marketState) {
            // 3a. Order Flow Imbalance Scalps
            const orderBook = marketState.orderBook || null;
            if (orderBook) {
                const flowImbalance = MicroStructureEngine.detectOrderFlowImbalance(orderBook);
                const microSetup = MicroStructureEngine.generateScalpSetup(
                    marketState.candles || [],
                    flowImbalance,
                    marketState
                );
                if (microSetup) return microSetup;
            }

            // 3b. Micro-Structure Sweep Detection
            const microSweep = MicroStructureEngine.detectMicroSweep(
                marketState.candles || [],
                marketState.liquidityPools || []
            );
            if (microSweep) {
                return {
                    type: 'SCALP_MICROSWEEP',
                    direction: microSweep.type.includes('BULLISH') ? 'LONG' : 'SHORT',
                    entry: microSweep.entry,
                    stopLoss: microSweep.stopLoss,
                    target: microSweep.target,
                    rationale: `Micro-Sweep: ${microSweep.type} with ${microSweep.wickPercent.toFixed(2)}% wick rejection`,
                    confidence: microSweep.confidence / 100
                };
            }
        }

        return null;
    }

    /**
     * Analyze Liquidity Sweeps for Reversal Scalps
     * @param {Object} sweep - The detected liquidity sweep event
     * @param {number} currentPrice - Current market price
     */
    static analyzeSweeps(sweep, currentPrice) {
        if (!sweep || !sweep.sweptLevel) return null;

        const isRecent = (Date.now() / 1000) - sweep.timestamp < 900; // Within last 15 mins for scalp
        if (!isRecent) return null;

        // Bearish Scalp: Buy-side Liquidity Swept (Highs taken) + Rejection
        if (sweep.type === 'BUY_SIDE' && currentPrice < sweep.sweptLevel) {
            return {
                type: 'SCALP_SWEEP',
                direction: 'SHORT',
                entry: currentPrice,
                stopLoss: sweep.sweptLevel * 1.0005, // Tight stop above wick
                target: currentPrice - (sweep.sweptLevel - currentPrice) * 2, // 2R Target
                rationale: `Scalp: Buy-side Liquidity Sweep at ${sweep.sweptLevel} with immediate rejection.`,
                confidence: 0.85
            };
        }

        // Bullish Scalp: Sell-side Liquidity Swept (Lows taken) + Rejection
        if (sweep.type === 'SELL_SIDE' && currentPrice > sweep.sweptLevel) {
            return {
                type: 'SCALP_SWEEP',
                direction: 'LONG',
                entry: currentPrice,
                stopLoss: sweep.sweptLevel * 0.9995, // Tight stop below wick
                target: currentPrice + (currentPrice - sweep.sweptLevel) * 2,
                rationale: `Scalp: Sell-side Liquidity Sweep at ${sweep.sweptLevel} with immediate rejection.`,
                confidence: 0.85
            };
        }

        return null;
    }

    /**
     * Calculate Bid/Ask Volume Imbalance
     * @returns {Object} { direction, ratio }
     */
    static calculateImbalance(maps) {
        const bids = maps.filter(m => m.side === 'BID');
        const asks = maps.filter(m => m.side === 'ASK');

        // Sum volume of top 10 levels
        const bidVol = bids.slice(0, 10).reduce((sum, b) => sum + b.volume, 0);
        const askVol = asks.slice(0, 10).reduce((sum, a) => sum + a.volume, 0);

        if (bidVol > askVol * 1.5) return { direction: 'LONG', ratio: bidVol / askVol };
        if (askVol > bidVol * 1.5) return { direction: 'SHORT', ratio: askVol / bidVol };

        return { direction: 'NEUTRAL', ratio: 1 };
    }

    /**
     * Find "Whale Wall" to front-run
     * Strategy: Place limit order 1 tick ahead of a massive wall.
     */
    static findWallFrontRun(maps, currentPrice) {
        const bids = maps.filter(m => m.side === 'BID').sort((a, b) => b.price - a.price);
        const asks = maps.filter(m => m.side === 'ASK').sort((a, b) => a.price - b.price);

        // Config: What constitutes a "Wall"? > 3x average volume?
        // Simple heuristic: Look for intensity > 0.8 (which we normalized relative to max in LiquidityMapService)

        // Long Setup: Front-run a BID Wall (Support)
        const bidWall = bids.find(b => b.intensity > 0.8 && b.price < currentPrice);
        if (bidWall) {
            // Check if wall is close enough (within 0.5%)
            if ((currentPrice - bidWall.price) / currentPrice < 0.005) {
                return {
                    direction: 'LONG',
                    wallPrice: bidWall.price,
                    entry: bidWall.price * 1.0001, // Just above
                    stopLoss: bidWall.price * 0.999, // Just below
                    target: currentPrice * 1.005 // 0.5% Scalp Target
                };
            }
        }

        // Short Setup: Front-run an ASK Wall (Resistance)
        const askWall = asks.find(a => a.intensity > 0.8 && a.price > currentPrice);
        if (askWall) {
            if ((askWall.price - currentPrice) / currentPrice < 0.005) {
                return {
                    direction: 'SHORT',
                    wallPrice: askWall.price,
                    entry: askWall.price * 0.9999, // Just below
                    stopLoss: askWall.price * 1.001, // Just above
                    target: currentPrice * 0.995
                };
            }
        }

        return null;
    }
}
