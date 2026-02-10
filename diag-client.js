import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

async function diag() {
    try {
        console.log('Testing with Client SDK...');
        console.log('Project:', firebaseConfig.projectId);

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        const res = await addDoc(collection(db, "_diagnostics_"), {
            timestamp: Date.now(),
            from: 'client-sdk-node'
        });

        console.log('✅ Client SDK SUCCESS! Doc ID:', res.id);
        process.exit(0);
    } catch (e) {
        console.error('❌ Client SDK FAILED:', e.message);
        process.exit(1);
    }
}

diag();
