import { PredictionCompressor } from './services/predictionCompressor.js';

async function runPrecisionTests() {
    console.log("🚀 Running Phase 73: Prediction Precision & Integrity Verification...\n");

    const tests = [
        {
            name: "Test 1: Conflict Suppression (Bullish Structure vs Bearish HTF)",
            marketState: {
                currentPrice: 50000,
                trend: { direction: 'BULLISH' },
                mtf: { globalBias: 'BEARISH' },
                regime: 'TRENDING'
            },
            probabilities: { continuation: 75, reversal: 20, consolidation: 5 },
            expectedShow: false // In Phase 73, conflicts are killed
        },
        {
            name: "Test 2: Low Probability Suppression (No Magnet, 70% Prob)",
            marketState: {
                currentPrice: 50000,
                trend: { direction: 'BULLISH' },
                mtf: { globalBias: 'BULLISH' },
                regime: 'TRENDING',
                obligations: { state: 'FREE_ROAMING' }
            },
            probabilities: { continuation: 70, reversal: 10, consolidation: 20 },
            expectedShow: false // 70% < 80% threshold for Free Roaming
        },
        {
            name: "Test 3: Magnet-Driven Prediction (65% Prob, OBLIGATED)",
            marketState: {
                currentPrice: 50000,
                trend: { direction: 'BULLISH' },
                mtf: { globalBias: 'BULLISH' },
                regime: 'TRENDING',
                obligations: { state: 'OBLIGATED', primaryObligation: { price: 51000, urgency: 85 } }
            },
            probabilities: { continuation: 65, reversal: 10, consolidation: 25 },
            expectedShow: true // 65% > 60% threshold for Obligated
        },
        {
            name: "Test 4: Trap Zone Suppression",
            marketState: {
                currentPrice: 50000,
                trend: { direction: 'BULLISH' },
                mtf: { globalBias: 'BULLISH' },
                regime: 'TRENDING',
                trapZones: { warning: 'Liquidity Trap Detected', count: 1 }
            },
            probabilities: { continuation: 90, reversal: 5, consolidation: 5 },
            expectedShow: false
        }
    ];

    let passedCount = 0;

    for (const test of tests) {
        process.stdout.write(`Checking: ${test.name} ... `);

        const shouldShow = PredictionCompressor.shouldShowPrediction(test.marketState, test.probabilities);

        if (shouldShow === test.expectedShow) {
            console.log("✅ PASS");
            passedCount++;
        } else {
            console.log(`❌ FAIL (Expected ${test.expectedShow}, got ${shouldShow})`);
        }
    }

    console.log(`\nVerification Summary: ${passedCount}/${tests.length} tests passed.`);
    if (passedCount < tests.length) {
        process.exit(1);
    }
}

runPrecisionTests().catch(error => {
    console.error(error);
    process.exit(1);
});
