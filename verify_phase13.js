import { signalManager } from './src/services/SignalManager.js';

async function testPhase13() {
    console.log("--- Phase 13: Signal Management Verification ---");

    const symbol = "BTC/USDT";
    const setup = {
        direction: "BULLISH",
        entry: 50000,
        stopLoss: 49500,
        targets: [
            { price: 51000, label: "TP1" },
            { price: 52000, label: "TP2" }
        ]
    };

    console.log("\n1. Tracking new signal...");
    const id = signalManager.trackSignal(symbol, setup);
    let active = signalManager.getActiveSignals();
    console.log(`Active signals: ${active.length}`);
    if (active.length !== 1 || active[0].status !== 'PENDING') {
        throw new Error("Signal tracking failed");
    }

    console.log("\n2. Simulating price update (No trigger)...");
    signalManager.updateMarketPrice(symbol, 49900);
    if (active[0].status !== 'PENDING') throw new Error("Signal triggered prematurely");

    console.log("\n3. Simulating activation (Price hit 50000)...");
    signalManager.updateMarketPrice(symbol, 50000);
    if (active[0].status !== 'ACTIVE') throw new Error("Signal activation failed");

    console.log("\n4. Verifying PnL (Price hit 50500)...");
    signalManager.updateMarketPrice(symbol, 50500);
    if (active[0].pnl !== 500) throw new Error(`PnL calculation failed: Expected 500, got ${active[0].pnl}`);

    console.log("\n5. Verifying Target Hit (Price hit 51000)...");
    signalManager.updateMarketPrice(symbol, 51100);
    if (!active[0].targets[0].reached) throw new Error("Target hit detection failed");
    console.log(`Latest Update: ${active[0].updates[active[0].updates.length - 1].msg}`);

    console.log("\n6. Simulating Stop Loss hit (Price crash to 49400)...");
    signalManager.updateMarketPrice(symbol, 49400);
    if (active[0] && active[0].status === 'ACTIVE') throw new Error("Stop loss detection failed");

    const stats = signalManager.getStats();
    console.log(`\nCompleted Signals: ${stats.total}`);
    console.log(`Last Outcome: ${stats.completed[0].status} via ${stats.completed[0].outcome}`);

    console.log("\n--- VERIFICATION SUCCESSFUL ---");
}

testPhase13().catch(err => {
    console.error("\n--- VERIFICATION FAILED ---");
    console.error(err);
    process.exit(1);
});
