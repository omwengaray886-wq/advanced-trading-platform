import { initializeApp, cert, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

async function diag() {
    try {
        const keyPath = 'C:\\Users\\movies\\Downloads\\trading-platform-a13c1-firebase-adminsdk-fbsvc-9eb88a5d26.json';
        const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));

        console.log('Project:', serviceAccount.project_id);

        const app = initializeApp({
            credential: cert(serviceAccount)
        });

        console.log('--- Testing (default) ---');
        try {
            const db1 = getFirestore();
            await db1.collection('_diagnostics_').doc('test').set({ ok: true });
            console.log('✅ (default) WORKED!');
        } catch (e) {
            console.error('❌ (default) FAILED:', e.message);
        }

        console.log('--- Testing "default" ---');
        try {
            const db2 = getFirestore('default');
            await db2.collection('_diagnostics_').doc('test').set({ ok: true });
            console.log('✅ "default" WORKED!');
        } catch (e) {
            console.error('❌ "default" FAILED:', e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error('❌ FATAL DIAGNOSTIC ERROR:', e.message);
        process.exit(1);
    }
}

diag();
