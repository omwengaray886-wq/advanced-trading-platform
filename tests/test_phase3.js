import { AMDEngine } from '../src/services/AMDEngine.js';
import { PatternLearningEngine } from '../src/services/PatternLearningEngine.js';
import { AlphaLeakDetector } from '../src/services/AlphaLeakDetector.js';
import { alphaTracker } from '../src/services/AlphaTracker.js'; // Singleton

// Mock Data Generators
function generateCandles(count, pattern = 'RANDOM') {
    const candles = [];
    let price = 1000;

    for (let i = 0; i < count; i++) {
        let change = (Math.random() - 0.5) * 5;

        // Inject Patterns
        if (pattern === 'JUDAS' && i > count - 5) {
            // Fakeout: Sharp drop then reversal
            if (i === count - 3) change = -20; // Dump
            else if (i === count - 2) change = 5;  // Stabilize
            else if (i === count - 1) change = 25; // Reversal Pump
        }

        const close = price + change;
        const high = Math.max(price, close) + Math.random() * 2;
        const low = Math.min(price, close) - Math.random() * 2;

        candles.push({
            time: 1000 + i * 60,
            open: price,
            high,
            low,
            close,
            volume: 1000 + Math.random() * 500
        });
        price = close;
    }
    return candles;
}

async function testAMD() {
    console.log('--- Testing AMDEngine ---');
    const candles = generateCandles(60, 'JUDAS');
    // Mock Session Context
    const session = { session: 'LONDON', killzone: 'LONDON_OPEN' };

    const result = AMDEngine.detectCycle(candles, session);
    console.log('Cycle Detection Result:', result);

    if (result.phase !== 'UNKNOWN') console.log('✅ AMDEngine active');
    else console.error('❌ AMDEngine returned UNKNOWN');
}

async function testPatternLearning() {
    console.log('\n--- Testing PatternLearningEngine ---');
    const engine = new PatternLearningEngine();

    // Create a history with a recurring pattern
    // We'll duplicate a chunk of candles
    const base = generateCandles(50);
    const pattern = base.slice(0, 20); // The pattern to repeat

    // Construct history: [Pattern] ... random ... [Pattern (Current)]
    const history = [...pattern, ...generateCandles(50), ...pattern];

    const match = engine.findSimilarPatterns(history);
    console.log('Pattern Match Result:', match);

    if (match && match.matchCount > 0) console.log('✅ Pattern Engine found historical match');
    else console.error('❌ Pattern Engine failed to find duplicate pattern');
}

async function testAlphaLeak() {
    console.log('\n--- Testing AlphaLeakDetector ---');

    // 1. Simulate good performance
    alphaTracker.logTrade(new Date(), 'TestStrategy', 'WIN', 2.0);
    alphaTracker.logTrade(new Date(), 'TestStrategy', 'WIN', 2.0);

    let leaks = AlphaLeakDetector.detectLeaks('TRENDING');
    console.log('Leaks (Should be empty):', leaks);

    // 2. Simulate failure
    for (let i = 0; i < 6; i++) {
        alphaTracker.logTrade(new Date(), 'TestStrategy', 'LOSS', -1.0);
    }

    leaks = AlphaLeakDetector.detectLeaks('TRENDING');
    console.log('Leaks (After losses):', leaks);

    if (leaks.find(l => l.engine === 'TestStrategy')) console.log('✅ Leak Detected for TestStrategy');
    else console.error('❌ Leak Detection failed');
}

async function run() {
    await testAMD();
    await testPatternLearning();
    await testAlphaLeak();
}

run();
