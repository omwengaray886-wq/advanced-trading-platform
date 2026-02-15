
import { strategyPerformanceTracker } from './src/services/StrategyPerformanceTracker.js';

// ... (existing imports)

// ... (existing test cases)



// Mock Data Generators
function createCandle(close, volume, color = 'GREEN', wickRatio = 0.1) {
    const range = 100;
    const open = color === 'GREEN' ? close - range : close + range;
    // To get a 30% wick ratio, wick needs to be significant relative to TOTAL range
    // If wickRatio is 0.4, we want wick to be huge.
    const wickSize = range * wickRatio * 5;

    const high = Math.max(open, close) + wickSize;
    const low = Math.min(open, close) - wickSize;

    // For specific wick testing
    return { open, close, high, low, volume, time: Date.now() };
}

function createMarketState(trend, regime, volumeProfile = 'NEUTRAL') {
    return {
        currentTrend: trend, // 'BULLISH', 'BEARISH'
        regime: regime, // 'TRENDING', 'RANGING'
        volumeAnalysis: { isInstitutional: volumeProfile === 'INSTITUTIONAL' },
        mtf: { globalBias: trend },
        orderFlow: { cvdBias: trend }, // Aligned
        sentiment: { label: trend === 'BULLISH' ? 'BULLISH' : 'BEARISH' },
        indicators: { rsi: [50], macd: { histogram: [1, 2] } }, // Default neutral/aligned
        timeframe: '1h'
    };
}

async function runTest(name, setup, marketState, expectedScoreRange, expectedTrigger) {
    console.log(`\n--- Test: ${name} ---`);

    // 1. Calculate Probability via Ensemble Engine (MOCKED due to no DB access in test)
    let probability = 0.65;
    // Manual overrides for specific tests if needed
    if (name.includes('Ensemble Conflict')) probability = 0.45;
    if (name.includes('Golden')) probability = 0.95;

    // Log intent
    console.log(`Ensemble Probability (Mocked): ${(probability * 100).toFixed(1)}%`);

    const bayesianStats = { probability };

    // 2. Score
    // Test Execution Trigger (Moved here for flow)
    let trigger = { isConfirmed: true, reason: 'Mocked' };
    if (marketState.lastCandle) {
        trigger = ExecutionTrigger.verifyCandleConfirmation(marketState.lastCandle, setup.direction, 5000);
    }
    console.log(`Trigger: ${trigger.isConfirmed ? 'PASS' : 'FAIL'} (${trigger.reason})`);

    const { score, breakdown } = EdgeScoringEngine.calculateScore(setup, marketState, bayesianStats, 'BTCUSDT');
    console.log(`Score: ${score} (${breakdown.positives.length} Positives)`);

    // Validation
    const triggerPass = expectedTrigger === null || trigger.isConfirmed === expectedTrigger;
    const scorePass = score >= expectedScoreRange[0] && score <= expectedScoreRange[1];

    console.log(`STATUS: ${triggerPass && scorePass ? 'PASS' : 'FAIL'}`);
    if (!scorePass) console.log(`Expected Score ${expectedScoreRange[0]}-${expectedScoreRange[1]}, Got ${score}`);
}

// Scenarios

// 1. Golden Setup (Trend + Volume + Sentiment + Trigger)
const goldenState = createMarketState('BULLISH', 'TRENDING', 'INSTITUTIONAL');
goldenState.lastCandle = createCandle(50000, 5000, 'GREEN', 0.4); // Strong validation wick
runTest(
    'Golden Setup (Bullish)',
    { direction: 'LONG', strategy: { name: 'TrendFollow' }, rr: 3.0 },
    goldenState,
    [8.5, 10.0], // Expect Premium Score
    goldenState,
    [8.5, 10.0],
    true
);

// 4. Valid Pullback Long (Trend + Support Wick + Volume)
const pullbackState = createMarketState('BULLISH', 'TRENDING', 'INSTITUTIONAL'); // Institutional Interest at support
pullbackState.lastCandle = createCandle(50000, 1200, 'GREEN', 0.35); // Good wick, Good volume
runTest(
    'Valid Pullback Long',
    { direction: 'LONG', strategy: { name: 'DipBuy' }, rr: 2.5 },
    pullbackState,
    [8.0, 10.0], // Strong Score (can be perfect with institutional volume)
    true
);

// 5. Counter-Trend Long (Bearish Trend + Wick) -> Should Fail/Score Low
const bearState = createMarketState('BEARISH', 'TRENDING', 'INSTITUTIONAL');
bearState.lastCandle = createCandle(50000, 5000, 'GREEN', 0.4); // Great candle, but WRONG context
runTest(
    'Counter-Trend Long (Bearish Market)',
    { direction: 'LONG', strategy: { name: 'Reversal' }, rr: 3.0 },
    bearState,
    [0.0, 5.0], // Penalty for trading against trend
    true // Trigger might pass (good candle), but Score must fail
);

