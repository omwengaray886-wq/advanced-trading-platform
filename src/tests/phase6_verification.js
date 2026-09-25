import { PredictionTracker } from '../services/predictionTracker.js';
import { bayesianEngine } from '../services/BayesianInferenceEngine.js';
import { VolatilityEngine } from '../services/VolatilityEngine.js';
import { OrderFlowAnalyzer } from '../services/OrderFlowAnalyzer.js';

async function verifyPhase6() {
    console.log('--- Phase 6: Institutional Depth Verification ---');

    const symbol = 'BTC/USDT';
    const mockCandles = Array.from({ length: 50 }, (_, i) => ({
        time: 1700000000 + (i * 900),
        open: 50000,
        high: 50100,
        low: 49900,
        close: 50050,
        volume: 1000
    }));

    // 1. Verify Bayesian Stability (Stale-While-Revalidate)
    console.log('\n1. Testing Bayesian Stability...');
    const start = Date.now();
    // First call might be slow if cache empty, but second call should be <= 1ms
    await PredictionTracker.getStats(symbol).catch(() => { });
    const secondStart = Date.now();
    const stats = await PredictionTracker.getStats(symbol);
    const duration = Date.now() - secondStart;

    console.log(`- Bayesian stats fetch (cached): ${duration}ms`);
    if (duration < 5) {
        console.log('✅ PASS: Immediate response from cache.');
    } else {
        console.log('⚠️ WARNING: Response slower than expected.');
    }

    // 2. Verify Volatility Corridors
    console.log('\n2. Testing Volatility Corridors...');
    const vol = VolatilityEngine.calculateVolatilityCorridor(mockCandles, '15m', 50000);
    console.log(`- Volatility Regime: ${vol.regime}`);
    console.log(`- Expected Move: ${vol.expectedMove}`);
    console.log(`- Corridor: ${vol.corridor.lower.toFixed(2)} - ${vol.corridor.upper.toFixed(2)}`);

    if (vol.corridor.upper > 50000 && vol.corridor.lower < 50000) {
        console.log('✅ PASS: Volatility corridor generated correctly.');
    } else {
        console.log('❌ FAIL: Invalid volatility corridor.');
    }

    // 3. Verify Dark Pool Detection
    console.log('\n3. Testing Dark Pool Proxy...');
    const darkPoolCandles = [...mockCandles];
    darkPoolCandles[darkPoolCandles.length - 1] = {
        ...darkPoolCandles[darkPoolCandles.length - 1],
        volume: 10000, // 10x avg
        high: 50001,
        low: 49999, // Tiny range
        close: 50000
    };

    const darkPool = OrderFlowAnalyzer.detectDarkPool(darkPoolCandles);
    if (darkPool) {
        console.log(`- Dark Pool detected: ${darkPool.type} at ${darkPool.price}`);
        console.log(`- Intensity: ${darkPool.intensity}x`);
        console.log('✅ PASS: Dark Pool signature identified.');
    } else {
        console.log('❌ FAIL: Dark Pool signature missed.');
    }

    console.log('\n--- Verification Complete ---');
}

verifyPhase6();
