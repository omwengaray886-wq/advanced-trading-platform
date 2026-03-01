import { marketData } from './marketData.js';

/**
 * Live Order Book Store
 * Maintains persistent, zero-latency WebSocket depth streams for analysis.
 * Now supports multi-symbol tracking to prevent thrashering during background scans.
 */
class LiveOrderBookStore {
    constructor() {
        this.subscriptions = new Map(); // symbol -> { unsubscribe, lastSnapshot, lastUpdateTime, latency }
        this.maxSymbols = 5;
    }

    /**
     * Start tracking a symbol's depth
     */
    track(symbol) {
        if (this.subscriptions.has(symbol)) return;

        // FIFO Cleanup if we exceed max symbols
        if (this.subscriptions.size >= this.maxSymbols) {
            const firstSymbol = this.subscriptions.keys().next().value;
            this.stop(firstSymbol);
        }

        console.log(`LiveOrderBookStore: Initializing stream for ${symbol} (100ms frequency)`);

        const subData = {
            unsubscribe: null,
            lastSnapshot: null,
            lastUpdateTime: 0,
            latency: 0
        };

        subData.unsubscribe = marketData.subscribeToDepth(symbol, (depth) => {
            subData.latency = Date.now() - subData.lastUpdateTime;
            subData.lastSnapshot = depth;
            subData.lastUpdateTime = Date.now();
        });

        this.subscriptions.set(symbol, subData);
    }

    /**
     * Get the current instant snapshot for analysis
     */
    getSnapshot(symbol) {
        const sub = this.subscriptions.get(symbol);
        if (!sub) return null;

        // If data is older than 5 seconds, consider it stale
        if (Date.now() - sub.lastUpdateTime > 5000) {
            return null;
        }
        return sub.lastSnapshot;
    }

    /**
     * Get real-time health stats for a symbol
     */
    getStats(symbol) {
        const sub = this.subscriptions.get(symbol);
        if (!sub) return { isLive: false };

        return {
            latency: sub.latency,
            lastUpdate: sub.lastUpdateTime,
            isLive: !!sub.lastSnapshot && (Date.now() - sub.lastUpdateTime < 2000)
        };
    }

    /**
     * Stop tracking a specific symbol or all
     */
    stop(symbol = null) {
        if (symbol) {
            const sub = this.subscriptions.get(symbol);
            if (sub && sub.unsubscribe) {
                sub.unsubscribe();
            }
            this.subscriptions.delete(symbol);
        } else {
            // Stop all
            this.subscriptions.forEach(sub => {
                if (sub.unsubscribe) sub.unsubscribe();
            });
            this.subscriptions.clear();
        }
    }
}

export const liveOrderBookStore = new LiveOrderBookStore();
