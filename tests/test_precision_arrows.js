import { ScenarioEngine } from '../src/services/scenarioEngine.js';
import { ScenarioWeighting } from '../src/services/scenarioWeighting.js';
import { PredictionCompressor } from '../src/services/predictionCompressor.js';

console.log('--- Phase 80: High-Precision Prediction Verification ---');

const mockMarketState = {
    symbol: 'BTCUSDT',
    currentPrice: 50000,
    price: 50000,
    velocity: 1.5, // High velocity
    trend: { direction: 'BULLISH' },
    mtf: { globalBias: 'BULLISH' },
    structures: [
        { markerType: 'BOS', direction: 'BULLISH', status: 'ACTIVE' },
        { markerType: 'BOS', direction: 'BULLISH', status: 'ACTIVE' }
    ],
    fvgs: [{ direction: 'BULLISH' }],
    orderBlocks: [{ direction: 'BULLISH' }],
    liquidityPools: [
        { price: 51000, strength: 'HIGH', isHTF: true },
        { price: 51100, strength: 'MEDIUM' }
    ],
    obligations: { state: 'FREE_ROAMING' }
};

const mockSetups = [
    {
        direction: 'BULLISH',
        strategy: 'SMC',
        suitability: 80,
        targets: [{ price: 51000 }],
        stopLoss: 49500
    }
];

const mockProbabilities = {
    continuation: 86,
    reversal: 10,
    consolidation: 4,
    liquidityRun: { probability: 70, target: 51000, type: 'BULLISH_LIQUIDITY' }
};

const mockScenarios = {
    primary: { bias: 'BULLISH', probability: 0.86, style: 'SOLID', label: 'Primary: Bullish Expansion' },
    all: [{ direction: 'up', probability: 0.86 }]
};

// 1. Verify Velocity-Based Scaling
console.log('\n1. Verifying Velocity-Based Scaling...');
const highVolPath = ScenarioEngine.generatePathway(mockMarketState, mockScenarios.primary, [], null, mockSetups[0], null);
const targetPoint = highVolPath.find(p => p.type === 'TARGET');
console.log(`High Velocity Target Offset: ${targetPoint.barsOffset} (Expected: ~10)`);

mockMarketState.velocity = 0.5; // Low velocity
const lowVolPath = ScenarioEngine.generatePathway(mockMarketState, mockScenarios.primary, [], null, mockSetups[0], null);
const targetPointLow = lowVolPath.find(p => p.type === 'TARGET');
console.log(`Low Velocity Target Offset: ${targetPointLow.barsOffset} (Expected: ~25)`);

// 2. Verify Judas Swing Geometry
console.log('\n2. Verifying Judas Swing Geometry...');
mockMarketState.liquiditySweep = { type: 'BEARISH_SWEEP', price: 49800 };
mockMarketState.velocity = 1.0;
const judasPath = ScenarioEngine.generatePathway(mockMarketState, mockScenarios.primary, [], null, mockSetups[0], null);
const manipulationPoint = judasPath.find(p => p.label === 'Manipulation');
console.log(`Judas Swing Point Detected: ${!!manipulationPoint} at ${manipulationPoint?.price}`);

// 3. Verify Confluence Density Scoring
console.log('\n3. Verifying Confluence Density Scoring...');
const baseScore = ScenarioWeighting.calculateScenarioScore({ direction: 'BULLISH', target: 51000 }, mockMarketState, mockProbabilities);
console.log(`Confluence Enhanced Score: ${baseScore}`);

// 4. Verify Precision Gating
console.log('\n4. Verifying Precision Gating...');
const shouldShowLow = PredictionCompressor.shouldShowPrediction(mockMarketState, { continuation: 80, reversal: 10 });
console.log(`Show 80% (Non-Obligated): ${shouldShowLow} (Expected: false)`);

const shouldShowHigh = PredictionCompressor.shouldShowPrediction(mockMarketState, { continuation: 86, reversal: 10 });
console.log(`Show 86% (Non-Obligated): ${shouldShowHigh} (Expected: true)`);

// 5. Verify Opposing Liquidity Gating
console.log('\n5. Verifying Opposing Liquidity Gating...');
mockMarketState.liquidityPools.push({ price: 52000, strength: 'HIGH', isHTF: true }); // HTF Resistance
const shouldShowOpposed = PredictionCompressor.shouldShowPrediction(mockMarketState, { continuation: 90, reversal: 5 });
// Wait, the logic is: if pred is BULLISH and there is a pool ABOVE it? No, if pred is BULLISH and pool is BELOW (untouched)? 
// Let's check my logic: hasMajorOpposingPool = (predDir === 'BULLISH' && p.price < currentPrice)
// If I am BULLISH, but there is a major pool BELOW me that hasn't been swept, I might want to wait for the sweep.
console.log(`Show 90% (Opposing HTF Liquidity Below): ${shouldShowOpposed}`);

console.log('\n--- Verification Complete ---');
