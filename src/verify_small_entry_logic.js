import { TradeManagementEngine } from './services/TradeManagementEngine.js';

async function verifySmallAccountLogic() {
    console.log("🚀 Verifying Phase 75: Small Account Friendliness Logic...\n");

    const smallAccount = { equity: 100 };
    const largeAccount = { equity: 10000 };

    const tightSetup = {
        entryZone: { optimal: 1.0850 },
        stopLoss: 1.0845, // 0.05% stop
        targets: [{ price: 1.0865 }]
    };

    const looseSetup = {
        entryZone: { optimal: 1.0850 },
        stopLoss: 1.0750, // ~1% stop
        targets: [{ price: 1.1000 }]
    };

    console.log("--- Test 1: $100 Account + Tight SL (5 pips) ---");
    const test1 = TradeManagementEngine.calculateCapitalFriendliness(smallAccount, tightSetup);
    console.log(`Score: ${test1.score}/100`);
    console.log(`Label: ${test1.label}`);
    console.log(`Considerations: ${test1.considerations.join(', ')}`);
    if (test1.score > 80 && test1.label === 'Small Account Friendly') {
        console.log("✅ PASS: Correctly identified as friendly\n");
    } else {
        console.log("❌ FAIL: Expected high score and friendly label\n");
    }

    console.log("--- Test 2: $100 Account + Loose SL (100 pips) ---");
    const test2 = TradeManagementEngine.calculateCapitalFriendliness(smallAccount, looseSetup);
    console.log(`Score: ${test2.score}/100`);
    console.log(`Label: ${test2.label}`);
    if (test2.score < 50 && test2.label === 'High Capital Required') {
        console.log("✅ PASS: Correctly identified capital requirement\n");
    } else {
        console.log("❌ FAIL: Expected low score for wide SL\n");
    }

    console.log("--- Test 3: Standard Account ($10,000) ---");
    const test3 = TradeManagementEngine.calculateCapitalFriendliness(largeAccount, tightSetup);
    console.log(`Label: ${test3.label}`);
    if (test3.label === 'Institutional') {
        console.log("✅ PASS: Correctly identifies institutional size\n");
    } else {
        console.log("❌ FAIL: Large accounts should be labeled Institutional\n");
    }

    // Dynamic Risk Warning Check
    console.log("--- Test 4: Dynamic Risk Warning for $100 Account ---");
    const riskResult = TradeManagementEngine.calculateDynamicRisk(
        { equity: 100, riskPerTrade: 0.01 },
        1.0850,
        1.0848, // 2 pip stop
        { confidence: 1.0 }
    );
    console.log(`Risk Amount: $${riskResult.riskAmount}`);
    console.log(`Calculated Units: ${riskResult.units.toFixed(4)}`);
    console.log(`Warning: ${riskResult.warning}`);

    if (riskResult.warning && riskResult.warning.includes('Position too small')) {
        console.log("✅ PASS: Correctly warned about microlot limitations\n");
    } else {
        console.log("❌ FAIL: Expected microlot warning for ultra-tight SL on $100 account\n");
    }
}

verifySmallAccountLogic().catch(e => console.error(e));
