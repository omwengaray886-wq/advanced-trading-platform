import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

async function diag() {
    try {
        const keyPath = './.secrets/firebase-admin-key.json';
        const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));

        console.log('Project:', serviceAccount.project_id);

        const app = initializeApp({
            credential: cert(serviceAccount)
        });

        console.log('--- Testing "trade-engine-v1" ---');
        try {
            const db = getFirestore('trade-engine-v1');
            await db.collection('_diagnostics_').doc('test').set({
                ok: true,
                time: new Date().toISOString()
            });
            console.log('✅ trade-engine-v1 SUCCESS!');
        } catch (e) {
            console.error('❌ trade-engine-v1 FAILED:', e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error('❌ FATAL DIAGNOSTIC ERROR:', e.message);
        process.exit(1);
    }
}

diag();
