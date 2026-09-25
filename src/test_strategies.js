
import { AnalysisOrchestrator } from './services/analysisOrchestrator.js';

// Mock some candle data
const createCandles = (count) => {
    const candles = [];
    let price = 1000;
    for (let i = 0; i < count; i++) {
        const time = 1600000000 + (i * 3600);
        const open = price;
        const close = price + (Math.random() - 0.5) * 10;
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;
        candles.push({ time, open, high, low, close, volume: 1000 });
        price = close;
    }
    return candles;
};

async function runTest() {
    console.log('Starting Analysis Verification...');

    try {
        const orchestrator = new AnalysisOrchestrator();
        const candles = createCandles(200);

        console.log(`Generated ${candles.length} mock candles.`);

        // Mock DB dependencies or ensure they handle being offline
        // The orchestrator imports many things, some might try to connect to DB.
        // We hope the logic is pure enough or handles errors gracefully.

        const analysis = await orchestrator.analyze(candles, 'BTC/USD', '1H');

        console.log('Analysis completed successfully.');
        console.log('Setups found:', analysis.setups.length);

        analysis.setups.forEach(s => {
            console.log(`- Setup: ${s.name} (${s.direction})`);
            console.log(`  Reasoning: ${s.rationale}`);
        });

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

runTest();
