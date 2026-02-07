import { PredictionCompressor } from './src/services/predictionCompressor.js';

console.log("\n=== TESTING DIRECTION ACCURACY IMPROVEMENTS ===\n");

// Test 1: CHoCH Reversal Signal
console.log("--- TEST 1: CHoCH Reversal (Fresh CHoCH should flip bias) ---");
const marketState1 = {
    currentPrice: 20000,
    structuralEvents: [
        {
            markerType: 'CHOCH',
            direction: 'BEARISH',
            time: Math.floor(Date.now() / 1000) - 3600 * 5, // 5 hours ago
            price: 20100,
            significance: 'exceptional'
        }
    ],
    trend: { direction: 'BULLISH' },
    mtf: { globalBias: 'BULLISH' },
    regime: 'TRENDING'
};

const probabilities1 = {
    continuation: 55,
    reversal: 60,
    consolidation: 20
};

try {
    const bias1 = PredictionCompressor._determineBias(marketState1, probabilities1);
    console.log(`Result: ${bias1}`);
    if (bias1 === 'BEARISH') {
        console.log("✅ PASS: CHoCH correctly flipped bias from BULLISH to BEARISH\n");
    } else {
        console.log(`❌ FAIL: Expected BEARISH, got ${bias1}\n`);
    }
} catch (e) {
    console.error("Test Error:", e.message);
}

// Test 2: HTF/LTF Conflict with Recent CHoCH
console.log("--- TEST 2: HTF/LTF Conflict with Recent CHoCH ---");
const marketState2 = {
    currentPrice: 20000,
    structuralEvents: [
        {
            markerType: 'CHOCH',
            direction: 'BEARISH',
            time: Math.floor(Date.now() / 1000) - 3600 * 8, // 8 hours ago
            price: 20100,
            significance: 'exceptional'
        }
    ],
    trend: { direction: 'BEARISH' },
    mtf: { globalBias: 'BULLISH', context: { confidence: 0.7 } },
    confidence: 0.6
};

const probabilities2 = {
    continuation: 50,
    reversal: 55,
    consolidation: 25
};

try {
    const bias2 = PredictionCompressor._determineBias(marketState2, probabilities2);
    console.log(`Result: ${bias2}`);
    if (bias2 === 'BEARISH') {
        console.log("✅ PASS: Recent CHoCH resolved HTF/LTF conflict correctly\n");
    } else {
        console.log(`❌ FAIL: Expected BEARISH (CHoCH direction), got ${bias2}\n`);
    }
} catch (e) {
    console.error("Test Error:", e.message);
}

// Test 3: Volume Profile Path Clearance
console.log("--- TEST 3: Volume Profile Path Clearance Penalty ---");
const marketState3 = {
    currentPrice: 19900,
    price: 19900,
    volumeProfile: {
        poc: 20000,
        valueArea: {
            high: 20100,
            low: 19800
        }
    },
    mtf: { globalBias: 'BULLISH' },
    trend: { direction: 'BULLISH' },
    mtfBiasAligned: true,
    volumeAnalysis: { isInstitutional: true }
};

const probabilities3 = {
    continuation: 70,
    reversal: 25,
    consolidation: 15
};

try {
    const confidence = PredictionCompressor._calculateConfidence('BULLISH', probabilities3, marketState3);
    console.log(`Confidence: ${confidence}%`);

    // With VP penalty, confidence should be reduced
    if (confidence < 90) {
        console.log("✅ PASS: Volume Profile resistance reduced confidence\n");
    } else {
        console.log(`❌ FAIL: Expected confidence < 90%, got ${confidence}%\n`);
    }
} catch (e) {
    console.error("Test Error:", e.message);
}

console.log("=== VERIFICATION COMPLETE ===\n");
