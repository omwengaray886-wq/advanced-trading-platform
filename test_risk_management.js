import { TradeManagementEngine } from './src/services/TradeManagementEngine.js';

function testRiskManagement() {
    console.log("--- Trade Management Engine: Risk Verification ---");

    const account = { equity: 10000, riskPerTrade: 0.01 }; // $100 risk
    const entryPrice = 50000;
    const stopLoss = 49500; // 500 point stop

    console.log("\n1. Standard Risk Calculation (1%)");
    const result1 = TradeManagementEngine.calculateDynamicRisk(account, entryPrice, stopLoss, {});
    console.log(`Risk Amount: $${result1.riskAmount}, Units: ${result1.units}`);
    if (Math.round(result1.riskAmount) !== 100) throw new Error("Base risk calculation failed");
    if (result1.units !== 0.2) throw new Error("Unit calculation failed");

    console.log("\n2. High Confidence Scaling (1.2x)");
    const result2 = TradeManagementEngine.calculateDynamicRisk(account, entryPrice, stopLoss, { confidence: 1.2 });
    console.log(`Scaled Risk: $${result2.riskAmount}`);
    if (Math.round(result2.riskAmount) !== 120) throw new Error("Confidence scaling failed");

    console.log("\n3. High Volatility Penalty (30% reduction)");
    const result3 = TradeManagementEngine.calculateDynamicRisk(account, entryPrice, stopLoss, { volatility: 2.5 });
    console.log(`Vol Adjusted Risk: $${result3.riskAmount}`);
    if (Math.round(result3.riskAmount) !== 70) throw new Error("Volatility adjustment failed");

    console.log("\n4. Event Risk Penalty (50% reduction max)");
    const result4 = TradeManagementEngine.calculateDynamicRisk(account, entryPrice, stopLoss, {
        eventRisk: { score: 100, closestEvent: { title: "FOMC" } }
    });
    console.log(`Event Adjusted Risk: $${result4.riskAmount}`);
    console.log(`Warning: ${result4.warning}`);
    if (Math.round(result4.riskAmount) !== 50) throw new Error("Event risk penalty failed");

    console.log("\n5. ATR Trailing Stop Advice");
    const candles = [
        { close: 50000, high: 50100, low: 49900, volume: 100 },
        { close: 50200, high: 50300, low: 50100, volume: 100 },
        { close: 50400, high: 50500, low: 50300, volume: 100 },
        { close: 50600, high: 50700, low: 50500, volume: 100 },
        { close: 50800, high: 50900, low: 50700, volume: 100 }
    ];
    // Fill up to 20 candles for ATR
    for (let i = 0; i < 25; i++) candles.unshift({ close: 50000, high: 50100, low: 49900, volume: 100 });

    const advice = TradeManagementEngine.getTrailingStopAdvice(candles, 'LONG', 49500);
    console.log(`New Stop Advice: ${advice.price} (${advice.type})`);
    if (advice.price <= 49500) throw new Error("Trailing stop should have moved up");

    console.log("\n6. Partial TP Detection (Momentum Exhaustion)");
    const climaxCandle = { close: 52000, open: 51000, high: 52500, low: 50900, volume: 1000 }; // Huge vol, long upper wick
    const climaxCandles = [...candles, climaxCandle];
    const tpAdvice = TradeManagementEngine.checkPartialTP(climaxCandles, 'LONG', 50000);
    console.log(`TP Advice: ${tpAdvice?.trigger ? 'YES' : 'NO'} (${tpAdvice?.reason})`);
    if (!tpAdvice?.trigger) throw new Error("Partial TP should have triggered on climax");

    console.log("\n--- RISK VERIFICATION SUCCESSFUL ---");
}

try {
    testRiskManagement();
} catch (err) {
    console.error("\n--- RISK VERIFICATION FAILED ---");
    console.error(err);
    process.exit(1);
}
