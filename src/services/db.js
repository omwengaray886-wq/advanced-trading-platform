import { db as clientDb, isNode } from '../lib/firebase.js';
import * as clientFirestore from 'firebase/firestore';

// In Node.js, we expect the background worker to inject the admin db
let firestore = clientDb;

export const setInternalDb = (adminDb) => {
    firestore = adminDb;
};

// Helper to determine if we are using Admin SDK (Node) or Client SDK (Browser)
const isUsingAdmin = () => isNode && firestore && typeof firestore.collection === 'function';

// --- User Profiles ---
export const createUserProfile = async (uid, data) => {
    try {
        if (isUsingAdmin()) {
            await firestore.collection("users").doc(uid).set({
                ...data,
                createdAt: new Date().toISOString(),
                plan: 'pro'
            });
        } else {
            await clientFirestore.setDoc(clientFirestore.doc(firestore, "users", uid), {
                ...data,
                createdAt: new Date().toISOString(),
                plan: 'pro'
            });
        }
    } catch (e) {
        console.error("Error creating user profile: ", e);
    }
};

export const getUserProfile = async (uid) => {
    try {
        if (isUsingAdmin()) {
            const doc = await firestore.collection("users").doc(uid).get();
            return doc.exists ? doc.data() : null;
        } else {
            const docRef = clientFirestore.doc(firestore, "users", uid);
            const docSnap = await clientFirestore.getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        }
    } catch (e) {
        console.error("Error getting user profile: ", e);
        return null;
    }
};

// --- Trade Setups ---
export const saveTradeSetups = async (setups) => {
    try {
        const promises = setups.map(setup => {
            const safeSymbol = (setup.symbol || 'UNKNOWN').replace('/', '').replace('-', '');
            const docId = `${safeSymbol}-${setup.id}`;
            const safeData = JSON.parse(JSON.stringify(setup));

            if (isUsingAdmin()) {
                return firestore.collection("tradeSetups").doc(docId).set({
                    ...safeData,
                    dbId: docId,
                    timestamp: Date.now(),
                    status: 'ACTIVE'
                });
            } else {
                return clientFirestore.setDoc(clientFirestore.doc(firestore, "tradeSetups", docId), {
                    ...safeData,
                    dbId: docId,
                    timestamp: Date.now(),
                    status: 'ACTIVE'
                });
            }
        });
        await Promise.all(promises);
        return true;
    } catch (e) {
        console.error("Error saving trade setups: ", e);
        return false;
    }
};

// --- Institutional Signals ---
export const saveSignal = async (signal) => {
    try {
        const data = {
            ...signal,
            recordedAt: new Date().toISOString()
        };
        if (isUsingAdmin()) {
            await firestore.collection("signals").add(data);
        } else {
            const docRef = clientFirestore.collection(firestore, "signals");
            await clientFirestore.addDoc(docRef, data);
        }
        return true;
    } catch (e) {
        console.error("Error saving signal: ", e);
        return false;
    }
};

// --- Market Analysis ---
export const saveAnalysis = async (symbol, timeframe, analysis) => {
    try {
        const cleanSymbol = symbol.replace('/', '_').toUpperCase();
        const cleanTimeframe = timeframe.toUpperCase();
        const data = {
            ...analysis,
            updatedAt: new Date().toISOString()
        };

        if (isUsingAdmin()) {
            await firestore.collection("analysis").doc(cleanSymbol).collection(cleanTimeframe).doc("latest").set(data);
        } else {
            const docRef = clientFirestore.doc(firestore, "analysis", cleanSymbol, cleanTimeframe, "latest");
            await clientFirestore.setDoc(docRef, data);
        }
        return true;
    } catch (e) {
        console.error("Error saving analysis: ", e);
        return false;
    }
};

