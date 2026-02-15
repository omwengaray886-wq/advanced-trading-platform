import { strategyPerformanceTracker } from './services/StrategyPerformanceTracker.js';
import { ProbabilisticEngine } from './services/probabilisticEngine.js';
import { bayesianEngine } from './services/BayesianInferenceEngine.js';

async function runSimulation() {
    console.log('=== Starting Regime-Adaptive Learning Simulation ===');

    // MOCK: Pre-fill Bayesian Cache to avoid DB calls
    bayesianEngine.cache.set('Institutional Continuation', { hits: 55, total: 100 }); // 55% Base Win Rate
    bayesianEngine.cache.set('Market Maker Reversal', { hits: 50, total: 100 }); // 50% Base Win Rate

    const strategyId = 'Institutional Continuation';
    const mockMarketState = {
        regime: 'TRENDING',
        volatility: { level: 'NORMAL' },
        trend: { direction: 'BULLISH' },
        mtf: { globalBias: 'BULLISH' },
        currentPrice: 100,
        volumeAnalysis: { isInstitutional: true },
        sentiment: { label: 'BULLISH', score: 65 }
    };

    // 1. Baseline Check
    console.log('\n--- Step 1: Baseline Check ---');
    let basePred = await ProbabilisticEngine.generatePredictions('BTC-USD', mockMarketState);
    console.log(`Initial Continuation Probability: ${basePred.continuation}%`);

    // 2. Simulate Winning Streak (Trend working well)
    console.log('\n--- Step 2: Injecting 3 Wins (Hot Streak) ---');
    for (let i = 0; i < 3; i++) {
        strategyPerformanceTracker.updatePerformance(strategyId, true);
    }

    let hotPred = await ProbabilisticEngine.generatePredictions('BTC-USD', mockMarketState);
    console.log(`Hot Streak Probability: ${hotPred.continuation}%`);

    if (hotPred.continuation > basePred.continuation) {
        console.log('✅ PASS: Confidence increased after win streak.');
    } else {
        console.log(`❌ FAIL: Confidence did not increase. (Base: ${basePred.continuation}, Hot: ${hotPred.continuation})`);
    }

    // 3. Simulate Regime Shift (Trend failing)
    console.log('\n--- Step 3: Injecting 5 Losses (Regime Shift to Chop) ---');
    // We need to overcome the 3 wins + positive streak. 
    // 5 losses should swing the streak negative.
    for (let i = 0; i < 6; i++) {
        strategyPerformanceTracker.updatePerformance(strategyId, false);
    }

    let coldPred = await ProbabilisticEngine.generatePredictions('BTC-USD', mockMarketState);
    console.log(`Cold Streak Probability: ${coldPred.continuation}%`);

    if (coldPred.continuation < basePred.continuation) {
        console.log('✅ PASS: Confidence decreased after loss streak.');
    } else {
        console.log(`❌ FAIL: Confidence did not decrease. (Base: ${basePred.continuation}, Cold: ${coldPred.continuation})`);
    }

    // 4. Verify Mean Reversion (Reversal) isn't penalized yet
    let reversalPred = await ProbabilisticEngine.generatePredictions('BTC-USD', { ...mockMarketState, regime: 'RANGING' }); // Force Ranging context
    console.log(`\nReversal Probability (Ranging Context): ${reversalPred.reversal}%`);
}

runSimulation();
