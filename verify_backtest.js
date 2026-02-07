
// Verification Script: Backtest Service Parameters
import { backtestService } from './src/services/backtestService.js';

async function run() {
    console.log('--- Verifying BacktestService Parameters ---');

    const symbol = 'BTCUSDT';

    // Test 1: Baseline
    console.log('Running Baseline Test...');
    const baseline = await backtestService.runBacktest(symbol, '1H', 100, {});
    if (!baseline) { console.error('Failed to run baseline'); return; }
    console.log('Baseline Profit Factor:', baseline.stats.profitFactor);

    // Test 2: Tight Stop (SL x0.5)
    // Expectation: Result should differ (likely worse win rate, but maybe better PF?)
    console.log('Running Tight Stop Test (0.5x)...');
    const tightStop = await backtestService.runBacktest(symbol, '1H', 100, { slMultiplier: 0.5 });
    console.log('Tight Stop Profit Factor:', tightStop?.stats.profitFactor);

    if (baseline.stats.profitFactor !== tightStop?.stats.profitFactor) {
        console.log('SUCCESS: Parameter overrides are affecting results.');
    } else {
        console.warn('WARNING: Results are identical. Overrides might be ignored.');
    }
}

// Mock marketData for the test run context if needed,
// but assuming environment allows importing.
// If specific environment setup is needed, we rely on the implementation logic review.
// For this environment, we just output the code to be run if node env matches.

// Note: This script is for manual inspection reference.
