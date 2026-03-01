// verify_network_stability.js
import { liveOrderBookStore } from './src/services/LiveOrderBookStore.js';
import { marketData } from './src/services/marketData.js';
import { generateTradeAnalysis } from './src/services/ai.js';

async function testNetworkStability() {
    console.log('--- Phase 1: LiveOrderBookStore Multi-Symbol Test ---');
    liveOrderBookStore.track('BTCUSDT');
    liveOrderBookStore.track('ETHUSDT');

    console.log('Subscriptions size:', liveOrderBookStore.subscriptions.size);
    if (liveOrderBookStore.subscriptions.size === 2) {
        console.log('✅ Multi-symbol tracking working.');
    } else {
        console.error('❌ Multi-symbol tracking failed.');
    }

    console.log('\n--- Phase 2: marketData fetchOrderBook Throttling Test ---');
    // Mock fetch or just test the logic (since we are in Node, BINANCE_REST_BASE is absolute)
    const p1 = marketData.fetchOrderBook('BTCUSDT');
    const p2 = marketData.fetchOrderBook('BTCUSDT'); // Should be deduplicated

    console.log('Concurrent requests for same symbol...');
    const [r1, r2] = await Promise.all([p1, p2]);

    // In our implementation, p2 should return the SAME promise as p1
    if (p1 === p2) {
        console.log('✅ Request deduplication working (p1 === p2).');
    } else {
        console.error('❌ Request deduplication failed.');
    }

    console.log('\n--- Phase 3: ai.js isLight Mode Test ---');
    const mockCandles = new Array(100).fill({ time: 0, open: 100, high: 105, low: 95, close: 102 });

    console.log('Calling generateTradeAnalysis with isLight=true...');
    // We can't easily mock the internal Orchestrator in this script without a lot of setup,
    // but we can check if it returns "isPartial: true" (which it should for light mode)
    try {
        const result = await generateTradeAnalysis(mockCandles, 'BTCUSDT', '1h', null, 'ADVANCED', null, 10000, true);
        console.log('Analysis isPartial:', result.isPartial);
        if (result.isPartial) {
            console.log('✅ Light mode returned partial results as expected.');
        } else {
            console.error('❌ Light mode returned full results? Check logic.');
        }
    } catch (e) {
        console.error('Analysis failed:', e.message);
    }

    console.log('\n--- Cleanup ---');
    liveOrderBookStore.stop();
    process.exit(0);
}

testNetworkStability();
