import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';

/**
 * Market Profile Strategy
 * 
 * Trades based on Value Area (VA) relationships.
 * - Open inside yesterday's VA -> Reversion to POC
 * - Open outside yesterday's VA -> Trend potential
 */
export class MarketProfileStrategy extends StrategyBase {
    constructor() {
        super(
            'Market Profile',
            'Auction Market Theory strategy using Value Area relationships and POC targets.'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        // Needs Volume Profile data
        if (!marketState.volumeProfile || !marketState.volumeProfile.current) return 0;

        const profile = marketState.volumeProfile.current;
        const previousProfile = marketState.volumeProfile.profiles ? marketState.volumeProfile.profiles[marketState.volumeProfile.profiles.length - 2] : null;

        if (!previousProfile) return 0.4; // Not enough data

        const currentPrice = marketState.currentPrice;

        // Check "Open" relation to Previous VA (Using session open or day open)
        // Ideally we track the "Open" of the current session. 
        // Providing we have access to open price of session:
        const openPrice = marketState.session.active ? marketState.session.openPrice : marketState.lastCandle.open; // Approximation

        const inVA = openPrice >= previousProfile.val && openPrice <= previousProfile.vah;
        const aboveVA = openPrice > previousProfile.vah;
        const belowVA = openPrice < previousProfile.val;

        // Strategy 1: Reversion to POC (Inside VA)
        if (inVA) {
            // If inside VA, we look to fade extremes back to POC
            // Long potential if price is near VAL
            if (direction === 'LONG' && currentPrice < previousProfile.poc && currentPrice > previousProfile.val) return 0.7;
            // Short potential if price is near VAH
            if (direction === 'SHORT' && currentPrice > previousProfile.poc && currentPrice < previousProfile.vah) return 0.7;
        }

        // Strategy 2: Breakout / Drive (Outside VA)
        if (aboveVA && direction === 'LONG') return 0.8; // Bullish drive
        if (belowVA && direction === 'SHORT') return 0.8; // Bearish drive

        return 0.3;
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];
        if (!marketState.volumeProfile.profiles || marketState.volumeProfile.profiles.length < 2) return [];

        const previousProfile = marketState.volumeProfile.profiles[marketState.volumeProfile.profiles.length - 2];
        const currentPrice = marketState.currentPrice;

        // Determine Mode: Reversion or Trend
        // Simplification: based on current price vs VA
        const inVA = currentPrice >= previousProfile.val && currentPrice <= previousProfile.vah;

        if (inVA) {
            // Reversion Setup
            const entryTarget = direction === 'LONG' ? previousProfile.val : previousProfile.vah;
            const destTarget = previousProfile.poc;

            // Check if we are near entry
            const dist = Math.abs(currentPrice - entryTarget);
            const atr = this.calculateATR(candles);

            // Only valid if near edge
            if (dist < atr * 2) {
                annotations.push(new EntryZone(
                    entryTarget + (atr * 0.5),
                    entryTarget - (atr * 0.5),
                    direction === 'LONG' ? 'LONG' : 'SHORT',
                    {
                        id: 'mp-reversion',
                        note: 'Value Area Reversion to POC',
                        confidence: 0.75
                    }
                ));

                // Target POC
                annotations.push(new TargetProjection(destTarget, 'TARGET_POC', { label: 'Virgin POC' }));

                // Stop: Outside VA
                const stop = direction === 'LONG' ? previousProfile.val - atr : previousProfile.vah + atr;
                annotations.push(new TargetProjection(stop, 'STOP_LOSS', { label: 'VA Escape' }));
            }
        } else {
            // Trend Setup
            // Retest of VA Edge
            const entryLevel = direction === 'LONG' ? previousProfile.vah : previousProfile.val;
            annotations.push(new EntryZone(
                entryLevel * 1.001,
                entryLevel * 0.999,
                direction === 'LONG' ? 'LONG' : 'SHORT',
                {
                    id: 'mp-trend',
                    note: 'Value Area Break & Retest',
                    confidence: 0.8
                }
            ));

            // Target: Extensions
            const risk = this.calculateATR(candles) * 2;
            annotations.push(new TargetProjection(
                direction === 'LONG' ? entryLevel + (risk * 3) : entryLevel - (risk * 3),
                'TARGET_EXT', { label: 'Trend Extension' }
            ));

            const stop = direction === 'LONG' ? entryLevel - risk : entryLevel + risk;
            annotations.push(new TargetProjection(stop, 'STOP_LOSS', { label: 'False Breakout' }));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Trade based on Auction Market Theory and value acceptance.';
    }

    getInvalidationLogic(analysis) { return ''; }
    getRiskParameters(analysis) { return {}; }
}
