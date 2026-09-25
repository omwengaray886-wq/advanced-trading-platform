// Quick test to trigger and identify the toFixed error
import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';
import { marketData } from './src/services/marketData.js';

console.log("🔍 Testing toFixed Error...\n");

try {
    const candles = await marketData.fetchHistory('BTCUSDT', '5m', 100);
    const orchestrator = new AnalysisOrchestrator();
    const analysis = await orchestrator.analyze(candles, 'BTCUSDT', '5m', null, null, true);

    console.log("✅ Analysis completed successfully");
    console.log("Setups found:", analysis.setups?.length || 0);

    if (analysis.setups && analysis.setups.length > 0) {
        const setup = analysis.setups[0];
        console.log("\nSetup details:");
        console.log("  entryZone?.optimal:", setup.entryZone?.optimal);
        console.log("  stopLoss:", setup.stopLoss);
        console.log("  riskPercentage:", setup.riskPercentage);
        console.log("  rr:", setup.rr);
    }
} catch (error) {
    console.error("❌ ERROR:", error.message);
    console.error("Stack:", error.stack);
}

process.exit(0);