// 7. Bull Trap Scenario (Breakout into Resistance Trap)
const trapState = createMarketState('BULLISH', 'TRENDING', 'INSTITUTIONAL');
trapState.trapZones = {
    bullTraps: [{ location: 50100, implication: 'BULL_TRAP' }],
    bearTraps: [],
    warning: 'High Trap Activity'
};
trapState.currentPrice = 50050; // Just below trap
trapState.lastCandle = createCandle(50050, 5000, 'GREEN', 0.1);

runTest(
    'Bull Trap Breakout',
    { direction: 'LONG', strategy: { name: 'Breakout' }, rr: 2.0, entryZone: { optimal: 50100 } },
    trapState,
    [0.0, 4.0], // Should be CRUSHED by penalty
    null
);

// 8. SMT Divergence Reversal (Bearish SMT)
const smtState = createMarketState('BEARISH', 'TRENDING', 'INSTITUTIONAL');
smtState.divergences = [{ type: 'BEARISH_SMT' }]; // Legacy array
smtState.smtDivergence = { type: 'BEARISH', metadata: { sibling: 'ETHUSDT' } }; // New Object
smtState.smConfluence = 90;
smtState.lastCandle = createCandle(50000, 5000, 'RED', 0.4); // Wick rejection

// 9. Ensemble Conflict (Structure vs Volume)
const conflictState = createMarketState('BULLISH', 'TRENDING', 'NEUTRAL');
conflictState.volumeAnalysis = { isInstitutional: false, exhaustion: true }; // Volume Disagrees with Trend
conflictState.sentiment = { label: 'BEARISH', score: 80 }; // Sentiment Disagrees
conflictState.regime = 'TRENDING';
conflictState.mtf = { globalBias: 'BULLISH' };
// Manually run Probabilistic Engine to get the 'stats'
// We need to simulate the async call or just mock it for the test?
// Easier to just mock the "Bayesian Stats" derived from the engine if we can't import it easily here.
// But we want to TEST the engine.
// Let's import ProbabilisticEngine in the test file?
// logic: conflictState implies mixed signals.
// We expect a "Valid" setup but with LOW probability.

runTest(
    'Ensemble Conflict',
    { direction: 'LONG', strategy: { name: 'TrendFollow' }, rr: 2.0 },
    conflictState,
    [3.0, 6.0], // Should be penalized due to conflict
    null
);

// 10. Golden Ensemble (Full Consensus)
const consensusState = createMarketState('BULLISH', 'TRENDING', 'INSTITUTIONAL');
consensusState.sentiment = { label: 'BULLISH', score: 75 };
consensusState.mtf = { globalBias: 'BULLISH' };
consensusState.structures = [{ markerType: 'BOS', status: 'CONFIRMED' }, { markerType: 'BOS', status: 'CONFIRMED' }];

// 11. Whale Defense (Iceberg Support)
const whaleState = createMarketState('BULLISH', 'RANGING', 'INSTITUTIONAL');
whaleState.orderFlow = {
    icebergs: [{ price: 50000, type: 'BUY_ICEBERG', size: 1000000 }],
    cvdBias: 'BEARISH' // Retail selling into the wall
};
whaleState.currentPrice = 50050; // Near iceberg

runTest(
    'Whale Defense (Iceberg)',
    { direction: 'LONG', strategy: { name: 'SupportHold' }, rr: 3.0, entryZone: { optimal: 50000 } },
    whaleState,
    [9.0, 10.0], // Should be Premium due to Whale + Absorption of retail sell pressure
    true
);

// 12. Absorption Reversal (Delta Divergence)
const absorbState = createMarketState('BEARISH', 'TRENDING', 'NEUTRAL');
absorbState.orderFlow = {
    absorption: { type: 'SELLING_ABSORPTION', strength: 'HIGH' }, // Price not going up despite buys? Or Price not dropping despite sells? 
    // SELLING_ABSORPTION = Buying Absorbed? Or Selling Absorbed?
    // In code: closePos < 0.3 (Red/Low close) despite High Vol. 
    // Wait, OrderBookEngine logic: High Vol + Small Body.
    // IF closePos < 0.3 -> SELLING (Bearish) ABSORPTION. (Market Buyers getting stuffed).
    cvdBias: 'BULLISH' // Retail buying
};
absorbState.currentPrice = 60000;

runTest(
    'Absorption Reversal',
    { direction: 'SHORT', strategy: { name: 'Reversal' }, rr: 2.5 },
    absorbState,
    [8.0, 10.0], // High conviction
    true
);
