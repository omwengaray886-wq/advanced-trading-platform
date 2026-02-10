/**
 * Strategy Registry
 * Manages and categorizes all available trading strategies
 */

import { TrendContinuation } from './modules/TrendContinuation.js';
import { StructureBreakRetest } from './modules/StructureBreakRetest.js';
import { LiquiditySweep } from './modules/LiquiditySweep.js';
import { OrderBlock } from './modules/OrderBlock.js';
import { FairValueGap } from './modules/FairValueGap.js';
import { RangeTrading } from './modules/RangeTrading.js';
import { BreakerBlock } from './modules/BreakerBlock.js';
import { MitigationBlock } from './modules/MitigationBlock.js';
import { OptimalTradeEntry } from './modules/OptimalTradeEntry.js';
import { AsianRangeBreakout } from './modules/AsianRangeBreakout.js';
import { LondonFakeout } from './modules/LondonFakeout.js';
import { CHoCHReversal } from './modules/CHoCHReversal.js';
import { FractalStructure } from './modules/FractalStructure.js';
import { DoubleTopBottom } from './modules/DoubleTopBottom.js';
import { RSIDivergence } from './modules/RSIDivergence.js';
import { PriceActionConfirmation } from './modules/PriceActionConfirmation.js';
import { EMAAlignment } from './modules/EMAAlignment.js';
import { QuasimodoReversal } from './modules/QuasimodoReversal.js';
import { SupplyDemandFlip } from './modules/SupplyDemandFlip.js';
import { ThreeDrivePattern } from './modules/ThreeDrivePattern.js';
import { HeadAndShoulders } from './modules/HeadAndShoulders.js';
import { GartleyPattern } from './modules/GartleyPattern.js';
import { VolumeSpikeExhaustion } from './modules/VolumeSpikeExhaustion.js';
import { WyckoffAccumulation } from './modules/WyckoffAccumulation.js';
import { WyckoffDistribution } from './modules/WyckoffDistribution.js';
import { OrderBlockFlip } from './modules/OrderBlockFlip.js';
import { StopRunAccumulation } from './modules/StopRunAccumulation.js';
import { ImbalanceExploitation } from './modules/ImbalanceExploitation.js';
import { SessionBreakout } from './modules/SessionBreakout.js';
import { MarketProfileStrategy } from './modules/MarketProfileStrategy.js';

export const STRATEGY_CATEGORIES = {
    MARKET_STRUCTURE: 'Market Structure',
    SMC_ICT: 'SMC & ICT',
    LIQUIDITY: 'Liquidity Based',
    SESSIONS: 'Session Based',
    RANGE: 'Range & Mean Reversion',
    ADVANCED: 'Hybrid & Advanced',
    INDICATORS: 'Indicator Based',
    HARMONICS: 'Harmonic Patterns',
    PROFILE: 'Volume & Profile' // New Category
};

export class StrategyRegistry {
    constructor() {
        this.strategies = [
            { category: STRATEGY_CATEGORIES.MARKET_STRUCTURE, instance: new TrendContinuation() },
            { category: STRATEGY_CATEGORIES.MARKET_STRUCTURE, instance: new StructureBreakRetest() },
            { category: STRATEGY_CATEGORIES.MARKET_STRUCTURE, instance: new HeadAndShoulders() },
            { category: STRATEGY_CATEGORIES.MARKET_STRUCTURE, instance: new CHoCHReversal() },
            { category: STRATEGY_CATEGORIES.MARKET_STRUCTURE, instance: new FractalStructure() },
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new OrderBlock() },
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new FairValueGap() },
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new BreakerBlock() },
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new MitigationBlock() },
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new OptimalTradeEntry() },
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new QuasimodoReversal() },
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new SupplyDemandFlip() },
            // NEW STRATEGIES
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new OrderBlockFlip() },
            { category: STRATEGY_CATEGORIES.LIQUIDITY, instance: new StopRunAccumulation() },
            { category: STRATEGY_CATEGORIES.SMC_ICT, instance: new ImbalanceExploitation() },
            { category: STRATEGY_CATEGORIES.SESSIONS, instance: new SessionBreakout() },
            { category: STRATEGY_CATEGORIES.PROFILE, instance: new MarketProfileStrategy() }, // Use new category

            { category: STRATEGY_CATEGORIES.LIQUIDITY, instance: new LiquiditySweep() },
            { category: STRATEGY_CATEGORIES.SESSIONS, instance: new AsianRangeBreakout() },
            { category: STRATEGY_CATEGORIES.SESSIONS, instance: new LondonFakeout() },
            { category: STRATEGY_CATEGORIES.RANGE, instance: new RangeTrading() },
            { category: STRATEGY_CATEGORIES.ADVANCED, instance: new DoubleTopBottom() },
            { category: STRATEGY_CATEGORIES.ADVANCED, instance: new ThreeDrivePattern() },
            { category: STRATEGY_CATEGORIES.ADVANCED, instance: new VolumeSpikeExhaustion() },
            { category: STRATEGY_CATEGORIES.INDICATORS, instance: new RSIDivergence() },
            { category: STRATEGY_CATEGORIES.INDICATORS, instance: new PriceActionConfirmation() },
            { category: STRATEGY_CATEGORIES.INDICATORS, instance: new EMAAlignment() },
            { category: STRATEGY_CATEGORIES.HARMONICS, instance: new GartleyPattern() },
            { category: STRATEGY_CATEGORIES.ADVANCED, instance: new WyckoffAccumulation() },
            { category: STRATEGY_CATEGORIES.ADVANCED, instance: new WyckoffDistribution() }
        ];
    }

    getAllStrategies() {
        return this.strategies.map(s => s.instance);
    }

    getStrategiesByCategory(category) {
        return this.strategies
            .filter(s => s.category === category)
            .map(s => s.instance);
    }

    getStrategyByName(name) {
        const found = this.strategies.find(s => s.instance.name === name);
        return found ? found.instance : null;
    }

    getCategorizedMap() {
        const map = {};
        Object.values(STRATEGY_CATEGORIES).forEach(cat => {
            map[cat] = this.getStrategiesByCategory(cat);
        });
        return map;
    }
}
