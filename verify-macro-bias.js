import { macroBiasEngine } from './src/services/MacroBiasEngine.js';

async function runTests() {
    console.log("=== MACRO BIAS VERIFICATION ===");

    const testCases = [
        {
            assetClass: 'CRYPTO',
            macroData: {
                DXY: { trend: 'BULLISH' },
                US10Y: { trend: 'BULLISH' },
                NDX: { trend: 'BEARISH' }
            },
            expectedBias: 'BEARISH',
            expectedAction: 'VETO'
        },
        {
            assetClass: 'CRYPTO',
            macroData: {
                DXY: { trend: 'BEARISH' },
                US10Y: { trend: 'BEARISH' },
                NDX: { trend: 'BULLISH' }
            },
            expectedBias: 'BULLISH',
            expectedAction: 'VETO' // Strong alignment = Veto for opposing side, but here it means high conviction
        },
        {
            assetClass: 'FOREX',
            macroData: {
                DXY: { trend: 'BULLISH' },
                US10Y: { trend: 'BULLISH' }
            },
            expectedBias: 'BULLISH',
            expectedAction: 'VETO' // Vetoing shorts
        }
    ];

    let passed = 0;
    testCases.forEach((tc, i) => {
        const result = macroBiasEngine.calculateMacroBias(tc.assetClass, tc.macroData);
        const biasOk = result.bias === tc.expectedBias;
        const actionOk = result.action === tc.expectedAction;

        console.log(`\nTest ${i + 1}: ${tc.assetClass} with Macro Trends`);
        console.log(`Result: Score: ${result.score}, Bias: ${result.bias}, Action: ${result.action}`);

        if (biasOk && actionOk) {
            console.log("✅ PASS");
            passed++;
        } else {
            console.log(`❌ FAIL (Expected: ${tc.expectedBias}/${tc.expectedAction})`);
        }

        // Test Veto Logic
        const mockSetup = { direction: tc.expectedBias === 'BULLISH' ? 'SHORT' : 'LONG', suitability: 80, rationale: 'Test' };
        const initialSuitability = mockSetup.suitability;
        macroBiasEngine.applyVeto(mockSetup, result);

        if (result.action === 'VETO') {
            if (mockSetup.suitability < initialSuitability) {
                console.log(`✅ VETO APPLIED: Suitability ${initialSuitability} -> ${mockSetup.suitability}`);
            } else {
                console.log(`❌ VETO FAILED TO APPLY`);
            }
        }
    });

    console.log(`\n=== RESULTS: ${passed}/${testCases.length} PASSED ===`);
    process.exit(passed === testCases.length ? 0 : 1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
