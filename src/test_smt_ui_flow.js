
// Set Mock Env Vars for Node.js Context
process.env.VITE_FIREBASE_API_KEY = 'mock_key';
process.env.VITE_FIREBASE_AUTH_DOMAIN = 'mock_domain';
process.env.VITE_FIREBASE_PROJECT_ID = 'mock_project';
process.env.VITE_FIREBASE_APP_ID = 'mock_app_id';

import { marketData } from './services/marketData.js';
import { AnalysisOrchestrator } from './services/analysisOrchestrator.js'; // Corrected casing


// Mock Data Generator
function generateCandles(basePrice, pattern) {
    const candles = [];
    const now = Math.floor(Date.now() / 1000);

    for (let i = 0; i < 100; i++) {
        let price = basePrice;
        let time = now - (100 - i) * 3600;

        // Default flat movement
        price = basePrice;

        // Apply distinct swings with clear clearance
        if (i === 80) price = pattern.high1;
        else if (i === 90) price = pattern.high2;

        // Ensure fractal clearance (lower neighbors for 5 bars each side)
        else if (Math.abs(i - 80) <= 5 || Math.abs(i - 90) <= 5 || i > 90) {
            price = basePrice * 0.95;
        } else {
            price = basePrice * (0.98 + Math.random() * 0.04); // Low noise elsewhere
        }

        candles.push({
            time,
            open: price,
            high: price, // simple OHLC
            low: price * 0.99,
            close: price
        });
    }
    return candles;
}

// Mock API
marketData.fetchHistory = async (symbol, interval, limit) => {
    console.log(`[MOCK] Fetching history for ${symbol}`);
    if (symbol.includes('BTC')) {
        // BTC: Higher High (Bearish Reversal Setup if divergence)
        return generateCandles(50000, { high1: 50000, high2: 51000 });
    } else if (symbol.includes('ETH')) {
        // ETH: Lower High (Divergence!)
        return generateCandles(3000, { high1: 3000, high2: 2900 });
    } else {
        // Others: Correlated with BTC
        return generateCandles(100, { high1: 100, high2: 102 });
    }
};

marketData.fetchOrderBook = async () => ({ bids: [], asks: [] });

async function runTest() {
    console.log('Starting SMT UI Integration Test...');
    const orchestrator = new AnalysisOrchestrator();

    // Get Main Candles
    const btcCandles = await marketData.fetchHistory('BTCUSDT', '1h', 100);

    // Run Analysis
    try {
        const result = await orchestrator.analyze(btcCandles, 'BTCUSDT', '1h');

        console.log('Analysis Complete.');

        // 0. Check Swing Points
        console.log(`Swing Points Detected: ${result.swingPoints ? result.swingPoints.length : 0}`);
        if (result.swingPoints) {
            console.log('Swings:', result.swingPoints.map(s => ({ time: s.time, price: s.price, type: s.type })));
        }

        // 1. Check Market State for Divergences
        const divergences = result.marketState.divergences;
        console.log(`Divergences Found: ${divergences ? divergences.length : 0}`);

        if (divergences && divergences.length > 0) {
            console.log('Divergence Detail:', divergences[0].text);
        } else {
            console.error('FAIL: No divergence detected in MarketState.');
        }

        // 2. Check Global Annotations
        const annotations = result.annotations;
        const divAnnotation = annotations.find(a => a.type === 'DIVERGENCE');

        if (divAnnotation) {
            console.log('SUCCESS: Divergence found in Global Annotations.');
            console.log('Annotation:', divAnnotation);
        } else {
            console.error('FAIL: Divergence NOT pipelined to Global Annotations.');
        }

    } catch (error) {
        console.error('Analysis Failed:', error);
    }
}

runTest();
