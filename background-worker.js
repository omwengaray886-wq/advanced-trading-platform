import 'dotenv/config';
/**
 * Background Worker - Automated Market Analysis
 * Continuously analyzes markets and publishes high-conviction signals
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';
import MultiTimeframeValidator from './src/services/MultiTimeframeValidator.js';
import { marketData } from './src/services/marketData.js';
import { db as dbService } from './src/services/db.js';
import { DATABASE_ID } from './src/lib/firebase.js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';


// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-admin-key.json';
let serviceAccount;

try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    console.log('✅ Firebase Admin key loaded successfully');
} catch (error) {
    console.error('❌ Failed to load Firebase Admin key:', error.message);
    console.error('Make sure you have copied your Firebase Admin SDK key to:', serviceAccountPath);
    process.exit(1);
}

const adminApp = initializeApp({
    credential: cert(serviceAccount)
});
const adminDb = getFirestore(DATABASE_ID !== '(default)' ? DATABASE_ID : undefined);
dbService.setInternalDb(adminDb);
const db = adminDb; // Keep local db reference for direct queries if needed


// Configuration
const TRACKED_ASSETS = [
    'BTCUSDT',
    'ETHUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'XRPUSDT',
    'ADAUSDT',
    'DOGEUSDT',
    'MATICUSDT'
];

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d', '1w'];
const ANALYSIS_INTERVAL = parseInt(process.env.WORKER_INTERVAL || '15') * 60 * 1000; // Default 15 mins

console.log('🚀 Background Worker Starting...');
console.log(`📊 Tracking ${TRACKED_ASSETS.length} assets`);
console.log(`⏱️  Analysis interval: ${ANALYSIS_INTERVAL / 60000} minutes`);

/**
 * Analyze all timeframes for a symbol
 */
async function analyzeAllTimeframes(symbol) {
    console.log(`\n🔍 Analyzing ${symbol} across all timeframes...`);

    // Execute all timeframe analyses in parallel
    const tfPromises = TIMEFRAMES.map(async (tf) => {
        try {
            // Fetch candles
            const candles = await marketData.fetchHistory(symbol, tf, 300);
            if (!candles || candles.length < 50) {
                return { tf, skip: true, reason: 'Insufficient data' };
            }

            // Run analysis
            const orchestrator = new AnalysisOrchestrator();
            const analysis = await orchestrator.analyze(candles, symbol, tf, null, null, true); // isLight = true for speed

            if (analysis && analysis.setups && analysis.setups.length > 0) {
                return { tf, analysis };
            }
            return { tf, skip: true, reason: 'No setups' };
        } catch (tfError) {
            return { tf, error: tfError.message };
        }
    });

    const results = await Promise.all(tfPromises);

    // Log results in order
    results.forEach(res => {
        if (res.skip) {
            console.log(`  ➖ ${res.tf}: ${res.reason}`);
        } else if (res.error) {
            console.log(`  ❌ ${res.tf}: ${res.error}`);
        } else {
            console.log(`  ✅ ${res.tf}: ${res.analysis.setups.length} setup(s) found`);
        }
    });

    return results.filter(r => r.tf && r.analysis);
}

/**
 * Publish validated signal to Firestore
 */
async function publishSignal(signal) {
    if (!signal) return false;

    try {
        await dbService.saveGlobalSignal(signal);
        console.log(`✨ Published signal: ${signal.symbol} ${signal.direction} (${signal.confluenceScore}% confluence)`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to publish signal:`, error.message);
        return false;
    }
}

/**
 * Update existing signals status
 */
async function updateExistingSignals() {
    try {
        const activeSignals = await dbService.getGlobalSignals();

        for (const signal of activeSignals) {
            // Signal from getGlobalSignals already has id in it
            const docRef = db.collection('globalSignals').doc(signal.id);

            // Get current price
            const candles = await marketData.fetchHistory(signal.symbol, '1m', 1);
            if (!candles || candles.length === 0) continue;

            const currentPrice = candles[candles.length - 1].close;

            // Update status
            const updatedSignal = MultiTimeframeValidator.updateSignalStatus(signal, currentPrice);

            if (updatedSignal.status !== signal.status) {
                await docRef.update({
                    status: updatedSignal.status,
                    updatedAt: new Date().toISOString(),
                    ...(updatedSignal.hitTargets ? { hitTargets: updatedSignal.hitTargets } : {})
                });
                console.log(`📊 Updated ${signal.symbol}: ${signal.status} → ${updatedSignal.status}`);
            }
        }
    } catch (error) {
        console.error('❌ Failed to update signals:', error.message);
    }
}

/**
 * Clean up expired signals
 */
async function cleanupExpiredSignals() {
    try {
        const now = Date.now();
        const expiredSignals = await db.collection('globalSignals')
            .where('expiresAt', '<', now)
            .get();

        if (expiredSignals.empty) return;

        const batch = db.batch();
        expiredSignals.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`🗑️  Cleaned up ${expiredSignals.size} expired signals`);
    } catch (error) {
        console.error('❌ Failed to cleanup signals:', error.message);
    }
}

/**
 * Main analysis loop
 */
async function runAnalysisCycle() {
    console.log('\n' + '='.repeat(50));
    console.log(`🔄 Starting analysis cycle at ${new Date().toISOString()}`);
    console.log('='.repeat(50));

    const startTime = Date.now();

    // Update existing signals first
    await updateExistingSignals();
    await cleanupExpiredSignals();

    // Analyze each asset
    for (const symbol of TRACKED_ASSETS) {
        try {
            const timeframeResults = await analyzeAllTimeframes(symbol);

            if (timeframeResults.length >= 4) {
                // Validate multi-timeframe confluence
                const validatedSignal = await MultiTimeframeValidator.validate(timeframeResults);


                if (validatedSignal) {
                    await publishSignal(validatedSignal);
                } else {
                    console.log(`  ⚠️  ${symbol}: No signal met 70% confluence threshold`);
                }
            } else {
                console.log(`  ➖ ${symbol}: Insufficient timeframe setups (${timeframeResults.length}/3 min)`);
            }
        } catch (error) {
            console.error(`❌ Failed to process ${symbol}:`, error.message);
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Analysis cycle complete in ${duration}s`);
    console.log(`⏰ Next cycle in ${ANALYSIS_INTERVAL / 60000} minutes\n`);
}

/**
 * Start the worker
 */
async function start() {
    // Run initial cycle immediately
    await runAnalysisCycle();

    // Schedule recurring cycles
    setInterval(async () => {
        await runAnalysisCycle();
    }, ANALYSIS_INTERVAL);

    console.log('✅ Background worker is running');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down background worker...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Shutting down background worker...');
    process.exit(0);
});

// Start the worker
start().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
