import { EconomicEvent } from '../models/EconomicEvent.js';

const CRYPTOPANIC_API_URL = 'https://cryptopanic.com/api/v1/posts/';
const FMP_CALENDAR_URL = 'https://financialmodelingprep.com/api/v3/economic_calendar';

export class NewsService {
    constructor() {
        this.cache = new Map();
        this.apiKey = typeof process !== 'undefined' ? process.env.VITE_CRYPTOPANIC_KEY : '';
        this.fmpKey = typeof process !== 'undefined' ? process.env.VITE_FMP_KEY : '';
    }

    /**
     * Get news events for a symbol and timeframe
     */
    async fetchRealNews(symbol) {
        if (!this.apiKey) {
            console.warn("CryptoPanic API Key missing. Returning fallback.");
            return [];
        }

        try {
            const asset = symbol.split('USDT')[0].split('USD')[0];
            const res = await fetch(`${CRYPTOPANIC_API_URL}?auth_token=${this.apiKey}&currencies=${asset}&kind=news`);
            const data = await res.json();

            return (data.results || []).map(n => ({
                id: n.id,
                time: Math.floor(new Date(n.published_at).getTime() / 1000),
                title: n.title,
                source: n.domain,
                impact: this._scoreImpact(n.title, n.metadata),
                sentiment: n.votes.positive > n.votes.negative ? 'BULLISH' : 'BEARISH',
                url: n.url
            }));
        } catch (e) {
            console.error("Failed to fetch news:", e);
            return [];
        }
    }

    /**
     * Get Economic Calendar events (FinancialModelingPrep)
     */
    async fetchEconomicCalendar(startTime, endTime) {
        if (!this.fmpKey) {
            return [
                new EconomicEvent({
                    timestamp: Math.floor(Date.now() / 1000) + 3600,
                    type: 'FOMC (Simulated)',
                    impact: 'HIGH',
                    asset: 'USD',
                    bias: 'NEUTRAL',
                    description: 'Simulated High Impact Event'
                })
            ];
        }

        try {
            const res = await fetch(`${FMP_CALENDAR_URL}?from=${startTime}&to=${endTime}&apikey=${this.fmpKey}`);
            const data = await res.json();

            return data.map(e => new EconomicEvent({
                timestamp: Math.floor(new Date(e.date).getTime() / 1000),
                type: e.event,
                impact: e.impact.toUpperCase(),
                asset: e.currency,
                actual: e.actual,
                forecast: e.estimate,
                previous: e.previous,
                status: e.actual ? 'RELEASED' : 'PENDING',
                bias: 'NEUTRAL'
            }));
        } catch (e) {
            return [];
        }
    }

    /**
     * Get high-impact shocks for the next window
     */
    async getUpcomingShocks(windowHours = 24) {
        const now = new Date();
        const future = new Date(now.getTime() + windowHours * 3600 * 1000);

        const events = await this.fetchEconomicCalendar(
            now.toISOString().split('T')[0],
            future.toISOString().split('T')[0]
        );

        return events.filter(e => e.impact === 'HIGH');
    }

    /**
     * Private: Score news impact based on keywords
     */
    _scoreImpact(title, metadata) {
        const keywords = ['EMBARGO', 'HALT', 'HACK', 'ETF', 'SEC', 'INFLATION', 'RATE', 'WAR'];
        const upperTitle = title.toUpperCase();

        if (keywords.some(k => upperTitle.includes(k))) return 'HIGH';
        return 'MEDIUM';
    }

    // Legacy method for backward compatibility
    getEvents(symbol, startTime, endTime) {
        // This will be replaced by async calls in Orchestrator
        return [];
    }
}

export const newsService = new NewsService();
