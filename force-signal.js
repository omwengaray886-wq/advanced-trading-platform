// Force immediate signal generation for testing
import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';
import MultiTimeframeValidator from './src/services/MultiTimeframeValidator.js';
import { marketData } from './src/services/marketData.js';
import { db as dbService } from './src/services/db.js';
import { DATABASE_ID } from './src/lib/firebase.js';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-admin-key.json';
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
const adminApp = initializeApp({ credential: cert(serviceAccount) });
const adminDb = getFirestore(DATABASE_ID !== '(default)' ? DATABASE_ID : undefined);
dbService.setInternalDb(adminDb);

console.log("🚀 Forcing Signal Generation...\n");

const symbol = 'BTCUSDT';
const timeframes = ['5m', '15m', '1h'];

for (const tf of timeframes) {
    console.log(`\n📊 Analyzing ${symbol} on ${tf}...`);

    const candles = await marketData.fetchHistory(symbol, tf, 300);
    if (!candles || candles.length < 50) {
        console.log(`  ❌ Insufficient data`);
        continue;
    }

    const orchestrator = new AnalysisOrchestrator();
    const analysis = await orchestrator.analyze(candles, symbol, tf, null, null, true);

    if (!analysis || !analysis.setups || analysis.setups.length === 0) {
        console.log(`  ➖ No setups found`);
        continue;
    }

    console.log(`  ✅ Found ${analysis.setups.length} setup(s)`);

    // Validate with MTF
    const results = await Promise.all(
        timeframes.map(async (validationTf) => {
            const validationCandles = await marketData.fetchHistory(symbol, validationTf, 100);
            const validationOrchestrator = new AnalysisOrchestrator();
            const validationAnalysis = await validationOrchestrator.analyze(
                validationCandles,
                symbol,
                validationTf,
                null,
                null,
                true
            );
            return { tf: validationTf, analysis: validationAnalysis };
        })
    );

    // Check best setup
    const bestSetup = analysis.setups[0];
    console.log(`\n  🎯 Best Setup:`);
    console.log(`     Direction: ${bestSetup.direction}`);
    console.log(`     Entry: ${bestSetup.entryZone?.optimal || 'N/A'}`);
    console.log(`     Stop: ${bestSetup.stopLoss || 'N/A'}`);
    console.log(`     Target: ${bestSetup.targets?.[0]?.price || 'N/A'}`);
    console.log(`     Risk %: ${bestSetup.riskPercentage || 'N/A'}`);
    console.log(`     Confidence: ${(bestSetup.directionalConfidence * 100).toFixed(1)}%`);

    // Validate
    const validation = MultiTimeframeValidator.validate(results);
    console.log(`\n  🔍 MTF Validation:`);
    console.log(`     Confluence Score: ${validation.confluenceScore}`);
    console.log(`     Is Valid: ${validation.isValid}`);

    if (validation.isValid) {
        const signal = MultiTimeframeValidator.buildInstitutionalSignal(results, symbol, validation);
        console.log(`\n  ✅ PUBLISHING SIGNAL...`);
        console.log(`     Symbol: ${signal.symbol}`);
        console.log(`     Direction: ${signal.direction}`);
        console.log(`     Entry: ${signal.entry}`);
        console.log(`     Risk %: ${signal.riskPercentage || 'N/A'}%`);

        await dbService.publishGlobalSignal(signal);
        console.log(`  ✅ Signal published to Firestore!`);
        break; // Stop after first valid signal
    } else {
        console.log(`  ❌ Failed MTF validation`);
    }
}

console.log("\n✅ Done");
process.exit(0);
