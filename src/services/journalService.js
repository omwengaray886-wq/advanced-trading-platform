import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * Trade Journal Service
 * Handles persistence of trade reviews, emotions, and strategy notes.
 * Supports Dual-Mode: Firebase (Primary) -> LocalStorage (Fallback).
 */
class JournalService {
    constructor() {
        this.collectionName = 'trade_journal';
        this.isOnline = !!db; // Check if Firebase is initialized
    }

    /**
     * Save a journal entry
     * @param {Object} entry - { tradeId, symbol, emotion, notes, ... }
     */
    async saveEntry(entry) {
        if (!entry.tradeId) throw new Error('Trade ID is required for journaling.');

        const data = {
            ...entry,
            updatedAt: Date.now()
        };

        try {
            if (this.isOnline) {
                // Firebase Mode
                // Use tradeId as document ID for easy lookup
                await setDoc(doc(db, this.collectionName, entry.tradeId), data);
                console.log(`[Journal] Saved to Cloud: ${entry.tradeId}`);
            } else {
                // LocalStorage Mode
                this._saveLocal(entry.tradeId, data);
            }
            return { success: true };
        } catch (error) {
            console.error('[Journal] Save failed:', error);
            // Fallback to local on error
            this._saveLocal(entry.tradeId, data);
            return { success: true, mode: 'OFFLINE_FALLBACK' };
        }
    }

    /**
     * Get a specific entry by Trade ID
     */
    async getEntry(tradeId) {
        try {
            if (this.isOnline) {
                const docRef = doc(db, this.collectionName, tradeId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) return docSnap.data();
            }
        } catch (error) {
            console.warn('[Journal] Fetch failed, checking local:', error);
        }

        // Fallback
        return this._getLocal(tradeId);
    }

    /**
     * Get all journal entries
     */
    async getAllEntries() {
        try {
            if (this.isOnline) {
                const q = query(collection(db, this.collectionName), orderBy('updatedAt', 'desc'));
                const snapshot = await getDocs(q);
                return snapshot.docs.map(d => d.data());
            }
        } catch (error) {
            console.warn('[Journal] Fetch all failed, checking local:', error);
        }

        return this._getAllLocal();
    }

    // --- LocalStorage Helpers ---

    _saveLocal(id, data) {
        const storageKey = 'trade_journal_data';
        const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
        current[id] = data;
        localStorage.setItem(storageKey, JSON.stringify(current));
        console.log(`[Journal] Saved to LocalStorage: ${id}`);
    }

    _getLocal(id) {
        const storageKey = 'trade_journal_data';
        const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return current[id] || null;
    }

    _getAllLocal() {
        const storageKey = 'trade_journal_data';
        const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
        return Object.values(current).sort((a, b) => b.updatedAt - a.updatedAt);
    }
}

export const journalService = new JournalService();
