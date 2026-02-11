import { EconomicEvent } from '../models/EconomicEvent.js';

const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const BACKEND_BASE = isNode ? 'http://localhost:3001' : '';
const CRYPTOPANIC_PROXY = `${BACKEND_BASE}/api/news/cryptopanic`;
const CALENDAR_PROXY = `${BACKEND_BASE}/api/news/calendar`;

export class NewsService {
    constructor() {
        this.cache = new Map();
        this.CACHE_TTL = 15 * 60 * 1000; // 15 minutes
    }

    /**
     * Get news events for a symbol and timeframe
     */
    async fetchRealNews(symbol) {
        const asset = symbol.replace(/USDT|USD|\//g, '').toUpperCase();
        const cacheKey = `news_${asset}`;
        const cached = this.cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.data;
        }

        try {
            const res = await fetch(`${CRYPTOPANIC_PROXY}?currencies=${asset}&kind=news`);

            if (!res.ok) {
                if (res.status === 429 && cached) {
                    console.warn(`[NEWS] News proxy throttled (429). Returning last successful cache for ${asset}.`);
                    return cached.data;
                }
                console.warn(`[NEWS] News proxy unavailable (${res.status}). Skipping real news.`);
                return cached ? cached.data : [];
            }

            const data = await res.json();
            const results = (data.results || []).map(n => ({
                id: n.id,
                time: Math.floor(new Date(n.published_at).getTime() / 1000),
                title: n.title,
                source: n.domain,
                impact: this._scoreImpact(n.title, n.metadata),
                sentiment: n.votes.positive > n.votes.negative ? 'BULLISH' : 'BEARISH',
                url: n.url
            }));

            this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (e) {
            console.error("Failed to fetch news:", e);
            return cached ? cached.data : [];
        }
    }

    /**
     * Get Economic Calendar events (FinancialModelingPrep)
     */
    async fetchEconomicCalendar(startTime, endTime) {
        const cacheKey = `calendar_${startTime}_${endTime}`;
        const cached = this.cache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
            return cached.data;
        }

        try {
            const res = await fetch(`${CALENDAR_PROXY}?from=${startTime}&to=${endTime}`);

            if (!res.ok) {
                if (res.status === 429 && cached) {
                    console.warn(`[NEWS] Calendar proxy throttled (429). Returning cached calendar.`);
                    return cached.data;
                }

                if (res.status === 503 || res.status === 429) {
                    console.warn(`[NEWS] Calendar proxy unavailable (${res.status}). Using simulated fallback.`);
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
                return cached ? cached.data : [];
            }

            const data = await res.json();
            if (!Array.isArray(data)) return cached ? cached.data : [];

            const results = data.map(e => new EconomicEvent({
                timestamp: Math.floor(new Date(e.date).getTime() / 1000),
                type: e.event,
                impact: e.impact.toUpperCase(),
                asset: e.currency,
                actual: e.actual,
                forecast: e.estimate || e.forecast,
                previous: e.previous,
                status: e.actual ? 'RELEASED' : 'PENDING',
                unit: e.unit,
                bias: 'NEUTRAL',
                volatilityExpected: e.impact.toUpperCase() === 'HIGH' ? 'HIGH' : 'MEDIUM'
            }));

            this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (e) {
            console.error("[NEWS] Calendar fetch failed:", e);
            return cached ? cached.data : [];
        }
    }

    /**
     * Get high-impact shocks for the next window
     */
    async getUpcomingShocks(windowHours = 72) {
        const now = new Date();
        const future = new Date(now.getTime() + windowHours * 3600 * 1000);

        const events = await this.fetchEconomicCalendar(
            now.toISOString().split('T')[0],
            future.toISOString().split('T')[0]
        );

        return events.filter(e => e.impact === 'HIGH');
    }

    /**
     * Private: Score news impact based on keywords and assign professional Tiers
     */
    _scoreImpact(title, metadata) {
        const upperTitle = title.toUpperCase();

        const TIER_1 = ['PAYROLL', 'NFP', 'CPI', 'FOMC', 'INTEREST RATE', 'GDP', 'RETAIL SALES', 'ISM'];
        const TIER_2 = ['PPI', 'ECB', 'BOE', 'BOJ', 'UNEMPLOYMENT', 'ELECTION', 'GERMAN PMI'];
        const TIER_3 = ['ADP', 'CONFIDENCE', 'HOUSING', 'PERMITS', 'TRADE BALANCE', 'INVENTORIES'];
        const SPECIAL = ['SPEECH', 'WAR', 'SANCTION', 'CRISIS', 'EMERGENCY', 'HACK', 'HUNT'];

        if (TIER_1.some(k => upperTitle.includes(k))) return 'HIGH'; // Tier 1 mapped to HIGH
        if (TIER_2.some(k => upperTitle.includes(k))) return 'HIGH'; // Tier 2 also mapped to HIGH internally
        if (TIER_3.some(k => upperTitle.includes(k))) return 'MEDIUM';
        if (SPECIAL.some(k => upperTitle.includes(k))) return 'HIGH';

        // Legacy mapping for high-impact keywords (Phase 72)
        const highImpactKeywords = ['EMBARGO', 'HALT', 'ETF', 'SEC', 'INFLATION', 'WAR'];
        if (highImpactKeywords.some(k => upperTitle.includes(k))) return 'HIGH';

        return 'MEDIUM';
    }

    /**
     * Map internal score to Professional Tier labels
     */
    getTier(title) {
        const upperTitle = title.toUpperCase();
        if (['PAYROLL', 'NFP', 'CPI', 'FOMC', 'RATE', 'GDP'].some(k => upperTitle.includes(k))) return 'TIER 1';
        if (['ECB', 'BOE', 'BOJ', 'PPI', 'UNEMPLOYMENT'].some(k => upperTitle.includes(k))) return 'TIER 2';
        return 'TIER 3';
    }

    // Legacy method for backward compatibility
    getEvents(symbol, startTime, endTime) {
        // This will be replaced by async calls in Orchestrator
        return [];
    }
}

export const newsService = new NewsService();
