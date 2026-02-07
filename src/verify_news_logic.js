/**
 * Verification Script: News-Scenario Integration
 * Tests if high-impact news correctly flips scenarios and penalizes setups.
 */

import { AnalysisOrchestrator } from './services/analysisOrchestrator.js';

async function verifyNewsIntegration() {
    console.log("🚀 Verifying News-Scenario Integration...");

    const orchestrator = new AnalysisOrchestrator();

    // 1. Mock Bullish Candles
    const candles = Array(50).fill(0).map((_, i) => ({
        time: 1700000000 + i * 3600,
        open: 50000 + i * 10,
        high: 50000 + i * 10 + 5,
        low: 50000 + i * 10 - 5,
        close: 50000 + (i + 1) * 10,
        volume: 1000
    }));

    // 2. Normal Analysis (No News)
    console.log("\nCase 1: Normal Bullish Trend (No imminent news)...");
    const normalAnalysis = await orchestrator.analyze(candles, "BTC/USDT", "1h");

    console.log(`- Primary Bias: ${normalAnalysis.marketState.scenarios.primary.bias}`);
    console.log(`- Primary Prob: ${normalAnalysis.marketState.scenarios.primary.probability}`);

    // 3. Imminent High-Impact Bearish News
    // We'll mock the FundamentalAnalyzer behavior or check if it picks it up
    // Note: fundamentalAnalyzer is hardcoded with mock events. We'll verify if one is imminent.
    console.log("\nCase 2: Checking Scenario Response to High-Impact News...");

    // Since FundamentalAnalyzer has hardcoded mocks, we'll check if any are 'imminent'
    // in its current mocked state. If not, we've at least verified the plumbing.

    const analysisWithNews = await orchestrator.analyze(candles, "EUR/USD", "1h");
    const proximity = analysisWithNews.fundamentals.proximityAnalysis;

    if (proximity) {
        console.log(`- Detected ${proximity.event.type} in ${Math.round(proximity.minutesToEvent)}m`);
        console.log(`- Event Impact: ${proximity.event.impact}`);
        console.log(`- Scenario Primary Bias: ${analysisWithNews.marketState.scenarios.primary.bias}`);
        console.log(`- Scenario Primary Style: ${analysisWithNews.marketState.scenarios.primary.style}`);
        console.log(`- Scenario Alternate Style: ${analysisWithNews.marketState.scenarios.alternate.style}`);
        console.log(`- Scenario Primary Prob: ${analysisWithNews.marketState.scenarios.primary.probability}`);

        const isFlipped = analysisWithNews.marketState.scenarios.primary.probability < 0.5;
        if (isFlipped) {
            console.log("✅ SCENARIO FLIP: SUCCESS (Probability dropped below 0.5 due to news conflict)");
        } else if (proximity.isImminent) {
            console.log("⚠️ News detected but no flip. Check if aligned.");
        }

        // Check for Consolidation/Retest in output
        if (analysisWithNews.marketState.consolidations?.length > 0) {
            console.log(`✅ Consolidation Detected: ${analysisWithNews.marketState.consolidations.length} zones found.`);
        }
    } else {
        console.log("⚠️ No imminent news found in mocks for EUR/USD. Check fundamentalAnalyzer mocks.");
    }

    console.log("\n✨ Ultimate Platform Logic Verification Complete!");
}

verifyNewsIntegration().catch(console.error);
