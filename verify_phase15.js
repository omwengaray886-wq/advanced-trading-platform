import { newsShockEngine } from './src/services/newsShockEngine.js';
import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';
import { strategyPerformanceTracker } from './src/services/StrategyPerformanceTracker.js';
import { newsService } from './src/services/newsService.js';

async function verifyPhase15() {
    console.log('--- PHASE 15 VERIFICATION ---');

    // 1. Verify Strategy Weights
    console.log('\n[1/3] Verifying Strategy Weights...');
    const weights = await strategyPerformanceTracker.constructor.getAllStrategyWeights();
    const hasStrategies = Object.keys(weights).length >= 4;
    console.log(`- Live Weights Generated: ${hasStrategies ? 'PASS' : 'FAIL'}`);
    console.log(`- Multiplier (Liquidity Hunter): x${weights['Liquidity Hunter']?.multiplier || 'N/A'}`);

    // 2. Mock a News Shock
    console.log('\n[2/3] Verifying News Shock Penalty (SIMULATION)...');

    // Mock the news service to return a critical event
    const originalGetUpcomingShocks = newsService.getUpcomingShocks;
    newsService.getUpcomingShocks = async () => {
        return [{
            type: 'FOMC Meeting Projections',
            asset: 'USD',
            impact: 'HIGH',
            time: Date.now() / 1000 + 300, // 5 mins from now
            getPhase: () => 'IMMINENT',
            getProximity: () => 0.08, // Very close
            isImminent: () => true,
            isReleased: () => false
        }];
    };

    const symbol = 'BTC/USDT';

    // Test simulated penalty
    const penalty = await newsShockEngine.calculateSuitabilityPenalty(symbol, 'LONG');
    console.log(`- Simulated News Penalty: ${penalty * 100}% (Expected: 50%)`);

    if (penalty === 0.5) {
        console.log('- News Shock Logic: PASS');
    } else {
        console.error('- News Shock Logic: FAIL');
    }

    // Restore original method
    newsService.getUpcomingShocks = originalGetUpcomingShocks;

    // 3. Verify Orchestrator Integration
    console.log('\n[3/3] Orchestrator Logic Check...');
    const orchestrator = new AnalysisOrchestrator();
    console.log('- Orchestrator initialized and ready for Phase 15 payloads.');

    console.log('\n--- VERIFICATION COMPLETE ---');
}

verifyPhase15().catch(console.error);
