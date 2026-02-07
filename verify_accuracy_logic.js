/**
 * Phase 66 Verification Script: Predictive Accuracy Logic
 * Simulates high-confluence vs. low-confluence scenarios.
 */
import 'dotenv/config';
import { MarketObligationEngine } from './src/analysis/MarketObligationEngine.js';
import { EdgeScoringEngine } from './src/services/edgeScoringEngine.js';

async function runVerification() {
    console.log('--- STARTING PHASE 66 ACCURACY VERIFICATION ---');

    // SCENARIO 1: PREMIUM INSTITUTIONAL SETUP
    const premiumState = {
        currentPrice: 100,
        session: { active: 'LONDON', killzone: 'LONDON_OPEN' },
        obligations: {
            primaryObligation: { urgency: 85, price: 110 },
            state: 'OBLIGATED'
        },
        correlation: { bias: 'BULLISH' },
        volumeAnalysis: { isInstitutional: true },
        divergences: [{ type: 'SMT' }],
        mtf: { globalBias: 'BULLISH' },
        trend: { direction: 'BULLISH', strength: 0.8 },
        confidence: 0.9
    };

    const setupA = {
        direction: 'BULLISH',
        suitability: 0.8,
        entryZone: { optimal: 100 }
    };

    const premiumScore = EdgeScoringEngine.calculateScore(setupA, premiumState, { continuation: 80 });
    console.log(`\nScenario 1 (Premium): Score = ${premiumScore.score} (${EdgeScoringEngine.getScoreLabel(premiumScore.score)})`);

    if (premiumScore.score >= 9.0) console.log('✅ PASS: Premium setup correctly scored high.');
    else console.error(`❌ FAIL: Premium setup score too low (${premiumScore.score}).`);


    // SCENARIO 2: CORRELATION CONFLICT
    const conflictState = {
        ...premiumState,
        correlation: { bias: 'BEARISH' } // Direct conflict
    };

    const conflictScore = EdgeScoringEngine.calculateScore(setupA, conflictState, { continuation: 80 });
    console.log(`\nScenario 2 (Conflict): Score = ${conflictScore.score}`);

    if (conflictScore.score <= premiumScore.score - 1.5) console.log('✅ PASS: Correlation conflict penalized score.');
    else console.error(`❌ FAIL: Correlation conflict not sufficiently penalized (${conflictScore.score} vs ${premiumScore.score}).`);


    // SCENARIO 3: NO OBLIGATION / FREE ROAMING
    const freeState = {
        ...premiumState,
        obligations: { state: 'FREE_ROAMING', primaryObligation: null },
        session: { active: 'ASIAN', killzone: null }
    };

    const freeScore = EdgeScoringEngine.calculateScore(setupA, freeState, { continuation: 80 });
    console.log(`\nScenario 3 (Low Confluence): Score = ${freeScore.score}`);

    if (freeScore.score <= premiumScore.score - 1.5) console.log('✅ PASS: Low confluence correctly scored lower.');
    else console.error(`❌ FAIL: Low confluence score too high (${freeScore.score} vs ${premiumScore.score}).`);

    console.log('\n--- VERIFICATION COMPLETE ---');
}

runVerification().catch(e => {
    console.error('Verification crashed:', e);
});
