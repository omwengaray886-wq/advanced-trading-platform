
import { AnalysisOrchestrator } from './services/analysisOrchestrator.js';
import { marketData } from './services/marketData.js';

// Mock Environment
process.env.VITE_FIREBASE_API_KEY = 'mock';

// Generate 5m Candles (Consolidation)
function generateCandles() {
    const candles = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 60; i++) {
        candles.push({
            time: now - (60 - i) * 300,
            open: 50000,
            high: 50050,
            low: 49950,
            close: 50000
        });
    }
    return candles;
}

// Mock API
marketData.fetchOrderBook = async (symbol) => {
    console.log('[MOCK] Fetching Order Book for', symbol);
    return {
        // Massive Sell Wall at 50100 (Current 50000) -> Short Setup?
        // Wait, ScalperEngine looks for Liquidity Maps.
        // Wall Front Run:
        // Short Setup: Front-run an ASK Wall (Resistance)
        // Ask Wall > CurrentPrice.
        asks: [
            { price: 50010, quantity: 1 },
            { price: 50020, quantity: 1 },
            { price: 50050, quantity: 500 } // WALL at 50050 (0.1% away)
        ],
        bids: [
            { price: 49990, quantity: 1 }
        ]
    };
};

marketData.fetchHistory = async () => generateCandles();

async function run() {
    console.log("Starting Scalper Integration Test...");
    const orchestrator = new AnalysisOrchestrator();

    // Analyze on 5m timeframe
    const result = await orchestrator.analyze(generateCandles(), 'BTCUSDT', '5m');

    console.log("Analysis Complete.");
    console.log("Setups:", result.setups.length);

    const scalperSetup = result.setups.find(s => s.strategy === 'SCALPER_ENGINE');

    if (scalperSetup) {
        console.log("SUCCESS: Scalper Setup Detected!");
        console.log("Direction:", scalperSetup.direction);
        console.log("Rationale:", scalperSetup.rationale);
    } else {
        console.error("FAIL: No Scalper Setup detected.");
        // Debug: check liquidity map
        if (result.marketState.orderBook) {
            console.log("OrderBook was present.");
        } else {
            console.log("OrderBook Missing.");
        }
        console.log("Liquidity Map size:", result.liquidityMap ? result.liquidityMap.length : 0);
    }
}

run();
