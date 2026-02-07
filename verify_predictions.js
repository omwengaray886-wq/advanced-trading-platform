
import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';

const orchestrator = new AnalysisOrchestrator();

function generateCandles(count, type = 'RANGING') {
    let price = 20000;
    const candles = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < count; i++) {
        let move = 0;
        if (type === 'RANGING') move = (Math.random() - 0.5) * 10;
        if (type === 'BULLISH') move = (Math.random() * 20) - 5; // Net positive drift

        price += move;
        candles.push({
            time: now - ((count - i) * 3600),
            open: price - 5,
            high: price + 10,
            low: price - 10,
            close: price,
            volume: 5000 + Math.random() * 1000
        });
    }
    return candles;
}

async function testProtection() {
    console.log("\n--- TEST: Ranging Market (Expect NO_EDGE) ---");
    const candles = generateCandles(100, 'RANGING');

    // We mock the internals or just rely on pure math
    // Since we can't easily create perfect patterns programmatically, 
    // we expect the lack of structure to result in NO OBLIGATION and NO EDGE.

    try {
        const result = await orchestrator.analyze(candles, 'BTCUSDT', '1h', null, null, true);

        console.log(`Prediction Bias: ${result.prediction.bias}`);
        console.log(`Obligation State: ${result.marketState.obligations?.state}`);
        console.log(`Confidence: ${result.prediction.confidence}`);

        if (result.prediction.bias === 'NO_EDGE' && result.marketState.obligations?.state === 'FREE_ROAMING') {
            console.log("✅ PASS: Correctly suppressed prediction for random walk.");
        } else {
            console.log("❌ FAIL: Generated prediction without edge.");
        }

    } catch (e) {
        console.error("Test Error:", e);
    }
}

testProtection();
