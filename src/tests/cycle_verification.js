import { EdgeScoringEngine } from '../services/EdgeScoringEngine.js';
import { AnnotationMapper } from '../services/annotationMapper.js';

/**
 * Phase 7: Institutional Cycle Intelligence Verification
 */
async function verifyPhase7() {
    console.log('--- STARTING PHASE 7 VERIFICATION ---\n');

    const mockSetup = {
        direction: 'LONG',
        strategy: { name: 'Institutional Scalper' },
        rr: 3.0
    };

    const mockMarketState = {
        symbol: 'BTCUSDT',
        currentPrice: 50000,
        timeframe: '1h',
        session: { killzone: 'NY_OPEN' },
        // Phase 7: Institutional Cycles
        amdCycle: {
            phase: 'MANIPULATION',
            behavior: 'JUDAS_SWING',
            direction: 'BEARISH', // Trapping sellers
            note: 'Judas Swing detected near NY_OPEN'
        },
        wyckoffPhase: {
            phase: 'PHASE_C',
            type: 'SPRING',
            note: 'Spring detected - Bullish test successful',
            action: 'PREPARE_LONG'
        },
        mtf: { globalBias: 'BULLISH' },
        trend: { strength: 0.8 },
        volumeAnalysis: { isInstitutional: true }
    };

    // 1. Verify EdgeScoringEngine Weighting
    console.log('[Test 1] Verifying EdgeScoringEngine weighting for Cycle Confluence...');
    const scoringResult = EdgeScoringEngine.calculateScore(mockSetup, mockMarketState, { probability: 0.7 });

    console.log('Score:', scoringResult.score);
    console.log('Positives:', scoringResult.breakdown.positives.filter(p => p.includes('Wyckoff') || p.includes('manipulation')));

    const hasWyckoffBonus = scoringResult.breakdown.positives.some(p => p.includes('Institutional Test detected (Phase C: SPRING)'));
    const hasAMDFeedback = scoringResult.breakdown.positives.some(p => p.includes('Fading manipulation move (Pro-Trend)'));

    console.log(`Wyckoff Bonus: ${hasWyckoffBonus ? 'PASS' : 'FAIL'}`);
    console.log(`AMD Feedback: ${hasAMDFeedback ? 'PASS' : 'FAIL'}`);

    // 2. Verify Annotation Mapping
    console.log('\n[Test 2] Verifying AnnotationMapper visual mapping for Phase 7...');
    const overlays = AnnotationMapper.mapToOverlays([], {
        lastCandleTime: 1700000000,
        marketState: mockMarketState
    });

    const hasManipulationZone = overlays.zones.some(z => z.label.includes('MANIPULATION'));
    const hasWyckoffLabel = overlays.labels.some(l => l.text.includes('WYCKOFF SPRING'));

    console.log(`Manipulation Zone Mapped: ${hasManipulationZone ? 'PASS' : 'FAIL'}`);
    console.log(`Wyckoff Spring Label Mapped: ${hasWyckoffLabel ? 'PASS' : 'FAIL'}`);

    if (hasWyckoffBonus && hasAMDFeedback && hasManipulationZone && hasWyckoffLabel) {
        console.log('\n✅ PHASE 7 VERIFICATION SUCCESSFUL');
    } else {
        console.log('\n❌ PHASE 7 VERIFICATION FAILED');
        process.exit(1);
    }
}

verifyPhase7().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