export const getMarketAnalysis = async (symbol, timeframe) => {
    try {
        const cleanSymbol = symbol.replace('/', '_').toUpperCase();
        const cleanTimeframe = timeframe.toUpperCase();

        if (isUsingAdmin()) {
            const doc = await firestore.collection("analysis").doc(cleanSymbol).collection(cleanTimeframe).doc("latest").get();
            return doc.exists ? doc.data() : null;
        } else {
            const docRef = clientFirestore.doc(firestore, "analysis", cleanSymbol, cleanTimeframe, "latest");
            const docSnap = await clientFirestore.getDoc(docRef);
            return docSnap.exists() ? docSnap.data() : null;
        }
    } catch (e) {
        console.error("Error getting market analysis: ", e);
        return null;
    }
};

// --- Global Signals ---
export const saveGlobalSignal = async (signal) => {
    try {
        const docId = `${signal.symbol}_${signal.direction}_${Date.now()}`;
        if (isUsingAdmin()) {
            await firestore.collection("globalSignals").doc(docId).set(signal);
        } else {
            await clientFirestore.setDoc(clientFirestore.doc(firestore, "globalSignals", docId), signal);
        }
        return true;
    } catch (e) {
        console.error("Error saving global signal: ", e);
        return false;
    }
};

export const getGlobalSignals = async () => {
    try {
        if (isUsingAdmin()) {
            const snapshot = await firestore.collection("globalSignals")
                .where("status", "==", "ACTIVE")
                .orderBy("publishedAt", "desc")
                .limit(20)
                .get();
            const signals = [];
            snapshot.forEach(doc => signals.push({ id: doc.id, ...doc.data() }));
            return signals;
        } else {
            const q = clientFirestore.query(
                clientFirestore.collection(firestore, "globalSignals"),
                clientFirestore.where("status", "==", "ACTIVE"),
                clientFirestore.orderBy("publishedAt", "desc"),
                clientFirestore.limit(20)
            );
            const querySnapshot = await clientFirestore.getDocs(q);
            const signals = [];
            querySnapshot.forEach((doc) => signals.push({ id: doc.id, ...doc.data() }));
            return signals;
        }
    } catch (e) {
        console.error("Error getting global signals: ", e);
        return [];
    }
};

export const subscribeToGlobalSignals = (callback) => {
    try {
        if (isUsingAdmin()) {
            return firestore.collection("globalSignals")
                .where("status", "==", "ACTIVE")
                .orderBy("publishedAt", "desc")
                .limit(20)
                .onSnapshot(snapshot => {
                    const signals = [];
                    snapshot.forEach(doc => signals.push({ id: doc.id, ...doc.data() }));
                    callback(signals);
                }, err => {
                    console.error("Global Signals Subscription Error:", err);
                });
        } else {
            const q = clientFirestore.query(
                clientFirestore.collection(firestore, "globalSignals"),
                clientFirestore.where("status", "==", "ACTIVE"),
                clientFirestore.orderBy("publishedAt", "desc"),
                clientFirestore.limit(20)
            );
            return clientFirestore.onSnapshot(q, (snapshot) => {
                const signals = [];
                snapshot.forEach((doc) => signals.push({ id: doc.id, ...doc.data() }));
                callback(signals);
            }, (err) => {
                console.error("Global Signals Subscription Error:", err);
            });
        }
    } catch (e) {
        console.error("Failed to setup signals subscription:", e);
        return () => { };
    }
};

export const subscribeToTradeSetups = (callback) => {
    try {
        if (isUsingAdmin()) {
            return firestore.collection("tradeSetups")
                .where("status", "==", "ACTIVE")
                .orderBy("timestamp", "desc")
                .limit(20)
                .onSnapshot(snapshot => {
                    const setups = [];
                    snapshot.forEach(doc => setups.push({ id: doc.id, ...doc.data() }));
                    callback(setups);
                }, err => {
                    console.error("Trade Setups Subscription Error:", err);
                });
        } else {
            const q = clientFirestore.query(
                clientFirestore.collection(firestore, "tradeSetups"),
                clientFirestore.where("status", "==", "ACTIVE"),
                clientFirestore.orderBy("timestamp", "desc"),
                clientFirestore.limit(20)
            );
            return clientFirestore.onSnapshot(q, (snapshot) => {
                const setups = [];
                snapshot.forEach((doc) => setups.push({ id: doc.id, ...doc.data() }));
                callback(setups);
            }, (err) => {
                console.error("Trade Setups Subscription Error:", err);
            });
        }
    } catch (e) {
        console.error("Failed to setup setups subscription:", e);
        return () => { };
    }
};


