
import { newsShockEngine } from './services/newsShockEngine.js';
import { newsService } from './services/newsService.js';

// Mock newsService.getUpcomingShocks for testing purposes
// In production, this hits the API/Cache
const originalGetUpcomingShocks = newsService.getUpcomingShocks;

newsService.getUpcomingShocks = async (hours) => {
    console.log('[Mock] Serving mock news shocks...');
    return [
        {
            type: 'CPI Data Release',
            asset: 'USD',
            impact: 'HIGH',
            timestamp: Date.now() + 15 * 60 * 1000, // 15 mins from now
            isImminent: () => true,
            getPhase: () => 'PRE_EVENT',
            getProximity: () => 0.25, // 0.25 hours = 15 mins
            isReleased: () => false
        }
    ];
};

async function testNewsShock() {
    console.log('--- Testing News Shock Engine ---');

    console.log('1. Testing getActiveShock for BTC/USDT (USD dependent)...');
    try {
        const shock = await newsShockEngine.getActiveShock('BTC/USDT');

        if (shock) {
            console.log('✅ Shock Detected:', shock);
            if (shock.severity === 'HIGH') {
                console.log('✅ Severity Correct: HIGH');
            } else {
                console.error('❌ Severity Incorrect:', shock.severity);
            }
        } else {
            console.error('❌ No shock detected');
        }

        console.log('\n2. Testing Suitability Penalty...');
        const penalty = await newsShockEngine.calculateSuitabilityPenalty('BTC/USDT');
        console.log(`Penalty: ${penalty}`);

        if (penalty === 0.5) { // 50% drop logic from newsShockEngine.js
            console.log('✅ Penalty Correct (0.5)');
        } else {
            console.error('❌ Penalty Incorrect (Expected 0.5)');
        }
    } catch (e) {
        console.error('Test Failed:', e);
    } finally {
        // Restore original method
        newsService.getUpcomingShocks = originalGetUpcomingShocks;
    }
}

testNewsShock();
