
import MultiTimeframeValidator from '../src/services/MultiTimeframeValidator.js';

async function runTests() {
    console.log('🧪 Testing MultiTimeframeValidator...');

    const mockAnalysis = (tf, direction, edgeScore, institutional) => ({
        tf,
        analysis: {
            symbol: 'BTCUSDT',
            setups: [{
                direction,
                edgeScore,
                entry: 50000,
                stop: 49000,
                targets: [{ price: 52000 }],
                rr: 2
            }],
            probabilities: { bias: direction },
            marketState: {
                volumeAnalysis: { isInstitutional: institutional },
                smtConfluence: institutional ? 80 : 50
            }
        }
    });

    async function test1() {
        // Test 1: Insufficient Timeframes (3 TFs)
        console.log('\nTest 1: Insufficient Timeframes (3 TFs)');
        try {
            const result = await MultiTimeframeValidator.validate([
                mockAnalysis('1h', 'LONG', 8, true),
                mockAnalysis('4h', 'LONG', 8, true),
                mockAnalysis('1d', 'LONG', 8, true)
            ]);
            if (result === null) console.log('✅ PASS: Rejected < 4 TFs');
            else console.error('❌ FAIL: Accepted < 4 TFs', result);
        } catch (e) {
            console.error('❌ FAIL: Test 1 threw an error:', e);
        }
    }
    await test1();

    async function test2() {
        // Test 2: Sufficient Timeframes (4 TFs) but low score
        console.log('\nTest 2: Sufficient Timeframes (4 TFs) - Low Score');
        try {
            const result = await MultiTimeframeValidator.validate([
                mockAnalysis('15m', 'LONG', 5, false), // Weak
                mockAnalysis('1h', 'LONG', 5, false),
                mockAnalysis('4h', 'LONG', 5, false),
                mockAnalysis('1d', 'LONG', 5, false)
            ]);
            if (result === null) console.log('✅ PASS: Rejected low score');
            else console.error('❌ FAIL: Accepted low score', result);
        } catch (e) {
            console.error('❌ FAIL: Test 2 threw an error:', e);
        }
    }
    await test2();

    async function test3() {
        // Test 3: High Conviction Setup
        console.log('\nTest 3: High Conviction Setup (4 TFs, Institutional)');
        try {
            const result = await MultiTimeframeValidator.validate([
                mockAnalysis('15m', 'LONG', 9, true),
                mockAnalysis('1h', 'LONG', 9, true),
                mockAnalysis('4h', 'LONG', 9, true), // Alignment with HTF
                mockAnalysis('1d', 'LONG', 8, true)
            ]);

            if (result && result.isInstitutionalGrade) {
                console.log('✅ PASS: Accepted high conviction setup');
                console.log(`   Score: ${result.confluenceScore}`);
                console.log('   Breakdown:', result.confluenceBreakdown);
            } else {
                console.error('❌ FAIL: Rejected high conviction setup', result);
            }
        } catch (e) {
            console.error('❌ FAIL: Test 3 threw an error:', e);
        }
    }
    await test3();

    // Allow logs to flush
    await new Promise(resolve => setTimeout(resolve, 500));
    process.exit(0);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
