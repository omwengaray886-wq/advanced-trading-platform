import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';

async function reproduce() {
    const orchestrator = new AnalysisOrchestrator();
    const symbol = 'BTCUSDT';
    const candles = [
        { time: 100, open: 50000, high: 50100, low: 49900, close: 50050 },
        { time: 200, open: 50050, high: 50200, low: 50000, close: 50150 }
    ].concat(Array(50).fill({ time: 300, open: 50150, high: 50300, low: 50100, close: 50250 }));

    console.log('Starting analysis...');
    try {
        await orchestrator.analyze(candles, symbol, '1h');
        console.log('Analysis successful!');
    } catch (err) {
        console.error('Captured Error:', err);
    }
}

reproduce();
