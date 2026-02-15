
import { SmartExecutionRouter } from './services/SmartExecutionRouter.js';
import { IcebergSlicer, LimitChaser } from './services/ExecutionAlgorithms.js';

function runExecutionTests() {
    console.log('=== Phase 8: Smart Execution Logic Verification ===');
    const router = new SmartExecutionRouter();

    // Mock Market State
    const marketState = {
        currentPrice: 50000,
        spread: 10, // $10 spread (0.02%)
        volatility: { state: 'NORMAL' },
        depth: {
            asks: [
                { price: 50005, quantity: 1.0 },
                { price: 50010, quantity: 2.0 },
                { price: 50050, quantity: 5.0 } // Thin book
            ],
            bids: [
                { price: 49995, quantity: 1.0 }
            ]
        }
    };

    // Test 1: Standard Urgency, Liquid Market
    console.log('\n--- Test 1: High Urgency, Tight Spread ---');
    const order1 = { side: 'BUY', size: 0.5, urgency: 'HIGH' };
    const res1 = router.route(order1, marketState);
    console.log(`Decision: ${res1.type}`);
    console.log(`Reason: ${res1.reason.join(' | ')}`);
    if (res1.type === 'MARKET') console.log('[PASS]'); else console.error('[FAIL] Expected MARKET');

    // Test 2: Whale Order (Iceberg Trigger)
    console.log('\n--- Test 2: Whale Size ($250k) ---');
    const order2 = { side: 'BUY', size: 5.0, urgency: 'MEDIUM' }; // 5 BTC * 50k = 250k
    const res2 = router.route(order2, marketState);
    console.log(`Decision: ${res2.type}`);
    if (res2.type === 'ICEBERG') console.log('[PASS]'); else console.error('[FAIL] Expected ICEBERG');

    // Test 3: High Urgency, High Slippage Potential
    console.log('\n--- Test 3: Slippage Protection ---');
    // Asking for 10 BTC, but book only has ~8 BTC visible
    const order3 = { side: 'BUY', size: 10.0, urgency: 'HIGH' };
    const res3 = router.route(order3, marketState);
    console.log(`Decision: ${res3.type}`);
    console.log(`Reason: ${res3.reason.join(' | ')}`);
    // Should downgrade to LIMIT because MARKET would slip too much
    if (res3.type.includes('LIMIT')) console.log('[PASS]'); else console.error('[FAIL] Expected LIMIT fallback');

    // Test 4: TWAP
    console.log('\n--- Test 4: TWAP Trigger ($600k) ---');
    const order4 = { side: 'BUY', size: 12.0, urgency: 'LOW' }; // 600k
    const res4 = router.route(order4, marketState);
    console.log(`Decision: ${res4.type}`);
    if (res4.type === 'TWAP') console.log('[PASS]'); else console.error('[FAIL] Expected TWAP');

    // Test 5: Iceberg Slicer
    console.log('\n--- Test 5: Iceberg Slicing ---');
    const totalSize = 10.0;
    const visible = 1.0;
    const slices = IcebergSlicer.generateSlices(totalSize, visible);
    const sum = slices.reduce((a, b) => a + b, 0);
    console.log(`Slices: ${slices.length}`);
    console.log(`Total Sum: ${sum.toFixed(4)}`);
    if (Math.abs(sum - totalSize) < 0.0001) console.log('[PASS]'); else console.error(`[FAIL] Sum ${sum} != ${totalSize}`);

    // Test 6: Limit Chaser
    console.log('\n--- Test 6: Limit Chaser ---');
    // Buy Order at 50,000. Price moves to 50,010. Max Chase 50,020.
    const newPrice = LimitChaser.calculateChasePrice('BUY', 50000, 50010, { maxChasePrice: 50020 });
    console.log(`Old Price: 50000 -> New Price: ${newPrice}`);
    if (newPrice === 50010) console.log('[PASS]'); else console.error(`[FAIL] Expected 50010, got ${newPrice}`);

    // Test 7: Limit Chaser Cap
    console.log('\n--- Test 7: Limit Chaser Cap ---');
    // Buy Order at 50,000. Price moves to 50,030. Max Chase 50,020.
    const cappedPrice = LimitChaser.calculateChasePrice('BUY', 50000, 50030, { maxChasePrice: 50020 });
    console.log(`Old Price: 50000 -> Move to 50030? -> Result: ${cappedPrice}`);
    if (cappedPrice === 50000) console.log('[PASS]'); else console.error(`[FAIL] Expected 50000 (Hold), got ${cappedPrice}`);
}

runExecutionTests();
