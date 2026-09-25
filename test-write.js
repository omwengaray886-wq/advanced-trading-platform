import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

try {
    const serviceAccount = JSON.parse(readFileSync('./.secrets/firebase-admin-key.json', 'utf8'));
    initializeApp({
        credential: cert(serviceAccount)
    });
    const db = getFirestore();
    console.log('Testing Write...');
    const res = await db.collection('_test_').add({
        test: true,
        at: new Date().toISOString()
    });
    console.log('WRITE SUCCESS:', res.id);
    process.exit(0);
} catch (e) {
    console.error('FAILED:', e.message);
    process.exit(1);
}
