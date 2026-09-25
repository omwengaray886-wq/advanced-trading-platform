import { marketData } from './marketData';
import { AnalysisOrchestrator } from './analysisOrchestrator';

const orchestrator = new AnalysisOrchestrator();

export class AlertService {
    constructor() {
        // Hybrid watchlist: Crypto (tradeable) + Forex (EURUSDT tradeable, others reference-only)
        this.watchlist = [
            'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT',  // Major Crypto
            'EURUSDT', 'PAXGUSDT', 'GBPJPY'  // EUR/Gold + Forex GBPJPY Cross
        ];
        this.timeframe = '1H';
        this.isScanning = false;
        this.lastAlerts = new Map(); // asset -> last alert timestamp
    }

    async startScanning() {
        if (this.isScanning) return;
        this.isScanning = true;
        console.log("Logic Sentinel: Scanning started...");

        // Initial scan
        await this.scan();

        // Scan every 2 minutes
        this.interval = setInterval(() => this.scan(), 120000);
    }

    stopScanning() {
        this.isScanning = false;
        if (this.interval) clearInterval(this.interval);
    }

    async scan() {
        if (!("Notification" in window)) return;

        if (Notification.permission !== "granted") {
            await Notification.requestPermission();
        }

        for (const symbol of this.watchlist) {
            try {
                const candles = await marketData.fetchHistory(symbol, this.timeframe, 100);
                const analysis = await orchestrator.analyze(candles, symbol, this.timeframe, null, null, true);

                // Trigger alert for high-confidence setups (> 80)
                const topSetup = analysis.setups.find(s => s.quantScore > 80);

                if (topSetup) {
                    const now = Date.now();
                    const lastAlert = this.lastAlerts.get(symbol);

                    // Throttle alerts per symbol (once every 4 hours for the same setup)
                    if (!lastAlert || (now - lastAlert) > (4 * 3600 * 1000)) {
                        this.triggerNotification(symbol, topSetup);
                        this.lastAlerts.set(symbol, now);
                    }
                }
            } catch (error) {
                console.error(`Alert scan failed for ${symbol}:`, error);
            }
        }
    }

    triggerNotification(symbol, setup) {
        if (Notification.permission === "granted") {
            const title = `🚨 TradeAlgo Opportunity: ${symbol}`;
            const options = {
                body: `${setup.direction} Setup Detected (${setup.logic}). Quant Score: ${setup.quantScore}. View Analysis now.`,
                icon: '/favicon.ico', // Ensure path is correct
                tag: symbol,
                requireInteraction: true
            };

            new Notification(title, options);
        }
    }
}

export const alertService = new AlertService();
