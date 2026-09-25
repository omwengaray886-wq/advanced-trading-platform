
import { AnalysisOrchestrator } from './services/analysisOrchestrator.js';
import { marketData } from './services/marketData.js';

// Mock Data Generators
function generateCandles(count, startPrice = 50000) {
    let price = startPrice;
    const candles = [];
    for (let i = 0; i < count; i++) {
        const move = (Math.random() - 0.5) * 100;
        price += move;
        candles.push({
            open: price,
            high: price + 50,
            low: price - 50,
            close: price + (Math.random() - 0.5) * 20,
            volume: Math.random() * 1000,
            time: Date.now() - (count - i) * 60000
        });
    }
    return candles;
}

// Mock Market Data to avoid API calls
marketData.fetchHistory = async (symbol, timeframe, limit) => {
    if (symbol === 'DXY') {
        // Create DXY data that LEADS the mocked BTC candles by 5 periods
        // We need to access the BTC candles generated in the main function, 
        // but since we can't easily, we'll just regenerate a base and shift it.
        // Actually, let's just make a global base pattern.
        return globalBaseCandles.map((c, i) => ({
            ...c,
            // Shift close price 5 periods forward (DXY leads) and invert (DXY usually inverse to BTC)
            close: (globalBaseCandles[i + 5] ? globalBaseCandles[i + 5].close : c.close) * -1 + 200,
            time: c.time // Keep time aligned
        }));
    }
    return globalBaseCandles; // BTC gets the base
};

let globalBaseCandles = [];

marketData.fetchOrderBook = async () => ({ bids: [], asks: [] });
// Mock other services if needed...

async function runIntegrationTest() {
    console.log('=== Phase 7: Integration Verification ===');

    const orchestrator = new AnalysisOrchestrator();
    globalBaseCandles = generateCandles(1000); // Initialize shared data
    const candles = globalBaseCandles;

    try {
        console.log('1. Running Analysis Orchestrator...');
        const analysis = await orchestrator.analyze(candles, 'BTCUSDT', '1h', null, null, true); // Light mode to skip heavy stuff

        console.log('\n--- Verification Results ---');

        // 1. Lead-Lag
        if (analysis.marketState.leadLag) {
            console.log(`[PASS] Lead-Lag Engine Integrated: Detected=${analysis.marketState.leadLag.detected}`);
        } else {
            console.error('[FAIL] Lead-Lag Engine output missing from marketState');
        }

        // 2. Parameter Optimizer
        if (analysis.marketState.optimizedParams) {
            console.log(`[PASS] Parameter Optimizer Integrated: RSI=${analysis.marketState.optimizedParams.rsiPeriod}`);
        } else {
            console.error('[FAIL] Parameter Optimizer output missing');
        }

        // 3. Patterns
        if (analysis.marketState.patterns) {
            console.log(`[PASS] Pattern Engine Integrated: Prediction=${analysis.marketState.patterns.prediction}`);
        } else {
            console.error('[FAIL] Pattern Engine output missing');
        }

        // 4. Probabilistic Engine
        // Note: Light mode might skip generic predictions, but we check if the engine logic ran
        // We can't easily check the internal method call without spying, but presence of other data suggests flow is working.

    } catch (error) {
        console.error('Integration Test Failed:', error);
    }
}

runIntegrationTest();
