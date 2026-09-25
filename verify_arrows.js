import { AnnotationMapper } from './src/services/annotationMapper.js';
import { ScenarioEngine } from './src/services/scenarioEngine.js';

// Mock market state
const marketState = {
    currentPrice: 50000,
    volatility: { level: 'HIGH' },
    regime: 'TRENDING',
    trend: { direction: 'BULLISH', strength: 80 },
    mtf: { globalBias: 'BULLISH' },
    timeframe: '1H'
};

// Mock scenarios
const scenarios = {
    primary: {
        bias: 'BULLISH',
        style: 'SOLID',
        probability: 0.85,
        expansionTiming: 'IMMINENT',
        label: 'Bullish Expansion'
    }
};

// Mock setups
const setups = [];

// 1. Generate visual scenarios
const visualScenarios = ScenarioEngine.getVisualScenarios(scenarios, marketState, [], null, setups);

console.log('Visual Scenarios:', JSON.stringify(visualScenarios, null, 2));

// 2. Map to overlays
const lastCandleTime = Math.floor(Date.now() / 1000);
const overlays = AnnotationMapper.mapToOverlays(visualScenarios, {
    lastCandleTime,
    timeframe: '1H',
    marketState
});

console.log('Mapped Overlays (Paths):', JSON.stringify(overlays.paths, null, 2));

// Assertions
const path = overlays.paths[0];
if (!path) {
    console.error('FAILED: No path generated');
    process.exit(1);
}

if (path.timing !== 'IMMINENT') {
    console.error(`FAILED: Timing mismatch. Expected IMMINENT, got ${path.timing}`);
    process.exit(1);
}

if (path.volatility?.level !== 'HIGH') {
    console.error(`FAILED: Volatility mismatch. Expected HIGH, got ${path.volatility?.level}`);
    process.exit(1);
}

if (path.direction !== 'BULLISH') {
    console.error(`FAILED: Direction mismatch. Expected BULLISH, got ${path.direction}`);
    process.exit(1);
}

console.log('SUCCESS: Prediction arrow metadata preserved correctly!');
