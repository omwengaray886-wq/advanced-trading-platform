import { EdgeScoringEngine } from './services/EdgeScoringEngine.js';

console.log('--- STARTING PHASE 2 INTEGRATION TEST ---');

// Mock Data
const mockSetup = {
    direction: 'LONG',
    strategy: { name: 'TestStrategy' },
    rr: 3.0
};

const baseMarketState = {
    symbol: 'BTCUSDT',
    timeframe: '1h',
    regime: 'TRENDING_UP',
    macroBias: { bias: 'NEUTRAL', action: 'NONE' },
    clusters: { clusters: [] } // No clusters
};

// Test 1: Neutral State (Baseline)
console.log('\n[TEST 1] Neutral Baseline');
const score1 = EdgeScoringEngine.calculateScore(mockSetup, baseMarketState, { probability: 0.6 });
console.log(`Score: ${score1.score} | Breakdown: ${JSON.stringify(score1.breakdown)}`);

// Test 2: Macro Turbo Boost
console.log('\n[TEST 2] Macro Turbo Boost (Bullish DXY for USD Pair?, No wait, mock logic relies on bias check)');
const boostState = {
    ...baseMarketState,
    macroBias: { bias: 'BULLISH', action: 'BOOST', reason: 'DXY Tanking' }
};
const score2 = EdgeScoringEngine.calculateScore(mockSetup, boostState, { probability: 0.6 });
console.log(`Score: ${score2.score} | Breakdown: ${JSON.stringify(score2.breakdown)}`);

// Test 3: Critical Macro Veto
console.log('\n[TEST 3] Critical Macro Veto');
const vetoState = {
    ...baseMarketState,
    macroBias: { bias: 'BEARISH', action: 'VETO', reason: 'Yields Exploding' }
};
const score3 = EdgeScoringEngine.calculateScore(mockSetup, vetoState, { probability: 0.6 });
console.log(`Score: ${score3.score} | Breakdown: ${JSON.stringify(score3.breakdown)}`);

// Test 4: Extreme Cluster Risk
console.log('\n[TEST 4] Extreme Correlation Cluster Risk');
const clusterState = {
    ...baseMarketState,
    clusters: {
        clusters: [{
            assets: ['BTCUSDT', 'ETHUSDT'],
            dominantFactor: 'CRYPTO BETA',
            riskLevel: 'EXTREME'
        }]
    }
};
const score4 = EdgeScoringEngine.calculateScore(mockSetup, clusterState, { probability: 0.6 });
console.log(`Score: ${score4.score} | Breakdown: ${JSON.stringify(score4.breakdown)}`);

console.log('\n--- VERIFICATION COMPLETE ---');
