import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';

async function testEntryAccuracy() {
    console.log("--- Testing Entry and Signal Accuracy ---");
    const orchestrator = new AnalysisOrchestrator();

    // Mock Candles for a clean Bullish Structural Breakout
    const candles = [];
    let price = 50000;
    for (let i = 0; i < 60; i++) {
        candles.push({
            open: price,
            close: price + 10,
            high: price + 20,
            low: price - 10,
            volume: 1500,
            time: Date.now() - (60 - i) * 3600000
        });
        price += 10;
    }
    // Last candle impulsive breakout
    candles.push({
        open: price,
        close: price + 100,
        high: price + 120,
        low: price - 10,
        volume: 5000,
        time: Date.now()
    });

    const symbol = 'BTCUSDT';

    // We mock some orderbook data to see if entries are refined using liquidity properly
    const mockDOMStore = {
        track: (sym) => { },
        getSnapshot: () => ({
            bids: [
                { price: price + 20, quantity: 5 }, // Minor support
                { price: price - 50, quantity: 200 } // Huge protective wall below current price
            ],
            asks: [
                { price: price + 200, quantity: 150 }, // Massive resistance wall above
                { price: price + 50, quantity: 2 }
            ]
        }),
        getStats: () => ({})
    };

    // Inject mock live orderbook store
    const { liveOrderBookStore } = await import('./src/services/LiveOrderBookStore.js');
    liveOrderBookStore.track = mockDOMStore.track;
    liveOrderBookStore.getSnapshot = mockDOMStore.getSnapshot;

    try {
        const analysis = await orchestrator.analyze(candles, symbol, '1h', null, null, false, 10000);

        if (!analysis.setups || analysis.setups.length === 0) {
            console.log("No setups generated. Cannot verify entries.");
            return;
        }

        console.log(`Generated ${analysis.setups.length} setups.`);
        analysis.setups.forEach((setup, i) => {
            console.log(`\nSetup ${i + 1}: ${setup.name} (${setup.direction})`);
            console.log(`Status: ${setup.isHighConfidence ? 'VALID' : 'INVALID'} (Score: ${setup.quantScore})`);

            if (setup.entryZone) {
                console.log(`Optimal Entry: ${setup.entryZone.optimal}`);
                if (setup.entryZone.top && setup.entryZone.bottom) {
                    console.log(`Entry Zone: ${setup.entryZone.bottom} - ${setup.entryZone.top}`);
                }
            } else {
                console.log(`Entry: MISSING`);
            }

            console.log(`Stop Loss: ${setup.stopLoss}`);

            if (setup.targets && setup.targets.length > 0) {
                setup.targets.forEach((t, idx) => {
                    console.log(`Target ${idx + 1}: ${t.price} (R:R ${t.riskReward ? t.riskReward.toFixed(2) : 'N/A'})`);
                });
            } else {
                console.log(`Targets: MISSING`);
            }

            console.log(`Logic Rationale:\n${setup.rationale}`);

            // Validate geometry constraints
            if (setup.direction === 'LONG') {
                if (setup.stopLoss >= setup.entryZone?.optimal) console.error("❌ Invalid Geometry: SL above Entry for LONG");
                if (setup.targets?.[0]?.price <= setup.entryZone?.optimal) console.error("❌ Invalid Geometry: TP below Entry for LONG");
            } else {
                if (setup.stopLoss <= setup.entryZone?.optimal) console.error("❌ Invalid Geometry: SL below Entry for SHORT");
                if (setup.targets?.[0]?.price >= setup.entryZone?.optimal) console.error("❌ Invalid Geometry: TP above Entry for SHORT");
            }
        });

    } catch (err) {
        console.error("Test failed:", err);
    }
}

testEntryAccuracy();
