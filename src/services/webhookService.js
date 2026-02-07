export class WebhookService {
    constructor() {
        this.endpoints = JSON.parse(localStorage.getItem('tradealgo_webhooks') || '[]');
    }

    addEndpoint(name, url, secret = '') {
        this.endpoints.push({ name, url, secret, active: true });
        this._save();
    }

    async broadcastSignal(signal) {
        console.log("Broadcasting institutional signal...");

        const payload = {
            source: 'TradeAlgo-Pro',
            timestamp: new Date().toISOString(),
            asset: signal.pair,
            direction: signal.direction,
            logic: signal.logic,
            entry: signal.price,
            targets: signal.targets,
            quantScore: signal.quantScore
        };

        const results = await Promise.all(this.endpoints.filter(e => e.active).map(async (endpoint) => {
            try {
                const response = await fetch(endpoint.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                return { name: endpoint.name, success: response.ok };
            } catch (err) {
                return { name: endpoint.name, success: false, error: err.message };
            }
        }));

        return results;
    }

    _save() {
        localStorage.setItem('tradealgo_webhooks', JSON.stringify(this.endpoints));
    }
}

export const webhookService = new WebhookService();
