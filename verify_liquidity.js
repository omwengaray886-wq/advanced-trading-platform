
import { MarketObligationEngine } from './src/analysis/MarketObligationEngine.js';
import { ScenarioEngine } from './src/services/scenarioEngine.js';
import { AnnotationMapper } from './src/services/annotationMapper.js';

const mockMarketState = {
    currentPrice: 100,
    liquidityPools: [
        { id: 'bsl-1', price: 105, type: 'BUY_SIDE', isHTF: true, swept: false },
        { id: 'ssl-1', price: 95, type: 'SELL_SIDE', isSessionLevel: true, swept: false }
    ],
    trend: { direction: 'BULLISH' },
    mtf: { globalBias: 'BULLISH' },
    volatility: { level: 'NOMINAL' }
};

const mockCandles = new Array(100).fill({ close: 100 });

// 1. Test Obligation Detection
console.log('--- Phase 1: Obligation Detection ---');
const { obligations, primaryObligation } = MarketObligationEngine.detectObligations(mockMarketState, mockCandles);
console.log('Primary Obligation:', primaryObligation?.type, 'at', primaryObligation?.price, 'Urgency:', primaryObligation?.urgency);

// Inject back into state for following phases
mockMarketState.obligations = { obligations, primaryObligation };

if (primaryObligation?.type !== 'BUY_SIDE_LIQUIDITY' || primaryObligation.price !== 105) {
    console.error('FAIL: Expected BSL at 105 to be primary due to HTF weight and trend alignment.');
    process.exit(1);
}

// 2. Test Scenario Generation
console.log('\n--- Phase 2: Scenario Generation ---');
const setups = [];
const fundamentals = {};
const scenarios = ScenarioEngine.generateScenarios(mockMarketState, setups, fundamentals);
const visual = ScenarioEngine.getVisualScenarios(scenarios, mockMarketState, obligations.map(o => ({ ...o, type: o.type, id: o.price })));

const bslPath = visual.find(v => v.direction === 'BULLISH');
const targetPoint = bslPath?.points.find(p => p.type === 'TARGET');

console.log('BSL Target label:', targetPoint?.label);
console.log('Is Liquidity Raid:', targetPoint?.isLiquidityRaid);

if (targetPoint?.label !== 'BSL Raid' || !targetPoint?.isLiquidityRaid) {
    console.error('FAIL: Scenario target should be labeled as BSL Raid.');
    process.exit(1);
}

// 3. Test Mapping
console.log('\n--- Phase 3: Annotation Mapping ---');
const overlays = AnnotationMapper.mapToOverlays(obligations, { lastCandleTime: Date.now() / 1000 });
const liquidityZone = overlays.zones.find(z => z.label.includes('BSL'));

console.log('Zone label:', liquidityZone?.label);
console.log('Is Ghost:', liquidityZone?.isGhost);
console.log('Is Liquidity:', liquidityZone?.isLiquidity);

if (!liquidityZone?.isGhost || !liquidityZone?.isLiquidity) {
    console.error('FAIL: Liquidity zone should have Ghost and Liquidity flags.');
    process.exit(1);
}

console.log('\nSUCCESS: Liquidity upgrade verified end-to-end!');
