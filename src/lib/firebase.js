// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Safe access to import.meta.env (Vite-specific, not available in Node.js)
const getEnv = (key, fallback) => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  return fallback;
};

// TODO: Replace with your specific Firebase project configuration
// You can get this from the Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY', "AIzaSyCBK9A0Z5BZv2lbODoyY6tRHg_qPjLarcs"),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN', "trading-platform-a13c1.firebaseapp.com"),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID', "trading-platform-a13c1"),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET', "trading-platform-a13c1.firebasestorage.app"),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', "190067262568"),
  appId: getEnv('VITE_FIREBASE_APP_ID', "1:190067262568:web:17c35825090caf2c3667dd"),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID', "G-6Y67V5D8Y2")
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
