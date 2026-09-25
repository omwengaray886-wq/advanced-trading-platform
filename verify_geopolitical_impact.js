
import { newsShockEngine } from './src/services/newsShockEngine.js';
import { newsService } from './src/services/newsService.js';
import { GeopoliticalEvent } from './src/models/GeopoliticalEvent.js';

// Mock newsService.getUpcomingShocks
const originalGetUpcomingShocks = newsService.getUpcomingShocks;

newsService.getUpcomingShocks = async (hours) => {
    console.log('[Mock] Serving mock GEOPOLITICAL shock...');
    return [
        {
            type: 'Emergency: Regional Conflict Escalation',
            asset: 'USD',
            impact: 'HIGH',
            category: 'GEOPOLITICAL', // Key field
            timestamp: Date.now(),
            isImminent: () => true,
            getPhase: () => 'ACTIVE',
            getProximity: () => 0,
            isReleased: () => true
        }
    ];
};

async function verifyGeopoliticalRisk() {
    console.log('--- Testing Geopolitical Risk Engine ---');

    console.log('\n[TEST 1] War Headline Impact on Crypto (Risk Asset)');
    const cryptoPenalty = await newsShockEngine.calculateSuitabilityPenalty('BTC/USDT');
    console.log(`Crypto Penalty: ${cryptoPenalty}`);

    if (cryptoPenalty === 0.6) {
        console.log('✅ PASS: High penalty (60%) applied to Crypto during active conflict.');
    } else {
        console.error(`❌ FAIL: Expected 0.6, got ${cryptoPenalty}`);
    }

    console.log('\n[TEST 2] War Headline Impact on Gold (Safe Haven)');
    const goldPenalty = await newsShockEngine.calculateSuitabilityPenalty('XAUUSDT');
    console.log(`Gold Penalty: ${goldPenalty}`);

    if (goldPenalty === -0.4) {
        console.log('✅ PASS: Negative penalty (Boost) applied to Gold.');
    } else {
        console.error(`❌ FAIL: Expected -0.4 (Boost), got ${goldPenalty}`);
    }

    // Restore
    newsService.getUpcomingShocks = originalGetUpcomingShocks;
}

verifyGeopoliticalRisk();
