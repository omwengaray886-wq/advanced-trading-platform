import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';
import { ExecutionEngine } from './src/services/ExecutionEngine.js';

// Mock Dependencies
const mockMarketState = {
    orderBook: {
        bids: [
            { price: 100, quantity: 5000 }, // BUY WALL @ 100
            { price: 99.9, quantity: 10 },
            { price: 99.8, quantity: 10 },
            { price: 99.7, quantity: 10 },
            { price: 99.6, quantity: 10 },
            { price: 99.5, quantity: 10 }
        ],
        asks: [
            { price: 101, quantity: 10 },
            { price: 101.1, quantity: 10 },
            { price: 101.2, quantity: 10 },
            { price: 101.3, quantity: 10 },
            { price: 101.4, quantity: 10 },
            { price: 101.5, quantity: 5000 } // SELL WALL @ 101.5
        ]
    },
    volatility: { level: 'HIGH' },
    atr: 2.5
};

const orchestrator = new AnalysisOrchestrator();

console.log("--- Verifying Full System (Long & Short) ---");

// 1. SCENARIO A: SHORT SCALP (High Volatility)
console.log("\n[A] SHORT SCALP SCENARIO");
console.log("Context: High Volatility, Sell Wall @ 101.50");
const shortRiskParams = {
    entry: { optimal: 101.50 }, // Trying to sell at wall
    stopLoss: 103.00,
    targets: [{ price: 95.00 }]
};

// Logic Test: Front-Running Sell Wall
orchestrator.refineLevelsWithLiquidity(shortRiskParams, mockMarketState, 'SHORT');
console.log("Adjusted Entry (Short):", shortRiskParams.entry.optimal);
// Expect: < 101.50 (e.g., 101.45). 
// Logic: nearestWall.price - tickSize.

// Logic Test: Order Type
const shortOrderType = ExecutionEngine.getOptimalOrderType({ level: 'HIGH' });
console.log("Order Type (High Vol):", shortOrderType);
// Expect: STOP_MARKET

// 2. SCENARIO B: LONG SWING (Low Volatility)
console.log("\n[B] LONG SWING SCENARIO");
console.log("Context: Low Volatility, Buy Wall @ 100.00");
const longRiskParams = {
    entry: { optimal: 100.00 }, // Trying to buy at wall
    stopLoss: 98.00,
    targets: [{ price: 110.00 }]
};

// Logic Test: Front-Running Buy Wall
orchestrator.refineLevelsWithLiquidity(longRiskParams, mockMarketState, 'LONG');
console.log("Adjusted Entry (Long):", longRiskParams.entry.optimal);
// Expect: > 100.00 (e.g., 100.05).
// Logic: nearestWall.price + tickSize.

// Logic Test: Order Type
const longOrderType = ExecutionEngine.getOptimalOrderType({ level: 'LOW' });
console.log("Order Type (Low Vol):", longOrderType);
// Expect: LIMIT

// 3. SCENARIO C: SPREAD CHECK
console.log("\n[C] SPREAD CHECK");
// ATR = 2.5. 10% = 0.25.
const tightSpread = ExecutionEngine.checkSpreadHealth(100, 100, 100.1, 2.5); // Spread 0.1
console.log("Tight Spread (0.1):", tightSpread.isSafe);

const wideSpread = ExecutionEngine.checkSpreadHealth(100, 100, 101.0, 2.5); // Spread 1.0 (40% of ATR)
console.log("Wide Spread (1.0):", wideSpread.isSafe);

if (shortRiskParams.entry.optimal < 101.50 &&
    longRiskParams.entry.optimal > 100.00 &&
    shortOrderType === 'STOP_MARKET' &&
    longOrderType === 'LIMIT' &&
    !wideSpread.isSafe) {
    console.log("\n✅ SUCCESS: All scenarios verified.");
} else {
    console.log("\n❌ FAILURE: Check logs.");
}
