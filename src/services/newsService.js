import { EconomicEvent } from '../models/EconomicEvent.js';
import { sentimentNLPEngine } from './SentimentNLPEngine.js';

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
            // Parallel Fetch: CryptoPanic + Simulated Global Macro
            const [cryptoRes, macroFeed] = await Promise.all([
                fetch(`${CRYPTOPANIC_PROXY}?currencies=${asset}&kind=news`).catch(() => null),
                this._fetchGlobalMacroFeed()
            ]);

            const cryptoNews = cryptoRes && cryptoRes.ok ? (await cryptoRes.json()).results : [];
            const combinedNews = [...(cryptoNews || []), ...macroFeed];

            const results = combinedNews.map(n => {
                const nlpAnalysis = sentimentNLPEngine.scoreHeadline(n.title);
                return {
                    id: n.id || `macro-${Math.random()}`,
                    time: n.created_at ? Math.floor(new Date(n.created_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
                    title: n.title,
                    source: n.domain || 'Global Wire',
                    impact: this._scoreImpact(n.title, n.metadata),
                    sentiment: nlpAnalysis.bias,
                    sentimentScore: nlpAnalysis.score,
                    sentimentLabel: nlpAnalysis.label,
                    entity: nlpAnalysis.entity, // New field
                    url: n.url || '#'
                };
            }).sort((a, b) => b.time - a.time); // Sort by newest

            this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (e) {
            console.error("Failed to fetch news:", e);
            return cached ? cached.data : [];
        }
    }

    /**
     * Simulate a Global Macro Feed (Reuters/Bloomberg style)
     * In a real app, this would hit a Financial News API
     */
    async _fetchGlobalMacroFeed() {
        // Simulated "Live" headlines based on random seed or time
        const headlines = [
            { title: "Powell: Fed monitoring inflation closely, hikes possible", domain: "Reuters" },
            { title: "SEC approves Bitcoin ETF applications", domain: "Bloomberg" },
            { title: "China bans crypto mining again", domain: "CNBC" },
            { title: "US 10Y Yields surge to 5.0% on strong NFP data", domain: "Investing.com" },
            { title: "Sources say Binance facing DOJ investigation", domain: "WSJ" }
        ];

        // Randomly pick 2-3 to simulate "current" news
        return headlines.sort(() => 0.5 - Math.random()).slice(0, 3);
    }

    /**
     * Calculate Global Market Sentiment (Crypto + Macro)
     */
    getGlobalSentiment(newsItems) {
        if (!newsItems || newsItems.length === 0) return { score: 0, label: 'NEUTRAL' };

        let totalWeightedScore = 0;
        let totalWeight = 0;

        newsItems.forEach(n => {
            // News from "Premium" sources gets higher weight
            const sourceWeight = ['Reuters', 'Bloomberg', 'WSJ'].includes(n.source) ? 2.0 : 1.0;
            // High impact entities get higher weight (already in sentimentScore but we emphasize here too)
            const entityWeight = n.entity ? 1.5 : 1.0;

            const weight = sourceWeight * entityWeight;
            totalWeightedScore += (n.sentimentScore * weight);
            totalWeight += weight;
        });

        const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
        let label = 'NEUTRAL';
        if (avgScore > 0.3) label = 'RISK_ON';
        if (avgScore > 0.6) label = 'EUPHORIA';
        if (avgScore < -0.3) label = 'RISK_OFF';
        if (avgScore < -0.6) label = 'PANIC';

        return {
            score: parseFloat(avgScore.toFixed(2)),
            label,
            headlineCount: newsItems.length
        };
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
