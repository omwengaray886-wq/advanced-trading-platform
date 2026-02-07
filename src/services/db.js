import { db } from '../lib/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';

// --- User Profiles ---
export const createUserProfile = async (uid, data) => {
    try {
        await setDoc(doc(db, "users", uid), {
            ...data,
            createdAt: new Date().toISOString(),
            plan: 'pro' // Default plan
        });
    } catch (e) {
        console.error("Error creating user profile: ", e);
    }
};

export const getUserProfile = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    } else {
        return null;
    }
};

// --- Trade Setups ---
export const subscribeToTradeSetups = (callback) => {
    const q = query(collection(db, "tradeSetups"));
    return onSnapshot(q, (querySnapshot) => {
        const setups = [];
        querySnapshot.forEach((doc) => {
            setups.push({ id: doc.id, ...doc.data() });
        });
        callback(setups);
    });
};

export const saveTradeSetups = async (setups) => {
    try {
        const promises = setups.map(setup => {
            // Create composite ID to prevent overwrites between assets (e.g. "BTC/USDT-A")
            // But allow overwrites for the SAME asset (updating the "A" setup for BTC)
            const safeSymbol = (setup.symbol || 'UNKNOWN').replace('/', '').replace('-', '');
            const docId = `${safeSymbol}-${setup.id}`;

            // Sanitize data to remove custom class instances which Firestore rejects
            const safeData = JSON.parse(JSON.stringify(setup));

            return setDoc(doc(db, "tradeSetups", docId), {
                ...safeData,
                // Ensure ID in data matches doc ID for easier referencing
                dbId: docId,
                timestamp: Date.now(), // Ensure fresh timestamp
                status: 'ACTIVE'
            });
        });
        await Promise.all(promises);
        return true;
    } catch (e) {
        console.error("Error saving trade setups: ", e);
        return false;
    }
};

// --- Market Analysis (Phase 8) ---
/**
 * Save complete analysis snapshot to Firestore
 * Path: /analysis/{symbol}/{timeframe}/snapshots
 */
export const saveAnalysis = async (symbol, timeframe, analysis) => {
    try {
        const cleanSymbol = symbol.replace('/', '_').toUpperCase();
        const cleanTimeframe = timeframe.toUpperCase();

        // Use a subcollection for snapshots to keep history if needed, 
        // or just a single doc for "latest"
        const docRef = doc(db, "analysis", cleanSymbol, cleanTimeframe, "latest");

        await setDoc(docRef, {
            ...analysis,
            updatedAt: new Date().toISOString()
        });

        return true;
    } catch (e) {
        console.error("Error saving analysis: ", e);
        return false;
    }
};

export const getMarketAnalysis = async (symbol, timeframe) => {
    const cleanSymbol = symbol.replace('/', '_').toUpperCase();
    const cleanTimeframe = timeframe.toUpperCase();
    const docRef = doc(db, "analysis", cleanSymbol, cleanTimeframe, "latest");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
};
