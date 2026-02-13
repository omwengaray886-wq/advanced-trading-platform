// src/lib/firebase.js
import { initializeApp as initializeClientApp } from "firebase/app";
import { getAuth as getClientAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore as getClientFirestore
} from "firebase/firestore";

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;

const getEnv = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  return {};
};

const env = getEnv();

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseId: env.FIREBASE_DATABASE_ID || env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

const DATABASE_ID = firebaseConfig.databaseId;


let app, auth, db;

if (isNode) {
  // Node.js environment - Placeholder for Admin SDK handled in db.js or background-worker.js
  // We export nulls here to follow the pattern, but the worker will use admin sdk directly
  app = null;
  auth = null;
  db = null;
} else {
  // Browser environment
  try {
    app = initializeClientApp(firebaseConfig);
    auth = getClientAuth(app);

    // Robust Firestore Init with Fallback
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        databaseId: DATABASE_ID !== '(default)' ? DATABASE_ID : undefined
      });
    } catch (persistenceError) {
      console.warn("Firestore Persistence failed, falling back to memory cache:", persistenceError);
      db = getClientFirestore(app, DATABASE_ID !== '(default)' ? DATABASE_ID : undefined);
    }
  } catch (error) {
    console.warn("Firebase initialization failed (likely missing env vars). Using mock services.");
    app = {};
    auth = {};
    db = {};
  }
}

export { auth, db, isNode, DATABASE_ID };
export default app;

