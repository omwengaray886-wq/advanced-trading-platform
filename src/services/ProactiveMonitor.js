import { AnalysisOrchestrator } from './analysisOrchestrator.js';
import { marketData } from './marketData.js';
import { alertOrchestrator } from './AlertOrchestrator.js';

/**
 * Proactive Monitor (Phase 4)
 * Background service to detect institutional fingerprints across multiple symbols.
 */
class ProactiveMonitor {
    constructor() {
        this.watchlist = ['BTC/USDT', 'ETH/USDT', 'EUR/USD', 'GBP/USD', 'XAU/USD'];
        this.interval = 60000; // 1 minute default
        this.isRunning = false;
        this.timer = null;
        this.orchestrator = new AnalysisOrchestrator();
        this.listeners = new Set();
        this.lastStates = new Map(); // Store last known phase to detect transitions
    }

    /**
     * Start the background monitoring loop
     * @param {number} customInterval - custom ms interval
     */
    start(customInterval = 60000) {
        if (this.isRunning) return;

        this.interval = customInterval;
        this.isRunning = true;
        console.log(`[PROACTIVE MONITOR] Starting background scan loop (${this.interval}ms)...`);

        const loop = async () => {
            if (!this.isRunning) return;
            await this.performScan();
            this.timer = setTimeout(loop, this.interval);
        };

        loop();
    }

    /**
     * Stop the background monitoring loop
     */
    stop() {
        this.isRunning = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        console.log('[PROACTIVE MONITOR] Background scan loop stopped.');
    }

    /**
     * Perform a "Light Pass" analysis on the entire watchlist
     */
    async performScan() {
        console.log('[PROACTIVE MONITOR] Initiating fleet-wide structural scan...');

        for (const symbol of this.watchlist) {
            try {
                // 1. Fetch data (1H candles for structural context)
                const candles = await marketData.fetchHistory(symbol, '1h', 100);
                if (!candles || candles.length < 50) continue;

                // 2. Perform Light Analysis (No heavy MTF or External API calls)
                const analysis = await this.orchestrator.analyze(
                    candles,
                    symbol,
                    '1H',
                    null,  // No manual strategy
                    null,  // No MTF data
                    true,  // isLight = true
                    10000  // default account size
                );

                // 3. Detect Proactive Alert Triggers
                this.evaluateSignals(symbol, analysis);

            } catch (err) {
                console.warn(`[PROACTIVE MONITOR] Scan failed for ${symbol}:`, err.message);
            }

            // Artificial delay to prevent API hammering
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    /**
     * Check for significant state changes (Institutional Triggers)
     */
    evaluateSignals(symbol, analysis) {
        const currentPhase = analysis.marketState?.amdCycle?.phase;
        const lastState = this.lastStates.get(symbol);

        const triggers = [];

        // Trigger 1: AMD Phase Transition (Crucial for institutional timing)
        if (currentPhase && lastState?.phase !== currentPhase) {
            if (currentPhase === 'MANIPULATION') {
                triggers.push({
                    type: 'INSTITUTIONAL_FAKE_OUT',
                    severity: 'HIGH',
                    message: `Manipulation Phase detected on ${symbol}. Watch for the Judas Swing.`,
                    data: analysis.marketState.amdCycle
                });
            } else if (currentPhase === 'DISTRIBUTION') {
                triggers.push({
                    type: 'EXPANSION_START',
                    severity: 'MEDIUM',
                    message: `Institutional expansion started on ${symbol} (Distribution Phase).`,
                    data: analysis.marketState.amdCycle
                });
            }
        }

        // Trigger 2: Fresh Liquidity Sweep
        if (analysis.marketState?.liquiditySweep && lastState?.sweepId !== analysis.marketState.liquiditySweep.id) {
            triggers.push({
                type: 'LIQUIDITY_GRAB',
                severity: 'HIGH',
                message: `Major ${analysis.marketState.liquiditySweep.type} Sweep confirmed on ${symbol}. Institutional interest active.`,
                data: analysis.marketState.liquiditySweep
            });
        }

        // Trigger 3: SMT Divergence (Institutional Confluence)
        if (analysis.marketState?.smtDivergence && !lastState?.smtActive) {
            triggers.push({
                type: 'SMT_CONFLUENCE',
                severity: 'MEDIUM',
                message: `SMT Divergence activated on ${symbol}. Institutional alignment detected.`,
                data: analysis.marketState.smtDivergence
            });
        }

        // If high-value triggers found, notify listeners
        if (triggers.length > 0) {
            this.notifyListeners(symbol, triggers, analysis);
        }

        // Update state cache
        this.lastStates.set(symbol, {
            phase: currentPhase,
            sweepId: analysis.marketState?.liquiditySweep?.id,
            smtActive: !!analysis.marketState?.smtDivergence
        });
    }

    /**
     * Add event listener for signals
     */
    onSignal(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyListeners(symbol, signals, analysis) {
        const payload = { symbol, signals, timestamp: Date.now(), analysis };
        alertOrchestrator.processSignals(payload);
        this.listeners.forEach(cb => cb(payload));
    }

    setWatchlist(newList) {
        this.watchlist = newList;
        console.log(`[PROACTIVE MONITOR] Watchlist updated: ${this.watchlist.join(', ')}`);
    }
}

export const proactiveMonitor = new ProactiveMonitor();
