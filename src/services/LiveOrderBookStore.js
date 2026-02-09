import { marketData } from './marketData.js';

/**
 * Live Order Book Store
 * Maintains a persistent, zero-latency WebSocket depth stream for analysis.
 */
class LiveOrderBookStore {
    constructor() {
        this.currentSymbol = null;
        this.unsubscribe = null;
        this.lastSnapshot = null;
        this.lastUpdateTime = 0;
        this.latency = 0;
    }

    /**
     * Start tracking a symbol's depth
     */
    track(symbol) {
        if (this.currentSymbol === symbol) return;

        // Cleanup existing
        this.stop();

        this.currentSymbol = symbol;
        console.log(`LiveOrderBookStore: Tracking ${symbol} (100ms frequency)`);

        this.unsubscribe = marketData.subscribeToDepth(symbol, (depth) => {
            this.latency = Date.now() - this.lastUpdateTime;
            this.lastSnapshot = depth;
            this.lastUpdateTime = Date.now();
        });
    }

    /**
     * Get the current instant snapshot for analysis
     */
    getSnapshot() {
        // If data is older than 5 seconds, consider it stale
        if (Date.now() - this.lastUpdateTime > 5000) {
            return null;
        }
        return this.lastSnapshot;
    }

    /**
     * Get real-time health stats
     */
    getStats() {
        return {
            latency: this.latency,
            lastUpdate: this.lastUpdateTime,
            isLive: !!this.lastSnapshot && (Date.now() - this.lastUpdateTime < 2000)
        };
    }

    /**
     * Stop tracking
     */
    stop() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.lastSnapshot = null;
        this.currentSymbol = null;
    }
}

export const liveOrderBookStore = new LiveOrderBookStore();
