import { EconomicEvent } from '../models/EconomicEvent.js';

const CRYPTOPANIC_PROXY = '/api/news/cryptopanic';
const CALENDAR_PROXY = '/api/news/calendar';

export class NewsService {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get news events for a symbol and timeframe
     */
    async fetchRealNews(symbol) {
        try {
            const asset = symbol.replace(/USDT|USD|\//g, '').toUpperCase();
            const res = await fetch(`${CRYPTOPANIC_PROXY}?currencies=${asset}&kind=news`);

            if (!res.ok) {
                if (res.status === 503 || res.status === 429) {
                    console.warn(`[NEWS] News proxy unavailable (${res.status}). Skipping real news.`);
                }
                return [];
            }

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
        try {
            const res = await fetch(`${CALENDAR_PROXY}?from=${startTime}&to=${endTime}`);

            if (!res.ok) {
                if (res.status === 503 || res.status === 429) {
                    console.warn(`[NEWS] Calendar proxy unavailable (${res.status}). Using simulated fallback.`);
                    // Fallback to simulated event if key is missing or throttled
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
                return [];
            }

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
                bias: 'NEUTRAL',
                volatilityExpected: e.impact.toUpperCase() === 'HIGH' ? 'HIGH' : 'MEDIUM'
            }));
        } catch (e) {
            console.error("[NEWS] Calendar fetch failed:", e);
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