export const savePrediction = async (id, data) => {
    try {
        if (isUsingAdmin()) {
            await firestore.collection("predictionHistory").doc(id).set(data);
        } else {
            await clientFirestore.setDoc(clientFirestore.doc(firestore, "predictionHistory", id), data);
        }
        return true;
    } catch (e) {
        console.error("Error saving prediction: ", e);
        return false;
    }
};

export const updatePrediction = async (id, data) => {
    try {
        if (isUsingAdmin()) {
            await firestore.collection("predictionHistory").doc(id).update(data);
        } else {
            await clientFirestore.updateDoc(clientFirestore.doc(firestore, "predictionHistory", id), data);
        }
        return true;
    } catch (e) {
        console.error("Error updating prediction: ", e);
        return false;
    }
};

export const getPredictions = async (symbol, outcome, limitCount = 20) => {
    try {
        if (isUsingAdmin()) {
            let q = firestore.collection("predictionHistory").where("symbol", "==", symbol);
            if (outcome) q = q.where("outcome", "==", outcome);
            const snapshot = await q.limit(limitCount).get();
            const results = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            return results;
        } else {
            const constraints = [clientFirestore.where("symbol", "==", symbol)];
            if (outcome) constraints.push(clientFirestore.where("outcome", "==", outcome));
            constraints.push(clientFirestore.limit(limitCount));
            const q = clientFirestore.query(clientFirestore.collection(firestore, "predictionHistory"), ...constraints);
            const snapshot = await clientFirestore.getDocs(q);
            const results = [];
            snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
            return results;
        }
    } catch (e) {
        console.error("Error getting predictions: ", e);
        return [];
    }
};

export const trackOutcome = async (id, data) => {
    try {
        if (isUsingAdmin()) {
            await firestore.collection("strategyOutcomes").doc(id).set({
                ...data,
                timestamp: Date.now(),
                timestampReadable: new Date().toISOString()
            });
        } else {
            await clientFirestore.setDoc(clientFirestore.doc(firestore, "strategyOutcomes", id), {
                ...data,
                timestamp: Date.now(),
                timestampReadable: new Date().toISOString()
            });
        }
        return true;
    } catch (e) {
        console.error("Error tracking strategy outcome: ", e);
        return false;
    }
};

export const getStrategyOutcomes = async (strategyName, cutoffTime, limitCount = 100) => {
    try {
        if (isUsingAdmin()) {
            const snapshot = await firestore.collection("strategyOutcomes")
                .where("strategyName", "==", strategyName)
                .where("timestamp", ">=", cutoffTime)
                .orderBy("timestamp", "desc")
                .limit(limitCount)
                .get();
            const results = [];
            snapshot.forEach(doc => results.push(doc.data()));
            return results;
        } else {
            const q = clientFirestore.query(
                clientFirestore.collection(firestore, "strategyOutcomes"),
                clientFirestore.where("strategyName", "==", strategyName),
                clientFirestore.where("timestamp", ">=", cutoffTime),
                clientFirestore.orderBy("timestamp", "desc"),
                clientFirestore.limit(limitCount)
            );
            const snapshot = await clientFirestore.getDocs(q);
            const results = [];
            snapshot.forEach(doc => results.push(doc.data()));
            return results;
        }
    } catch (e) {
        console.error("Error getting strategy outcomes: ", e);
        return [];
    }
};

export const db = {
    createUserProfile,
    getUserProfile,
    saveTradeSetups,
    saveSignal,
    saveAnalysis,
    getMarketAnalysis,
    getGlobalSignals,
    subscribeToGlobalSignals,
    saveGlobalSignal,
    subscribeToTradeSetups,
    savePrediction,

    updatePrediction,
    getPredictions,
    trackOutcome,
    getStrategyOutcomes,
    setInternalDb
};



