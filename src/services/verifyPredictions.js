/**
 * Prediction Verification Script
 * Standalone utility to verify past predictions against actual market outcomes.
 * Run this periodically (e.g., daily via cron) to update backtesting metrics.
 */

import { backtestingEngine } from './backtestingEngine.js';
import { marketData } from './marketData.js';

/**
 * Verify all pending predictions
 * @param {number} verificationAgeMs - Minimum age of prediction before verification (default: 4 hours)
 */
export async function verifyAllPredictions(verificationAgeMs = 4 * 60 * 60 * 1000) {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'XAUUSD', 'EURUSD', 'GBPUSD', 'SPX', 'NDX'];
    const results = [];

    for (const symbol of symbols) {
        try {
            // Get current price
            const history = await marketData.fetchHistory(symbol, '1h', 1);
            if (!history || history.length === 0) continue;

            const currentPrice = history[0].close;

            // Get all predictions for this symbol
            const predictions = Array.from(backtestingEngine.predictions.values())
                .filter(p => p.symbol === symbol);

            for (const pred of predictions) {
                const result = backtestingEngine.verifyPrediction(
                    symbol,
                    pred.timestamp,
                    currentPrice,
                    verificationAgeMs
                );

                if (result) {
                    results.push(result);
                }
            }
        } catch (error) {
            console.error(`Verification failed for ${symbol}:`, error.message);
        }
    }

    return results;
}

/**
 * Get summary report of all backtesting metrics
 */
export function getBacktestingSummary() {
    const allMetrics = backtestingEngine.getAllMetrics();

    const summary = {
        totalSymbols: allMetrics.length,
        overallAccuracy: 0,
        byRegime: {},
        topPerformers: [],
        needsImprovement: []
    };

    if (allMetrics.length === 0) {
        console.log('No backtesting data available yet.');
        return summary;
    }

    // Calculate overall accuracy
    let totalPredictions = 0;
    let totalCorrect = 0;

    allMetrics.forEach(m => {
        totalPredictions += m.totalPredictions;
        totalCorrect += m.correctPredictions;

        // Aggregate regime stats
        Object.keys(m.regimeStats).forEach(regime => {
            if (!summary.byRegime[regime]) {
                summary.byRegime[regime] = { totalPredictions: 0, correctPredictions: 0 };
            }
            summary.byRegime[regime].totalPredictions += m.regimeStats[regime].sampleSize;
            summary.byRegime[regime].correctPredictions +=
                (m.regimeStats[regime].accuracy / 100) * m.regimeStats[regime].sampleSize;
        });
    });

    summary.overallAccuracy = (totalCorrect / totalPredictions) * 100;

    // Calculate regime accuracy
    Object.keys(summary.byRegime).forEach(regime => {
        const r = summary.byRegime[regime];
        r.accuracy = (r.correctPredictions / r.totalPredictions) * 100;
    });

    // Identify top performers (> 65% accuracy, > 20 predictions)
    summary.topPerformers = allMetrics
        .filter(m => m.accuracy > 65 && m.totalPredictions > 20)
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 5)
        .map(m => ({ symbol: m.symbol, accuracy: m.accuracy }));

    // Identify underperformers (< 45% accuracy, > 10 predictions)
    summary.needsImprovement = allMetrics
        .filter(m => m.accuracy < 45 && m.totalPredictions > 10)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5)
        .map(m => ({ symbol: m.symbol, accuracy: m.accuracy }));

    return summary;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Running prediction verification...');
    verifyAllPredictions()
        .then(results => {
            console.log(`Verified ${results.length} predictions.`);
            const summary = getBacktestingSummary();
            console.log('\n=== BACKTESTING SUMMARY ===');
            console.log(`Overall Accuracy: ${summary.overallAccuracy.toFixed(2)}%`);
            console.log(`\nBy Regime:`);
            Object.keys(summary.byRegime).forEach(regime => {
                const r = summary.byRegime[regime];
                console.log(`  ${regime}: ${r.accuracy.toFixed(2)}% (n=${r.totalPredictions})`);
            });
            console.log(`\nTop Performers:`, summary.topPerformers);
            console.log(`Needs Improvement:`, summary.needsImprovement);
        })
        .catch(err => console.error('Verification error:', err));
}
