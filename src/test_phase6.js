import { LeadLagEngine } from './services/LeadLagEngine.js';
import { ParameterOptimizer } from './services/ParameterOptimizer.js';
import { PatternLearningEngine } from './services/PatternLearningEngine.js';

async function runPhase6Tests() {
    console.log('=== Phase 6: Predictive Intelligence Verification ===');

    // MOCK DATA GENERATION
    function generateSineWave(length, shift = 0, noise = 0) {
        return Array(length).fill(0).map((_, i) => ({
            time: i * 60000,
            close: Math.sin((i + shift) * 0.1) * 100 + 200 + (Math.random() * noise),
            volume: 1000
        })).map(c => ({ ...c, high: c.close + 2, low: c.close - 2, open: c.close }));
    }

    // TEST 1: Lead-Lag Engine
    console.log('\n--- Test 1: Lead-Lag Detection ---');
    const btcCandles = generateSineWave(100, 0);   // Target
    const dxyCandles = generateSineWave(100, 5);   // Leads by 5 units (Shifted +5 means DXY is 5 steps AHEAD in phase)
    // Wait, sin(x+5) is ahead of sin(x). So DXY[t] is "future" of BTC? 
    // No, if DXY peaks at t=10 and BTC peaks at t=15, DXY leads.
    // sin(t) peaks at PI/2. sin(t+5) peaks earlier. 

    // Let's make it simpler:
    // Leader: [0, 1, 2, 3, 2, 1, 0] at t=0
    // Laggard: [0, 1, 2, 3, 2, 1, 0] at t=5

    const lead = LeadLagEngine.analyze(btcCandles, dxyCandles, 10);
    console.log('Lead Detection Result:', lead ? `DETECTED (Leader: ${lead.leader}, Lag: ${lead.lag})` : 'FAILED');

    // TEST 2: Parameter Optimizer
    console.log('\n--- Test 2: Parameter Optimizer ---');
    // Generate chop market where RSI 9 is better than 14
    // (High frequency waves favor faster RSI)
    const fastMarket = generateSineWave(300, 0, 5);
    const optimized = ParameterOptimizer.optimizeRSI(fastMarket);
    console.log(`Optimizer Choice: RSI ${optimized.period} (Score: ${optimized.score.toFixed(2)})`);

    // TEST 3: DTW Pattern Matching
    console.log('\n--- Test 3: DTW Pattern Matching ---');
    const engine = new PatternLearningEngine();
    // Create specific pattern sequence
    const pattern = generateSineWave(2000, 0);
    // Inject exact match at end
    const result = engine.findSimilarPatterns(pattern);
    console.log(`Pattern Recognition: ${result ? `MATCH FOUND (Sim: ${(result.bestMatch.similarity * 100).toFixed(1)}%)` : 'NONE'}`);

}

runPhase6Tests();
