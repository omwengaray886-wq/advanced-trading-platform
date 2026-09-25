import { normalizeDirection } from '../utils/normalization.js';
import { db } from './db.js';

const { getAllActiveGlobalSignals, saveGlobalSignal, updateGlobalSignal } = db;

/**
 * Signal Manager (Phase 13)
 * Tracks the lifecycle of active trade setups and monitors performance.
 */
class SignalManager {
    constructor() {
        this.activeSignals = new Map(); // Map<symbol, Array<Signal>>
        this.completedSignals = [];
        this.listeners = new Set();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        try {
            const signals = await getAllActiveGlobalSignals();
            signals.forEach(sig => {
                if (!this.activeSignals.has(sig.symbol)) {
                    this.activeSignals.set(sig.symbol, []);
                }
                this.activeSignals.get(sig.symbol).push(sig);
            });
            this.initialized = true;
            console.log(`[SignalManager] Initialized with ${signals.length} active signals from Firestore.`);
            this._notify();
        } catch (e) {
            console.error('[SignalManager] Initialization failed:', e);
        }
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _notify() {
        const active = this.getActiveSignals();
        this.listeners.forEach(cb => {
            try {
                cb(active);
            } catch (e) {
                console.error('[SignalManager] Listener error:', e);
            }
        });
    }

    /**
     * Add a new signal to tracking
     * @param {string} symbol 
     * @param {Object} setup - The generated trade setup
     */
    trackSignal(symbol, setup) {
        if (!setup || !setup.entry) return;

        // Prevent duplicate tracking of the same setup strategy for same symbol
        const existing = this.activeSignals.get(symbol) || [];
        if (existing.some(s => s.strategy === setup.strategy)) return;

        const signal = {
            id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            symbol,
            strategy: setup.strategy,
            direction: normalizeDirection(setup.direction),
            entry: setup.entry,
            stopLoss: setup.stopLoss,
            targets: setup.targets || [],
            timestamp: Date.now(),
            status: 'PENDING', // PENDING -> ACTIVE -> COMPLETED/CANCELLED
            currentPrice: setup.entry,
            pnl: 0,
            updates: [{ time: Date.now(), msg: 'Signal Registered' }]
        };

        if (!this.activeSignals.has(symbol)) {
            this.activeSignals.set(symbol, []);
        }
        this.activeSignals.get(symbol).push(signal);

        console.log(`[SignalManager] Now tracking ${signal.direction} signal for ${symbol} at ${signal.entry}`);

        // Persist to Firestore (Phase 14)
        saveGlobalSignal({
            ...signal,
            status: 'ACTIVE', // DB uses ACTIVE to mean "being managed"
            publishedAt: new Date().toISOString()
        }).catch(e => console.error('[SignalManager] Failed to persist signal:', e));

        this._notify();
        return signal.id;
    }

    /**
     * Update signal states based on latest price
     * @param {string} symbol 
     * @param {number} lastPrice 
     */
    updateMarketPrice(symbol, lastPrice) {
        let changed = false;
        const signals = this.activeSignals.get(symbol);
        if (!signals) return;

        signals.forEach(sig => {
            sig.currentPrice = lastPrice;

            // 1. Activation Check
            if (sig.status === 'PENDING') {
                const triggered = sig.direction === 'BULLISH'
                    ? lastPrice >= sig.entry
                    : lastPrice <= sig.entry;

                if (triggered) {
                    sig.status = 'ACTIVE';
                    sig.activationTime = Date.now();
                    sig.updates.push({ time: Date.now(), msg: 'Signal Activated' });
                    changed = true;

                    // Sync to DB
                    updateGlobalSignal(sig.id, {
                        status: 'ACTIVE',
                        activationTime: sig.activationTime,
                        updates: sig.updates
                    }).catch(e => console.error('[SignalManager] DB sync failed:', e));
                }
            }

            // 2. Logic for ACTIVE signals
            if (sig.status === 'ACTIVE') {
                const oldPnl = sig.pnl;
                sig.pnl = sig.direction === 'BULLISH'
                    ? lastPrice - sig.entry
                    : sig.entry - lastPrice;

                if (Math.abs(sig.pnl - oldPnl) > 0.0001) changed = true;

                // Stop Loss Check
                const stoppedOut = sig.direction === 'BULLISH'
                    ? lastPrice <= sig.stopLoss
                    : lastPrice >= sig.stopLoss;

                if (stoppedOut) {
                    this._completeSignal(sig, 'STOP_LOSS');
                    changed = true;
                    return;
                }

                // Target Check
                sig.targets.forEach(t => {
                    if (!t.reached) {
                        const hit = sig.direction === 'BULLISH'
                            ? lastPrice >= t.price
                            : lastPrice <= t.price;

                        if (hit) {
                            t.reached = true;
                            sig.updates.push({ time: Date.now(), msg: `Target Hit: ${t.label || t.price}` });
                            changed = true;
                        }
                    }
                });

                // All Targets Hit Check
                if (sig.targets.length > 0 && sig.targets.every(t => t.reached)) {
                    this._completeSignal(sig, 'TAKE_PROFIT');
                    changed = true;
                }
            }
        });

        // Cleanup completed signals from active list
        const remaining = signals.filter(s => s.status !== 'COMPLETED');
        if (remaining.length !== signals.length) {
            if (remaining.length === 0) {
                this.activeSignals.delete(symbol);
            } else {
                this.activeSignals.set(symbol, remaining);
            }
            changed = true;
        }

        if (changed) this._notify();
    }

    _completeSignal(signal, outcome) {
        signal.status = 'COMPLETED';
        signal.outcome = outcome;
        signal.completionTime = Date.now();
        this.completedSignals.push(signal);

        // Sync to DB (Phase 14)
        updateGlobalSignal(signal.id, {
            status: 'COMPLETED',
            outcome: outcome,
            completionTime: signal.completionTime,
            updates: signal.updates
        }).catch(e => console.error('[SignalManager] DB complete sync failed:', e));

        console.log(`[SignalManager] Signal ${signal.id} (${signal.symbol}) COMPLETED via ${outcome}`);
    }

    getActiveSignals() {
        const all = [];
        this.activeSignals.forEach(sigs => all.push(...sigs));
        return all;
    }

    getStats() {
        const total = this.completedSignals.length;
        if (total === 0) return { winRate: 0, total: 0, completed: [] };

        const wins = this.completedSignals.filter(s => s.outcome === 'TAKE_PROFIT').length;
        return {
            winRate: (wins / total) * 100,
            total,
            completed: this.completedSignals
        };
    }
}

export const signalManager = new SignalManager();
