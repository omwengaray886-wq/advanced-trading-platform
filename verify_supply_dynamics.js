
import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';
import { onChainService } from './src/services/onChainService.js';
import { marketData } from './src/services/marketData.js';

// Mock Dependencies
const mockCandles = Array(200).fill({ close: 50000, high: 51000, low: 49000, volume: 1000, time: Date.now() });

async function runTest() {
    console.log('--- Verifying Phase 16: Supply Dynamics ---');

    console.log('1. Testing Whale Alert Fetching...');
    const alerts = await onChainService.getWhaleAlerts('BTC');
    console.log(`Fetched ${alerts.length} whale alerts.`);
    if (alerts.length > 0) {
        console.log('Sample Alert:', alerts[0]);
    } else {
        console.warn('No whale alerts generated (retry might be needed due to random simulation).');
    }

    console.log('\n2. Testing Exchange Flow Fetching...');
    const flows = await onChainService.getRealExchangeFlows('BTC');
    console.log('Exchange Flows:', flows);

    console.log('\n3. Testing Integration with Analysis Orchestrator...');
    const orchestrator = new AnalysisOrchestrator();

    // Mock the analyze method's internal calls (integration test)
    // We actually want to run the real analyze method to see if it populates marketState.supplyDynamics

    try {
        const result = await orchestrator.analyze(mockCandles, 'BTCUSDT', '1h');

        if (result.marketState.supplyDynamics) {
            console.log('SUCCESS: marketState.supplyDynamics populated.');
            console.log('Score:', result.marketState.supplyDynamics.score);
            console.log('Whale Alerts in Analysis:', result.marketState.supplyDynamics.whaleAlerts.length);

            // Verify Annotations
            const whaleAnnos = result.annotations.filter(a => a.type === 'WHALE_ALERT');
            console.log(`Whale Alert Annotations generated: ${whaleAnnos.length}`);
            if (whaleAnnos.length > 0) {
                console.log('Sample Annotation Label:', whaleAnnos[0].getLabel());
            }
        } else {
            console.error('FAILURE: marketState.supplyDynamics is missing.');
        }
    } catch (err) {
        console.error('Analysis failed:', err);
    } finally {
        console.log('Test Complete. Exiting...');
        process.exit(0);
    }
}

runTest();
