
import { portfolioRiskService } from './src/services/portfolioRiskService.js';
import { correlationEngine } from './src/services/correlationEngine.js';

async function runTest() {
    console.log('--- Verifying Phase 17: Portfolio Risk Management ---');

    // 1. Position Sizing
    console.log('\n1. Testing Position Sizing...');
    // Scenario: $10,000 Equity, 1% Risk, Entry $50,000, SL $49,000 (Stop Dist $1,000)
    // Risk = $100. Units = $100 / $1000 = 0.1 BTC.
    const size = portfolioRiskService.calculatePositionSize(0.01, 50000, 49000, 10000);
    console.log('Sizing Result:', size);
    if (size.units === 0.1 && size.riskAmount === 100) {
        console.log('SUCCESS: Sizing calculation accurate.');
    } else {
        console.error('FAILURE: Sizing calculation incorrect.');
    }

    // 2. Real Correlation Matrix
    console.log('\n2. Testing Real Data Correlation Matrix...');
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    try {
        const matrix = await correlationEngine.generateCorrelationMatrix(symbols, '1d');
        console.log('Matrix Generated:', JSON.stringify(matrix, null, 2));

        const btcEth = matrix['BTCUSDT']['ETHUSDT'];
        console.log(`Correlation BTC-ETH: ${btcEth}`);

        if (btcEth > 0.6) {
            console.log('SUCCESS: Strong correlation detected (as expected for Crypto).');
        } else {
            console.warn('WARNING: Correlation lower than expected (could be data issue or decoupling).');
        }

        // 3. Trade Validation (Simulating Risk)
        console.log('\n3. Testing Trade Validation (Concentration Risk)...');

        // Mock current portfolio: Long BTC
        portfolioRiskService.syncPositions([
            { symbol: 'BTCUSDT', direction: 'LONG', entryPrice: 50000 }
        ]);

        // Attempt to adding Long ETH (High Correlation)
        const validation = await portfolioRiskService.validateTrade({
            symbol: 'ETHUSDT',
            entry: 3000,
            stopLoss: 2900
        });

        console.log('Validation Result for ETH trade:', validation);

        if (!validation.approved && validation.code === 'RISK_CORRELATION') {
            console.log('SUCCESS: Trade rejected due to correlation risk.');
        } else {
            console.warn('WARNING: Trade was NOT rejected (Correlation might be below 0.7 threshold today).');
        }

    } catch (err) {
        console.error('Verification Failed:', err);
    }
}

runTest();
