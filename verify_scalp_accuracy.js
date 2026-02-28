import { ScalperEngine } from './src/strategies/modules/ScalperEngine.js';
import { OptimalTradeEntry } from './src/strategies/modules/OptimalTradeEntry.js';
import { SmartMoneyConcepts } from './src/analysis/smartMoneyConcepts.js';
import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';

function runScalperTests() {
    console.log("--- Testing Scalping Entry Accuracy ---");

    // 1. Wall Front Run (Long)
    const currentPrice = 50000;
    const bidWallPrice = 49950; // Within 0.2% of 50000

    console.log("\\n1. OrderBook Wall Front-Run (LONG)");
    const maps = [
        { side: 'BID', price: bidWallPrice, volume: 1000, intensity: 0.9 }, // High intensity wall
        { side: 'ASK', price: 50200, volume: 100, intensity: 0.2 }
    ];

    // Mock the imbalance to heavily favor LONG to pass the engine's check
    ScalperEngine.calculateImbalance = () => ({ direction: 'LONG', ratio: 5.0 });

    const marketState = {
        currentTrend: 'BULLISH',
        amdCycle: { phase: 'MARKUP' }
    };

    const scalpSetup = ScalperEngine.analyze(maps, currentPrice, marketState);
    if (scalpSetup) {
        console.log(`Direction: ${scalpSetup.direction}`);
        console.log(`Current Price: ${currentPrice}`);
        console.log(`Wall Price: ${bidWallPrice}`);
        console.log(`Entry: ${scalpSetup.entry} (+0.01% of Wall = ${bidWallPrice * 1.0001})`);
        console.log(`Stop Loss: ${scalpSetup.stopLoss} (-0.1% of Wall = ${bidWallPrice * 0.999})`);
        console.log(`Target: ${scalpSetup.target} (+0.5% of Current = ${currentPrice * 1.005})`);

        // Geometry constraints
        if (scalpSetup.stopLoss >= scalpSetup.entry) console.error("❌ Invalid Geometry: SL above Entry");
        if (scalpSetup.target <= scalpSetup.entry) console.error("❌ Invalid Geometry: TP below Entry");
    } else {
        console.log("No scalp setup generated.");
    }

    // 2. Liquidity Sweep Reversal (Long)
    console.log("\\n2. Liquidity Sweep Reversal (LONG)");
    const sweepState = {
        liquiditySweep: {
            type: 'SELL_SIDE', // Sell side swept -> Bullish reversal
            sweptLevel: 49800,
            timestamp: Date.now() / 1000 - 60 // 1 minute ago
        }
    };
    const sweepPrice = 49850; // Price rebounded above swept level
    const sweepSetup = ScalperEngine.analyze(null, sweepPrice, sweepState);
    if (sweepSetup) {
        console.log(`Direction: ${sweepSetup.direction}`);
        console.log(`Swept Level: ${sweepState.liquiditySweep.sweptLevel}`);
        console.log(`Current Price (Entry): ${sweepSetup.entry}`);
        console.log(`Stop Loss: ${sweepSetup.stopLoss} (Below Wick)`);
        console.log(`Target: ${sweepSetup.target} (2:1 Projection)`);

        // Geometry constraints
        if (sweepSetup.stopLoss >= sweepSetup.entry) console.error("❌ Invalid Geometry: SL above Entry");
        if (sweepSetup.target <= sweepSetup.entry) console.error("❌ Invalid Geometry: TP below Entry");
    }
}

async function runOverallLongTests() {
    console.log("\\n--- Testing General LONG Position Accuracy ---");
    const orchestrator = new AnalysisOrchestrator();

    // Bullish Trend Candles
    const candles = [];
    let price = 40000;
    for (let i = 0; i < 60; i++) {
        candles.push({
            open: price,
            close: price + 50,
            high: price + 100,
            low: price - 20,
            volume: 2000,
            time: Date.now() - (60 - i) * 3600000
        });
        price += 50;
    }

    // Create a pullback
    price -= 200;
    candles.push({
        open: price + 200,
        close: price,
        high: price + 210,
        low: price - 50,
        volume: 3000,
        time: Date.now()
    });

    try {
        const analysis = await orchestrator.analyze(candles, 'BTCUSDT', '1h', null, null, true, 10000);
        const longs = analysis.setups?.filter(s => s.direction === 'LONG') || [];

        console.log(`Found ${longs.length} LONG setups in general analysis.`);
        longs.forEach((setup, i) => {
            console.log(`\\nLONG Setup ${i + 1}: ${setup.name}`);
            console.log(`Entry Optimal: ${setup.entryZone?.optimal}`);
            console.log(`Stop Loss: ${setup.stopLoss}`);
            if (setup.targets && setup.targets.length > 0) {
                console.log(`Primary Target: ${setup.targets[0].price}`);
            }

            // Check Geometry universally logic uses _verifyTargetGeometry
            if (setup.stopLoss >= setup.entryZone?.optimal) console.error("❌ Invalid Geometry: SL above Entry");
            if (setup.targets?.[0]?.price <= setup.entryZone?.optimal) console.error("❌ Invalid Geometry: TP below Entry");
            else console.log("✅ Geometry Valid");
        });
    } catch (e) {
        console.error(e);
    }
}

async function runAll() {
    runScalperTests();
    await runOverallLongTests();
}

runAll();
