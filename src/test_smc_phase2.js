
import { SmartMoneyConcepts } from './analysis/smartMoneyConcepts.js';
import { OrderBlock } from './strategies/modules/OrderBlock.js';
import { LiquiditySweep } from './strategies/modules/LiquiditySweep.js';

async function runTest() {
    console.log('Running SMC Phase 2 Verification...');

    try {
        const ob = new OrderBlock();
        console.log('Instantiated:', ob.name);

        const ls = new LiquiditySweep();
        console.log('Instantiated:', ls.name);

        const candles = Array(100).fill(0).map((_, i) => ({
            time: 1000 + i,
            open: 100 + i, high: 102 + i, low: 98 + i, close: 101 + i
        }));

        // Test detectOrderBlocks
        console.log('Testing detectOrderBlocks...');
        const blocks = SmartMoneyConcepts.detectOrderBlocks(candles, 'BULLISH');
        console.log(`Found ${blocks.length} Order Blocks.`);

        // Test detectEqualLevels
        console.log('Testing detectEqualLevels...');
        const levels = SmartMoneyConcepts.detectEqualLevels(candles, 'highs');
        console.log(`Found ${levels.length} Equal Highs.`);

        // Test generation
        const obAnnotations = ob.generateAnnotations(candles, { timeframe: '1h', regime: 'TRENDING', trend: { direction: 'BULLISH', strength: 0.8 }, liquidityPools: [] }, 'LONG');
        console.log(`OrderBlock produced ${obAnnotations.length} annotations.`);

        const lsAnnotations = ls.generateAnnotations(candles, { timeframe: '1h', regime: 'RANGING' }, 'LONG');
        console.log(`LiquiditySweep produced ${lsAnnotations.length} annotations.`);

        console.log('Verification Successful.');

    } catch (e) {
        console.error('Test Failed:', e);
        process.exit(1);
    }
}

runTest();
