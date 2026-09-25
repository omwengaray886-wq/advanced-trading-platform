import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function mockSignal() {
    try {
        const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './.secrets/firebase-admin-key.json';
        const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
        const dbId = process.env.FIREBASE_DATABASE_ID || 'trade-engine-v1';

        console.log(`Writing mock signal to database: ${dbId}`);

        const adminApp = initializeApp({
            credential: cert(serviceAccount)
        });

        const db = getFirestore(dbId);

        const signal = {
            symbol: 'BTCUSDT',
            direction: 'LONG',
            entry: 50000,
            targets: [51000, 52000],
            stop: 49000,
            confluenceScore: 85,
            confluenceBreakdown: ['Strong alignment (5 TFs)', 'HTF confirmation'],
            publishedAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000),
            status: 'ACTIVE',
            explanation: 'Institutional accumulation detected at 50k wholesale level.',
            edgeScore: 8.5,
            strategy: 'SILVER_BULLET'
        };

        const docId = `BTCUSDT_LONG_${Date.now()}`;
        await db.collection('globalSignals').doc(docId).set(signal);

        console.log(`✅ Mock signal written! ID: ${docId}`);
        process.exit(0);
    } catch (e) {
        console.error('❌ Error writing mock signal:', e.message);
        process.exit(1);
    }
}

mockSignal();
