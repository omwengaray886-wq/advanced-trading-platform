
import { liquidityHeatmapEngine } from './src/services/LiquidityHeatmapEngine.js';

function runTest() {
    console.log('--- Verifying Liquidity Heatmap Engine ---');

    const basePrice = 50000;

    // 1. Initial Update - Create Walls
    console.log('\n[Step 1] Initial Snapshot (Buy Wall at 49800)');
    const depthMock = {
        bids: [
            { price: 49800, quantity: 500 }, // Wall
            { price: 49790, quantity: 10 },
            { price: 49780, quantity: 10 },
            { price: 49770, quantity: 10 },
            { price: 49760, quantity: 10 }
        ],
        asks: [
            { price: 50200, quantity: 10 }
        ]
    };

    liquidityHeatmapEngine.update(depthMock, basePrice, 1000);
    let blocks = liquidityHeatmapEngine.getHeatmapBlocks(1000);
    console.log(`Blocks Count: ${blocks.length}`);
    if (blocks.length > 0) {
        console.log('Block 0:', blocks[0]);
    }

    // 2. Update - Sustain Wall
    console.log('\n[Step 2] Update Snapshot (Wall Sustained at 49800)');
    // Advance time by 40s (> 30s min duration)
    liquidityHeatmapEngine.update(depthMock, basePrice, 41000);
    blocks = liquidityHeatmapEngine.getHeatmapBlocks(41000);
    console.log(`Blocks Count: ${blocks.length}`);
    if (blocks.length > 0) {
        console.log('Block 0 Duration:', blocks[0].lastSeen - blocks[0].startTime);
        console.log('Block 0 Updates:', blocks[0].updates);
    }

    // 3. Update - Remove Wall (Simulate Pull)
    console.log('\n[Step 3] Update Snapshot (Wall Removed)');
    const depthEmpty = {
        bids: [
            { price: 49790, quantity: 10 },
            { price: 49780, quantity: 10 }
        ],
        asks: []
    };
    // Advance time by another 10s
    liquidityHeatmapEngine.update(depthEmpty, basePrice, 51000);

    blocks = liquidityHeatmapEngine.getHeatmapBlocks(51000);
    const active = blocks.filter(b => b.isActive);
    const history = blocks.filter(b => !b.isActive);

    console.log(`Active Blocks: ${active.length}`);
    console.log(`History Blocks: ${history.length}`);

    if (active.length === 0 && history.length > 0) {
        console.log('✅ PASS: Block moved to history after liquidity pull.');
    } else {
        console.log('❌ FAIL: Block should be archived.');
        console.log('Active:', active);
        console.log('History:', history);
    }
}

runTest();
