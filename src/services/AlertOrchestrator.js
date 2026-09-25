import { db } from './db.js';

/**
 * Alert Orchestrator (Phase 4)
 * Manages institutional alerts, IQ scoring, and persistence.
 */
class AlertOrchestrator {
    constructor() {
        this.alerts = [];
        this.maxAlerts = 50;
        this.listeners = new Set();
    }

    /**
     * Process incoming signals from ProactiveMonitor
     * @param {Object} data - { symbol, signals, timestamp, analysis }
     */
    processSignals(data) {
        const { symbol, signals, timestamp, analysis } = data;

        signals.forEach(signal => {
            const alert = {
                id: `alert-${symbol}-${timestamp}-${Math.random().toString(36).substr(2, 5)}`,
                symbol,
                type: signal.type,
                severity: signal.severity,
                message: signal.message,
                timestamp,
                iqScore: this.calculateIQScore(signal, analysis),
                status: 'ACTIVE',
                data: signal.data,
                analysisRef: analysis // Keep a ref for navigation
            };

            this.addAlert(alert);
        });
    }

    /**
     * Calculate Institutional Quality (IQ) Score for the alert
     * Higher score = higher institutional footprint/conviction.
     */
    calculateIQScore(signal, analysis) {
        let base = signal.severity === 'HIGH' ? 70 : 50;

        // Confluence Boosters
        if (analysis.marketState?.volumeAnalysis?.isInstitutional) base += 10;
        if (analysis.marketState?.smtConfluence > 50) base += 10;
        if (analysis.marketState?.mtfBiasAligned) base += 10;

        return Math.min(100, base);
    }

    addAlert(alert) {
        // Add to start of list
        this.alerts.unshift(alert);

        // Trim list
        if (this.alerts.length > this.maxAlerts) {
            this.alerts.pop();
        }

        console.log(`[ALERT ORCHESTRATOR] New ${alert.severity} Alert: ${alert.symbol} | IQ: ${alert.iqScore}`);

        // Notify UI
        this.notifyUI();

        // Optional: Persist high-val alerts to Firebase
        if (alert.iqScore >= 80) {
            this.persistAlert(alert);
        }
    }

    async persistAlert(alert) {
        try {
            // Save to Firestore as a "Signal Point"
            await db.saveSignal({
                ...alert,
                isInstitutional: true,
                recordedAt: new Date().toISOString()
            });
        } catch (err) {
            console.warn('[ALERT ORCHESTRATOR] Persistence failed:', err.message);
        }
    }

    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.status = 'ACKNOWLEDGED';
            this.notifyUI();
        }
    }

    getAlerts() {
        return this.alerts;
    }

    onUpdate(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    notifyUI() {
        this.listeners.forEach(cb => cb([...this.alerts]));
    }
}

export const alertOrchestrator = new AlertOrchestrator();
