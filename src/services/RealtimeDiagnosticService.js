import { marketData } from './marketData.js';

/**
 * Real-time Diagnostic Service (Phase 75)
 * 
 * Provides sub-second feedback on why an edge might be suppressed or 
 * what institutional threats are currently active.
 */
class RealtimeDiagnosticService {
    constructor() {
        this.listeners = new Set();
        this.currentDiagnostics = {
            code: 'SCANNING',
            reason: 'Actively scanning for institutional footprint...',
            requirements: [],
            threats: []
        };
        this.isInitialized = false;
    }

    /**
     * Start monitoring live market data
     */
    init(symbol = 'BTCUSDT') {
        if (this.isInitialized) return;
        this.isInitialized = true;

        marketData.subscribe((candle) => {
            this._runDiagnostics(symbol, candle);
        });

        // Listen for health updates (connection drops)
        marketData.subscribeHealth((health) => {
            if (!health.isConnected) {
                this._updateDiagnostics({
                    code: 'OFFLINE',
                    reason: 'Lost connection to market data provider.',
                    requirements: ['Restore internet connection', 'Wait for automatic reconnect']
                });
            }
        });
    }

    /**
     * Internal diagnostic loop (Runs on every tick)
     */
    async _runDiagnostics(symbol, candle) {
        const threats = [];
        let code = 'SCANNING';
        let reason = 'Market structure is developing. Awaiting high-conviction cluster.';
        const requirements = [];

        // 1. Check for Immediate Volatility Spikes
        const priceChange = Math.abs((candle.close - candle.open) / candle.open) * 100;
        if (priceChange > 0.5) { // 0.5% in a single tick/short period
            threats.push({ type: 'VOLATILITY', severity: 'MEDIUM', label: 'Sudden Momentum Spike' });
            reason = 'High-velocity move detected. Waiting for price stabilization.';
            requirements.push('Await candle closure', 'Confirm no liquidation hunt');
        }

        // 2. Check for News Imminence (Simulated until NewsService integration)
        // In a real implementation, we'd check newsService.getImminentEvents()

        // 3. Update internal state
        this._updateDiagnostics({
            code: threats.length > 0 ? 'LIVE_THREAT' : code,
            reason,
            requirements,
            threats,
            lastTick: Date.now()
        });
    }

    _updateDiagnostics(newDiag) {
        this.currentDiagnostics = { ...this.currentDiagnostics, ...newDiag };
        this.listeners.forEach(cb => cb(this.currentDiagnostics));
    }

    subscribe(callback) {
        this.listeners.add(callback);
        callback(this.currentDiagnostics);
        return () => this.listeners.delete(callback);
    }
}

export const realtimeDiagnosticService = new RealtimeDiagnosticService();
