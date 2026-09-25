import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function checkSignals() {
    try {
        const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './.secrets/firebase-admin-key.json';
        const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
        const dbId = process.env.FIREBASE_DATABASE_ID || 'trade-engine-v1';

        console.log(`Checking database: ${dbId}`);

        initializeApp({
            credential: cert(serviceAccount)
        });

        const db = getFirestore(dbId);
        const snapshot = await db.collection('globalSignals').limit(5).get();

        if (snapshot.empty) {
            console.log('📭 No signals found in globalSignals collection.');
        } else {
            console.log(`✅ Found ${snapshot.size} signals:`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- [${doc.id}] ${data.symbol} ${data.direction} (${data.confluenceScore}%)`);
            });
        }

        process.exit(0);
    } catch (e) {
        console.error('❌ Error checking signals:', e.message);
        process.exit(1);
    }
}

checkSignals();
