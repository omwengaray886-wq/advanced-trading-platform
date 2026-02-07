import { PredictionCompressor } from './src/services/predictionCompressor.js';

console.log("\n=== TESTING ADVANCED PREDICTIVE REFINEMENTS ===\n");

// Test 1: Asian Session Penalty
console.log("--- TEST 1: Asian Session (Low Liquidity) ---");
const marketState1 = {
    currentPrice: 20000,
    price: 20000,
    session: {
        active: 'ASIAN',
        timestamp: Date.now() / 1000,
        killzone: false
    },
    mtf: { globalBias: 'BULLISH' },
    trend: { direction: 'BULLISH' },
    mtfBiasAligned: true,
    volumeAnalysis: { isInstitutional: true }
};

const probabilities1 = {
    continuation: 70,
    reversal: 25,
    consolidation: 15
};

try {
    const confidence1 = PredictionCompressor._calculateConfidence('BULLISH', probabilities1, marketState1);
    console.log(`Confidence: ${confidence1}%`);

    // Should be reduced by -10 due to Asian session
    if (confidence1 < 85) {
        console.log("✅ PASS: Asian session reduced confidence\n");
    } else {
        console.log(`❌ FAIL: Expected confidence < 85%, got ${confidence1}%\n`);
    }
} catch (e) {
    console.error("Test Error:", e.message);
}

// Test 2: London/NY Overlap Boost
console.log("--- TEST 2: London/NY Overlap (Peak Liquidity) ---");
const londonNYTime = new Date();
londonNYTime.setUTCHours(14, 0, 0, 0); // 14:00 UTC (overlap period)

const marketState2 = {
    currentPrice: 20000,
    price: 20000,
    session: {
        active: 'LONDON',
        timestamp: londonNYTime.getTime() / 1000,
        killzone: false
    },
    mtf: { globalBias: 'BULLISH' },
    trend: { direction: 'BULLISH' },
    mtfBiasAligned: true,
    volumeAnalysis: { isInstitutional: true }
};

try {
    const confidence2 = PredictionCompressor._calculateConfidence('BULLISH', probabilities1, marketState2);
    console.log(`Confidence: ${confidence2}%`);

    // Should be boosted by +10 due to London/NY overlap
    if (confidence2 > 95) {
        console.log("✅ PASS: London/NY overlap boosted confidence\n");
    } else {
        console.log(`❌ FAIL: Expected confidence > 95%, got ${confidence2}%\n`);
    }
} catch (e) {
    console.error("Test Error:", e.message);
}

// Test 3: Correlation Conflict Penalty
console.log("--- TEST 3: Correlation Conflict (BULLISH vs BEARISH macro) ---");
const marketState3 = {
    currentPrice: 20000,
    price: 20000,
    correlation: {
        bias: 'BEARISH', // DXY bullish = BTC bearish
        score: 0.8,
        rationale: 'Strong inverse correlation to DXY'
    },
    mtf: { globalBias: 'BULLISH' },
    trend: { direction: 'BULLISH' },
    mtfBiasAligned: true,
    volumeAnalysis: { isInstitutional: true }
};

try {
    const confidence3 = PredictionCompressor._calculateConfidence('BULLISH', probabilities1, marketState3);
    console.log(`Confidence: ${confidence3}%`);

    // Should be penalized by -20 due to correlation conflict
    if (confidence3 < 80) {
        console.log("✅ PASS: Correlation conflict reduced confidence\n");
    } else {
        console.log(`❌ FAIL: Expected confidence < 80%, got ${confidence3}%\n`);
    }
} catch (e) {
    console.error("Test Error:", e.message);
}

// Test 4: Bullish Divergence Confirmation
console.log("--- TEST 4: Bullish Divergence Confirmation ---");
const marketState4 = {
    currentPrice: 20000,
    price: 20000,
    divergences: [
        {
            type: 'BULLISH_DIVERGENCE',
            indicator: 'RSI',
            strength: 'strong'
        }
    ],
    mtf: { globalBias: 'BULLISH' },
    trend: { direction: 'BULLISH' },
    mtfBiasAligned: true,
    volumeAnalysis: { isInstitutional: true }
};

try {
    const confidence4 = PredictionCompressor._calculateConfidence('BULLISH', probabilities1, marketState4);
    console.log(`Confidence: ${confidence4}%`);

    // Should be boosted by +10 due to aligned divergence
    if (confidence4 > 90) {
        console.log("✅ PASS: Bullish divergence boosted confidence\n");
    } else {
        console.log(`❌ FAIL: Expected confidence > 90%, got ${confidence4}%\n`);
    }
} catch (e) {
    console.error("Test Error:", e.message);
}

// Test 5: Conflicting Momentum Penalty
console.log("--- TEST 5: Conflicting Momentum (Bullish bias with Bearish divergence) ---");
const marketState5 = {
    currentPrice: 20000,
    price: 20000,
    divergences: [
        {
            type: 'BEARISH_DIVERGENCE',
            indicator: 'RSI',
            strength: 'strong'
        }
    ],
    mtf: { globalBias: 'BULLISH' },
    trend: { direction: 'BULLISH' },
    mtfBiasAligned: true,
    volumeAnalysis: { isInstitutional: true }
};

try {
    const confidence5 = PredictionCompressor._calculateConfidence('BULLISH', probabilities1, marketState5);
    console.log(`Confidence: ${confidence5}%`);

    // Should be penalized by -15 due to conflicting momentum
    if (confidence5 < 85) {
        console.log("✅ PASS: Conflicting momentum reduced confidence\n");
    } else {
        console.log(`❌ FAIL: Expected confidence < 85%, got ${confidence5}%\n`);
    }
} catch (e) {
    console.error("Test Error:", e.message);
}

console.log("=== VERIFICATION COMPLETE ===\n");
