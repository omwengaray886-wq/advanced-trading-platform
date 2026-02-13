/**
 * Analysis Cache Manager
 * Intelligent multi-level caching for market analysis data
 */

export class AnalysisCacheManager {
    constructor() {
        // Level 1: Market data cache (already exists in marketData.js)
        // Level 2: MTF analysis cache
        this.mtfCache = new Map();
        this.MTF_TTL = 5 * 60 * 1000; // 5 minutes

        // Level 3: Full analysis cache
        this.analysisCache = new Map();
        this.ANALYSIS_TTL = 30 * 1000; // 30 seconds

        // Level 4: News & calendar cache
        this.newsCache = new Map();
        this.NEWS_TTL = 15 * 60 * 1000; // 15 minutes
    }

    /**
     * Get cached MTF data
     * @param {string} symbol - Trading pair
     * @param {string} timeframe - Timeframe
     * @returns {Object|null} Cached analysis or null
     */
    getMTFData(symbol, timeframe) {
        const key = `${symbol}_${timeframe}`;
        const cached = this.mtfCache.get(key);

        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.MTF_TTL) {
            this.mtfCache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Cache MTF data
     * @param {string} symbol - Trading pair
     * @param {string} timeframe - Timeframe
     * @param {Object} data - Analysis data
     */
    setMTFData(symbol, timeframe, data) {
        const key = `${symbol}_${timeframe}`;
        this.mtfCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached full analysis
     * @param {string} symbol - Trading pair
     * @param {string} timeframe - Timeframe
     * @param {number} lastCandleTime - Timestamp of last candle
     * @returns {Object|null} Cached analysis or null
     */
    getAnalysis(symbol, timeframe, lastCandleTime) {
        const key = `${symbol}_${timeframe}_${lastCandleTime}`;
        const cached = this.analysisCache.get(key);

        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.ANALYSIS_TTL) {
            this.analysisCache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Cache full analysis
     * @param {string} symbol - Trading pair
     * @param {string} timeframe - Timeframe
     * @param {number} lastCandleTime - Timestamp of last candle
     * @param {Object} data - Full analysis result
     */
    setAnalysis(symbol, timeframe, lastCandleTime, data) {
        const key = `${symbol}_${timeframe}_${lastCandleTime}`;

        // Limit cache size to prevent memory bloat
        if (this.analysisCache.size > 50) {
            const firstKey = this.analysisCache.keys().next().value;
            this.analysisCache.delete(firstKey);
        }

        this.analysisCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached news data
     * @param {string} symbol - Trading pair
     * @returns {Object|null} Cached news or null
     */
    getNews(symbol) {
        const cached = this.newsCache.get(symbol);

        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.NEWS_TTL) {
            this.newsCache.delete(symbol);
            return null;
        }

        return cached.data;
    }

    /**
     * Cache news data
     * @param {string} symbol - Trading pair
     * @param {Object} data - News data
     */
    setNews(symbol, data) {
        this.newsCache.set(symbol, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Invalidate all caches (useful for debugging)
     */
    clearAll() {
        this.mtfCache.clear();
        this.analysisCache.clear();
        this.newsCache.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getStats() {
        return {
            mtfCacheSize: this.mtfCache.size,
            analysisCacheSize: this.analysisCache.size,
            newsCacheSize: this.newsCache.size,
            totalSize: this.mtfCache.size + this.analysisCache.size + this.newsCache.size
        };
    }
}

// Singleton instance
export const analysisCacheManager = new AnalysisCacheManager();
