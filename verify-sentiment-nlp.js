import { sentimentNLPEngine } from './src/services/SentimentNLPEngine.js';

async function runTests() {
    console.log("=== SENTIMENT NLP VERIFICATION ===");

    const testCases = [
        {
            title: "Fed Signals Hawkish Pivot as Inflation Surges",
            expectedBias: "BEARISH",
            expectedLabel: "HAWKISH"
        },
        {
            title: "BlackRock Massive Inflow into Spot BTC ETF",
            expectedBias: "BULLISH",
            expectedLabel: "ADOPTION_DRIVEN"
        },
        {
            title: "SEC Investigation into Major Exchange Causes Panic",
            expectedBias: "BEARISH",
            expectedLabel: "FUD"
        },
        {
            title: "Bitcoin Adoption Rises as Legal Tender in New Country",
            expectedBias: "BULLISH",
            expectedLabel: "ADOPTION_DRIVEN"
        },
        {
            title: "Whales Accumulation Spotted During Market Blood",
            expectedBias: "BULLISH",
            expectedLabel: "BULLISH" // Accumulation + Whale offsets Blood
        }
    ];

    let passed = 0;
    testCases.forEach((tc, i) => {
        const result = sentimentNLPEngine.scoreHeadline(tc.title);
        const biasOk = result.bias === tc.expectedBias;
        const labelOk = result.label === tc.expectedLabel;

        console.log(`\nTest ${i + 1}: "${tc.title}"`);
        console.log(`Result: Score: ${result.score}, Bias: ${result.bias}, Label: ${result.label}, Conf: ${result.confidence}`);

        if (biasOk && labelOk) {
            console.log("✅ PASS");
            passed++;
        } else {
            console.log(`❌ FAIL (Expected: ${tc.expectedBias}/${tc.expectedLabel})`);
        }
    });

    console.log(`\n=== RESULTS: ${passed}/${testCases.length} PASSED ===`);

    // Test aggregation
    console.log("\nTesting Aggregation...");
    const aggregate = sentimentNLPEngine.aggregateSentiment(testCases);
    console.log(`Aggregate Score: ${aggregate.score}, Bias: ${aggregate.bias}, Dominant: ${aggregate.dominantBias}`);

    process.exit(passed === testCases.length ? 0 : 1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
