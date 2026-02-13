import MultiTimeframeValidator from './src/services/MultiTimeframeValidator.js';
import { TradeManagementEngine } from './src/services/TradeManagementEngine.js';

// Mock Signal
const mockSignal = {
    symbol: 'BTCUSDT',
    direction: 'LONG',
    entry: 50000,
    stop: 49000, // Initial Stop
    trailingStop: null,
    managementUpdates: [],
    targets: [52000],
    expiration: Date.now() + 100000,
    status: 'ACTIVE'
};

// Mock Candles (Uptrending)
const mockCandles = [];
for (let i = 0; i < 50; i++) {
    mockCandles.push({
        open: 50000 + (i * 10),
        close: 50000 + (i * 10) + 5,
        high: 50000 + (i * 10) + 10,
        low: 50000 + (i * 10) - 5,
        volume: 1000
    });
}
// Last price is ~50500. Profit = 500. 
// ATR ~ 15. 2.5 ATR = 37.5. 
// Trailing Stop should be ~ 50500 - 37.5 = 50462.5
// Initial Stop is 49000. So it SHOULD update.

console.log("--- Testing Signal Management ---");
console.log("Initial Stop:", mockSignal.stop);

const currentPrice = mockCandles[mockCandles.length - 1].close;
console.log("Current Price:", currentPrice);

const updatedSignal = MultiTimeframeValidator.updateSignalStatus(mockSignal, currentPrice, mockCandles);

console.log("\n--- After Update ---");
console.log("New Trailing Stop:", updatedSignal.trailingStop);
console.log("Management Log:", updatedSignal.managementUpdates);

if (updatedSignal.trailingStop && updatedSignal.trailingStop > mockSignal.stop) {
    console.log("\n✅ SUCCESS: Trailing Stop moved up correctly.");
} else {
    console.log("\n❌ FAILURE: Trailing stop did not update.");
    console.log("Check ATR calculation or required distance.");
}
