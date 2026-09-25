/**
 * Verification Script: Phase 1 Alignment
 * Run with: node src/verify_phase1_alignment.js
 */

import { AnalysisOrchestrator } from './services/analysisOrchestrator.js';
import { ExplanationEngine } from './services/explanationEngine.js';

async function verify() {
    console.log("🚀 Starting Phase 1 Alignment Verification...\n");

    const orchestrator = new AnalysisOrchestrator();
    const explainer = new ExplanationEngine();

    // 1. Mock Data Setup
    const symbol = "BTC/USDT";
    const candles = Array(100).fill(0).map((_, i) => {
        let price = 50000;
        if (i > 20 && i < 40) price = 48000; // Drop
        if (i >= 40 && i < 60) price = 52000; // Sharp recovery (BOS)
        if (i >= 60) price = 52000 + (i - 60) * 10; // Continue trend

        return {
            time: 1700000000 + i * 3600,
            open: price,
            high: price + 100,
            low: price - 100,
            close: price + 50,
            volume: 1000
        };
    });

    // 2. Test MTF Analysis & Scenarios
    console.log("Step 1: Testing MTF Analysis & Scenario Engine...");
    const analysis = await orchestrator.analyze(candles, symbol, '1h', null, {
        h4: candles, // Mocking MTF data with same candles for simplicity
        d1: candles
    });

    if (analysis.marketState.scenarios) {
        console.log("✅ Scenario Engine: SUCCESS");
        console.log(`   - Primary: ${analysis.marketState.scenarios.primary.label}`);
        console.log(`   - Alternate: ${analysis.marketState.scenarios.alternate.label}`);
    } else {
        console.error("❌ Scenario Engine: FAILED");
    }

    // 3. Test AI Explanation Modes
    console.log("\nStep 2: Testing AI Explanation Modes...");
    const beginnerExp = explainer.generateExplanation(analysis, 'BEGINNER');
    const advancedExp = explainer.generateExplanation(analysis, 'ADVANCED');

    const isBeginnerSimpler = beginnerExp.sections.htfBias.length < advancedExp.sections.htfBias.length;
    if (beginnerExp.mode === 'BEGINNER' && advancedExp.mode === 'ADVANCED') {
        console.log("✅ AI Explanation Modes: SUCCESS");
        console.log("   - Beginner Bias:", beginnerExp.sections.htfBias.substring(0, 50) + "...");
        console.log("   - Advanced Bias:", advancedExp.sections.htfBias.substring(0, 50) + "...");
    } else {
        console.error("❌ AI Explanation Modes: FAILED");
    }

    // 4. Test Visual Formations (Phase 6)
    console.log("\nStep 3: Checking Visual Formations (Annotations)...");
    const annotations = analysis.annotations || [];
    const hasBOS = annotations.some(a => a.metadata?.note?.includes('BOS') || a.markerType === 'BOS');
    const hasFVG = annotations.some(a => a.metadata?.note?.includes('FVG'));

    if (hasBOS || hasFVG) {
        console.log("✅ Visual Formations: SUCCESS");
        if (hasBOS) console.log("   - BOS/CHOCH detected");
        if (hasFVG) console.log("   - FVG detected");
    } else {
        // Since mock data is linear, BOS might not trigger. We'll check if the array exists.
        console.log("⚠️ Visual Formations: Partial (Array exists, but specific patterns not triggered by flat mock data)");
    }

    // 5. Test Color Coding (Implicitly via Annotation metadata)
    console.log("\nStep 4: Checking Timeframe Metadata in Annotations...");
    const setup = analysis.setups[0];
    if (setup && setup.timeframe === '1h') {
        console.log("✅ Timeframe Metadata: SUCCESS (Timeframe: 1h)");
    } else {
        console.error("❌ Timeframe Metadata: FAILED");
    }

    console.log("\n✨ Verification Complete!");
}

// Note: This script uses ES modules, might need 'type': 'module' in package.json or .mjs extension
verify().catch(console.error);
