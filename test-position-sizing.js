import { TradeManagementEngine } from './src/services/TradeManagementEngine.js';

console.log("--- Testing Dynamic Position Sizing ---\n");

const testAccount = { equity: 10000, riskPerTrade: 0.01 }; // $10k, 1% base risk

// SCENARIO A: HIGH CONVICTION + LOW VOLATILITY
console.log("[A] HIGH CONVICTION + LOW VOLATILITY");
const highConviction = TradeManagementEngine.calculateDynamicRisk(
    testAccount,
    100,  // Entry
    95,   // Stop (-5% distance)
    { confidence: 0.95, volatility: 1.0, eventRisk: null }
);
console.log(`Risk %: ${(highConviction.riskPercent * 100).toFixed(2)}%`);
console.log(`Units: ${highConviction.units.toFixed(2)}`);
console.log(`Expected: ~1.9% (0.95 * 1% * 2x confidence scaling)`);

// SCENARIO B: LOW CONVICTION + HIGH VOLATILITY
console.log("\n[B] LOW CONVICTION + HIGH VOLATILITY");
const lowConviction = TradeManagementEngine.calculateDynamicRisk(
    testAccount,
    100,
    95,
    { confidence: 0.6, volatility: 2.5, eventRisk: null }
);
console.log(`Risk %: ${(lowConviction.riskPercent * 100).toFixed(2)}%`);
console.log(`Units: ${lowConviction.units.toFixed(2)}`);
console.log(`Expected: ~0.42% (0.6 * 1% * 0.7 vol penalty)`);

// SCENARIO C: EVENT RISK PENALTY
console.log("\n[C] HIGH CONVICTION + EVENT RISK");
const eventRisk = TradeManagementEngine.calculateDynamicRisk(
    testAccount,
    100,
    95,
    {
        confidence: 1.0,
        volatility: 1.0,
        eventRisk: { score: 80, closestEvent: { title: 'FOMC Meeting' } }
    }
);
console.log(`Risk %: ${(eventRisk.riskPercent * 100).toFixed(2)}%`);
console.log(`Warning: ${eventRisk.warning}`);
console.log(`Expected: Significant reduction due to event risk`);


// VERIFICATION
const pass1 = highConviction.riskPercent > 0.009; // Should be at least 0.9% (0.95 * 1%)
const pass2 = lowConviction.riskPercent < 0.005; // Should be below 0.5% due to vol penalty
const pass3 = eventRisk.warning && eventRisk.warning.includes('Event Risk');

console.log(`\nTest Results:`);
console.log(`Pass 1 (High Conviction): ${pass1} (${(highConviction.riskPercent * 100).toFixed(2)}% > 0.9%)`);
console.log(`Pass 2 (Low Conv + Vol): ${pass2} (${(lowConviction.riskPercent * 100).toFixed(2)}% < 0.5%)`);
console.log(`Pass 3 (Event Warning): ${pass3}`);

if (pass1 && pass2 && pass3) {
    console.log("\n✅ SUCCESS: Dynamic sizing works correctly.");
} else {
    console.log("\n❌ FAILURE: Risk scaling issues detected.");
}
