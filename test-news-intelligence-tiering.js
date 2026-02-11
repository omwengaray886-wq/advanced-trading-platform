/**
 * Test to verify Tier 1-3 classification and metadata preservation
 */
import { EconomicEvent } from './src/models/EconomicEvent.js';
import { FundamentalAnalyzer } from './src/services/fundamentalAnalyzer.js';

async function runTest() {
    console.log("🚀 Starting News Intelligence Tiering Test...");

    const analyzer = new FundamentalAnalyzer();

    // 1. Test Event Classification
    const events = [
        new EconomicEvent({
            type: 'Non-Farm Payrolls',
            asset: 'USD',
            timestamp: Date.now() / 1000 + 600, // 10 mins from now
            impact: 'HIGH',
            forecast: '200K',
            previous: '150K'
        }),
        new EconomicEvent({
            type: 'Retail Sales',
            asset: 'USD',
            timestamp: Date.now() / 1000 + 3600, // 1 hour from now
            impact: 'MEDIUM'
        })
    ];

    console.log("\n--- Testing Classification ---");
    const impact = analyzer.calculateOverallImpact(events, 'FOREX');

    events.forEach(e => {
        console.log(`Event: ${e.type} | Tier: ${e.tier} | Impact: ${e.impact}`);
    });

    if (events[0].tier === 'TIER 1') {
        console.log("✅ NFP correctly identified as TIER 1");
    } else {
        console.error("❌ NFP tier identification failed");
    }

    // 2. Test Enriched Summary
    events[0].status = 'RELEASED';
    events[0].actual = '250K';
    const summary = analyzer.generateSummary(events, impact, 'FOREX');
    console.log("\n--- Testing Summary ---");
    console.log("Summary:", summary);

    if (summary.includes('Result: 250K vs 200K')) {
        console.log("✅ Summary correctly includes Actual vs Forecast metadata");
    } else {
        console.error("❌ Summary metadata inclusion failed");
    }

    // 3. Test Proximity Analysis
    const proximity = analyzer.analyzeProximity(events);
    console.log("\n--- Testing Proximity ---");
    console.log(`Minutes to next major event: ${proximity.minutesToEvent.toFixed(2)}`);
    if (proximity.isImminent) {
        console.log("✅ Proximity detection correctly identifies imminent event");
    }

    // 4. Test Directional Bias (New Logic)
    console.log("\n--- Testing Directional Bias ---");
    const testEvents = [
        new EconomicEvent({
            type: 'Non-Farm Payrolls',
            status: 'RELEASED',
            actual: 250,
            forecast: 200
        }),
        new EconomicEvent({
            type: 'Unemployment Rate',
            status: 'RELEASED',
            actual: 4.2,
            forecast: 3.8
        })
    ];

    const nfpBias = testEvents[0].getTradingBias();
    const urBias = testEvents[1].getTradingBias();

    console.log(`NFP Beat -> Bias: ${nfpBias} (Expected: BULLISH)`);
    console.log(`Unemployment Rate Higher -> Bias: ${urBias} (Expected: BEARISH)`);

    if (nfpBias === 'BULLISH' && urBias === 'BEARISH') {
        console.log("✅ getTradingBias correctly maps indicator performance");
    } else {
        console.error("❌ getTradingBias mapping failed");
    }

    // 5. Test Collective Advice
    const testImpact = analyzer.calculateOverallImpact(testEvents, 'FOREX');
    console.log(`\nCollective Advice: ${testImpact.newsAdvice}`);
    if (testImpact.newsAdvice === 'NORMAL') {
        console.log("✅ Conflicting data correctly results in NORMAL advice");
    }

    console.log("\n🏁 Test complete.");
}

runTest().catch(console.error);
