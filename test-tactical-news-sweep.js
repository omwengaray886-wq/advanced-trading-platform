/**
 * Test to verify Tactical News Sweep detection
 */
import { EconomicEvent } from './src/models/EconomicEvent.js';
import { TacticalNewsEngine } from './src/services/TacticalNewsEngine.js';

async function runTest() {
    console.log("🚀 Starting Tactical News Sweep Test...");

    const engine = new TacticalNewsEngine();

    // 1. Setup Mock Fundamental Context (Tier 1 Imminent)
    const fundamentals = {
        proximityAnalysis: {
            event: new EconomicEvent({
                type: 'Non-Farm Payrolls',
                impact: 'HIGH',
                tier: 'TIER 1',
                timestamp: Date.now() / 1000 + 300 // 5 mins from now
            }),
            minutesToEvent: 5,
            isImminent: true
        },
        impact: {
            newsAdvice: 'BUY'
        }
    };

    // 2. Setup Mock Market State
    const marketState = {
        currentPrice: 2500,
        candles: [
            { open: 2480, high: 2490, low: 2475, close: 2485, time: Date.now() - 300000 },
            { open: 2485, high: 2495, low: 2482, close: 2490, time: Date.now() - 240000 },
            { open: 2490, high: 2500, low: 2488, close: 2495, time: Date.now() - 180000 },
            { open: 2495, high: 2505, low: 2490, close: 2500, time: Date.now() - 120000 },
            { open: 2500, high: 2520, low: 2495, close: 2505, time: Date.now() - 60000 } // Strong push up
        ],
        liquidityPools: [
            { price: 2508, type: 'STOP_POOL', label: 'Retail Stops' }
        ]
    };

    console.log("\n--- Testing Phase: WAITING_FOR_GRAB ---");
    const pendingSetup = engine.detectTacticalOpportunity(marketState, fundamentals);
    console.log("Setup Status:", pendingSetup?.status);
    console.log("Message:", pendingSetup?.message);

    if (pendingSetup?.status === 'WAITING_FOR_GRAB') {
        console.log("✅ Waiting for grab correctly identified");
    }

    // 3. Simulate Sweep Rejection (Fake-out Wick)
    // Candle opens high, spikes into pool (2525), then closes back down
    marketState.candles.push({
        open: 2505,
        high: 2530, // Swept 2525
        low: 2502,
        close: 2508, // Giant upper wick
        time: Date.now() + 60000
    });

    console.log("\n--- Testing Phase: SWEEP_CONFIRMED ---");
    const confirmedSetup = engine.detectTacticalOpportunity(marketState, fundamentals);
    console.log("Setup Status:", confirmedSetup?.status);
    console.log("Message:", confirmedSetup?.message);

    if (confirmedSetup?.status === 'SWEEP_CONFIRMED') {
        console.log("✅ Sweep confirmed correctly following wick detection");
    }

    console.log("\n🏁 Test complete.");
}

runTest().catch(console.error);
