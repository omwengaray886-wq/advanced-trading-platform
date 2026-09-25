import { gsRefiner } from './services/GSRefiner.js';

async function verifyGSRLearning() {
    console.log('--- GSR Learning Verification ---');

    const symbol = 'BTCUSDT';

    // 1. Initial State
    console.log('1. Checking initial state...');
    const initial = gsRefiner.analyzeCompatibility(symbol, []);
    console.log('Initial Rating:', initial.rating);

    // 2. Mock a Winning Signature
    console.log('2. Recording a "Winner" DNA...');
    const winningCandles = [
        { open: 100, high: 150, low: 90, close: 140 }, // Big bullish candle
        { open: 140, high: 145, low: 135, close: 142 },
        { open: 142, high: 160, low: 140, close: 155 },
        { open: 155, high: 158, low: 150, close: 157 },
        { open: 157, high: 200, low: 155, close: 195 }  // Another big one
    ];
    await gsRefiner.recordSuccess(symbol, winningCandles);

    // 3. Match against identical pattern
    console.log('3. Matching against identical pattern...');
    const match = gsRefiner.analyzeCompatibility(symbol, winningCandles);
    console.log('Match Rating:', match.rating, `(${match.compatibility * 100}%)`);

    // 4. Match against opposite pattern
    console.log('4. Matching against opposite pattern...');
    const losingCandles = winningCandles.map(c => ({
        open: c.high,
        high: c.high,
        low: c.low,
        close: c.low
    }));
    const mismatch = gsRefiner.analyzeCompatibility(symbol, losingCandles);
    console.log('Mismatch Rating:', mismatch.rating, `(${mismatch.compatibility * 100}%)`);

    if (match.compatibility > 0.8 && mismatch.compatibility < 0.5) {
        console.log('\n--- SUCCESS: GSR learning and discrimination verified ---');
    } else {
        console.log('\n--- FAILURE: GSR logic inconsistent ---');
    }
}

verifyGSRLearning();
