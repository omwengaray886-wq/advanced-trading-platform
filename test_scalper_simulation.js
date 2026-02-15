
import { ScalperEngine } from './src/strategies/modules/ScalperEngine.js';
// Mock LiquidityMapService (since it just normalizes, we can mock the output structure)
// LiquidityMap: { price: number, volume: number, side: 'BID'|'ASK', intensity: number }

function createLiquidityMap(bids, asks) {
    const map = [];
    const maxVol = Math.max(
        ...bids.map(b => b.vol),
        ...asks.map(a => a.vol)
    );

    bids.forEach(b => {
        map.push({ price: b.price, volume: b.vol, side: 'BID', intensity: b.vol / maxVol });
    });
    asks.forEach(a => {
        map.push({ price: a.price, volume: a.vol, side: 'ASK', intensity: a.vol / maxVol });
    });
    return map;
}

function runTest(name, currentPrice, bids, asks, marketState = {}, expectedResult = 'ANY') {
    console.log(`\n--- Test: ${name} ---`);
    console.log(`Price: ${currentPrice}`);

    const liquidityMaps = createLiquidityMap(bids, asks);

    // Debug info on Imbalance
    const imbalance = ScalperEngine.calculateImbalance(liquidityMaps, currentPrice);
    console.log(`Imbalance: ${imbalance.direction} (${imbalance.ratio.toFixed(2)}x)`);

    // Debug info on Wall
    const wall = ScalperEngine.findWallFrontRun(liquidityMaps, currentPrice);
    if (wall) {
        console.log(`Wall Found: ${wall.direction} at ${wall.wallPrice}`);
    } else {
        console.log(`No Wall Found.`);
    }

    const result = ScalperEngine.analyze(liquidityMaps, currentPrice, marketState);

    if (result) {
        console.log(`RESULT: ${result.type} - ${result.direction} @ ${result.entry}`);
        console.log(`Rationale: ${result.rationale}`);
    } else {
        console.log(`RESULT: NULL`);
    }

    if (expectedResult !== 'ANY') {
        const passed = (result && result.direction === expectedResult) || (!result && expectedResult === null);
        console.log(`STATUS: ${passed ? 'PASS' : 'FAIL'}`);
    }
}

// Scenario 1: Perfect Bullish Scalp
// Wall support below, Bid pressure high
runTest(
    'Perfect Bullish Scalp',
    50000,
    // Bids
    [
        { price: 49990, vol: 100 }, // Wall just below
        { price: 49995, vol: 50 },
        { price: 49980, vol: 50 },
        { price: 50000, vol: 10 } // At spread
    ],
    // Asks
    [
        { price: 50010, vol: 10 },
        { price: 50020, vol: 10 }
    ],
    { amdCycle: { phase: 'DISTRIBUTION' } }, // Boosts confidence
    'LONG'
);

// Scenario 2: Imbalance Mismatch (Bearish Flow, Bullish Wall)
// Should result in NULL because we need confluence
runTest(
    'Imbalance Mismatch',
    50000,
    // Bids (Wall Support)
    [
        { price: 49990, vol: 100 },
        { price: 49980, vol: 10 }
    ],
    // Asks (Heavy Selling Pressure above)
    [
        { price: 50005, vol: 200 }, // Huge ask wall/pressure right above
        { price: 50010, vol: 200 }
    ],
    {},
    null // Expect null due to conflict
);

// Scenario 3: Wall Too Far (No Scalp)
runTest(
    'Wall Too Far',
    50000,
    // Bids
    [
        { price: 49500, vol: 1000 } // Huge wall but 1% away (limit is 0.2%)
    ],
    // Asks
    [
        { price: 50010, vol: 10 }
    ],
    {},
    null
);

// Scenario 4: Micro Sweep (Bullish)
// Needs candles
const mockCandles = [
    { low: 49900, close: 49950, high: 49980 }, // Old
    { low: 49850, close: 49900, high: 49950 }, // Old
    { low: 49800, close: 49810, high: 49850 }, // Last Candle: Swept 49805
];
// Liquidity Pools
const pools = [
    { price: 49805, type: 'BSL' }
];
// Wait, MicroStructure uses marketState.liquiditySweep or manual detection
// ScalperEngine line 47 calls analyzeSweeps

runTest(
    'Liquidity Sweep (Using marketState)',
    49810,
    [], [],
    {
        liquiditySweep: {
            sweptLevel: 49805,
            timestamp: Date.now() / 1000,
            type: 'SELL_SIDE' // Lows taken -> Bullish Reversal
        },
        candles: mockCandles
    },
    'LONG'
);

// Scenario 5: Long Scalp in Bearish Trend (Should Fail or be Low Confidence)
// Market is dumping, but we see a small wall.
runTest(
    'Long Scalp in Bearish Trend',
    50000,
    [{ price: 49990, vol: 150 }], // Wall
    [{ price: 50010, vol: 10 }],
    {
        amdCycle: { phase: 'DISTRIBUTION' }, // Bearish Phase
        currentTrend: 'BEARISH'
    },
    null // Should be rejected or strictly filtered
);

// Scenario 6: Weak Long Signal (Wide Spread)
// Spread is too wide relative to target
runTest(
    'Weak Long Signal (Wide Spread)',
    50000,
    [{ price: 49000, vol: 100 }], // Wall far away
    [{ price: 51000, vol: 100 }],
    {},
    null
);
