/**
 * Sentiment Analysis Service
 * Aggregates market sentiment from news, social media, and fear/greed indices
 * Uses real APIs for production-grade intelligence
 */

// In-memory cache for sentiment results
const sentimentCache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Analyze market sentiment for a given symbol
 * @param {string} symbol - Trading symbol (e.g., 'BTCUSDT', 'EURUSD')
 * @returns {Promise<Object>} - Sentiment analysis
 */
export async function analyzeSentiment(symbol) {
    if (!symbol) return getFallbackSentiment();
    const cleanSymbol = symbol.replace(/USDT|USD|\//g, '');
    const cacheKey = cleanSymbol.toUpperCase();

    // Check cache
    const cached = sentimentCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[SENTIMENT] Returning cached sentiment for ${cacheKey}`);
        return cached.data;
    }

    try {
        // Aggregate sentiment from multiple sources
        const [newsSentiment, socialSentiment, fearGreed] = await Promise.all([
            getNewsSentiment(cleanSymbol),
            getSocialSentiment(cleanSymbol),
            getFearGreedIndex(cleanSymbol)
        ]);

        // Combine scores (weighted average)
        const combinedScore = (
            newsSentiment.score * 0.4 +
            socialSentiment.score * 0.3 +
            fearGreed.score * 0.3
        );

        // Classify sentiment
        let label, bias;
        if (combinedScore > 70) {
            label = 'EXTREME_GREED';
            bias = 'CONTRARIAN_BEARISH';
        } else if (combinedScore > 40) {
            label = 'MODERATE_GREED';
            bias = 'NEUTRAL_BEARISH';
        } else if (combinedScore > -40) {
            label = 'NEUTRAL';
            bias = 'NEUTRAL';
        } else if (combinedScore > -70) {
            label = 'MODERATE_FEAR';
            bias = 'NEUTRAL_BULLISH';
        } else {
            label = 'EXTREME_FEAR';
            bias = 'CONTRARIAN_BULLISH';
        }

        const sourceScores = [newsSentiment.score, socialSentiment.score, fearGreed.score];
        const stdDev = calculateStdDev(sourceScores);
        const confidence = Math.max(0, Math.min(1, 1 - (stdDev / 100)));

        const result = {
            score: Math.round(combinedScore),
            label,
            bias,
            confidence: parseFloat(confidence.toFixed(2)),
            sources: {
                news: newsSentiment,
                social: socialSentiment,
                fearGreed: fearGreed
            },
            timestamp: Date.now()
        };

        // Cache the result
        sentimentCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    } catch (error) {
        console.error('Sentiment analysis error:', error);
        return getFallbackSentiment();
    }
}

/**
 * Get news sentiment from financial news APIs
 * Uses NewsAPI or similar services
 */
async function getNewsSentiment(symbol) {
    try {
        const query = encodeURIComponent(`${symbol} cryptocurrency OR ${symbol} forex`);
        const url = `/api/news/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=20`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });

        if (response.status === 429) throw new Error('Throttled');

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Unexpected response format: ${contentType}. Body starts with: ${text.substring(0, 50)}`);
        }

        const data = await response.json();

        if (!data.articles || data.articles.length === 0) {
            return { score: 0, confidence: 0.5, source: 'NEWS_API' };
        }

        // Simple keyword-based sentiment scoring
        let sentimentScore = 0;
        const bullishKeywords = ['surge', 'rally', 'bullish', 'breakout', 'gains', 'up', 'rise', 'positive', 'strong'];
        const bearishKeywords = ['crash', 'plunge', 'bearish', 'decline', 'losses', 'down', 'fall', 'negative', 'weak'];

        data.articles.forEach(article => {
            const text = (article.title + ' ' + (article.description || '')).toLowerCase();
            const words = text.split(/\s+/);

            words.forEach((word, i) => {
                const prevWord = i > 0 ? words[i - 1] : '';
                const isNegated = ['not', 'no', 'never', 'none', 'neither', 'nor', 'dont', 'without'].includes(prevWord);

                if (bullishKeywords.includes(word)) {
                    sentimentScore += isNegated ? -1 : 1;
                }
                if (bearishKeywords.includes(word)) {
                    sentimentScore += isNegated ? 1 : -1;
                }
            });
        });

        // Normalize to -100 to +100
        const normalizedScore = Math.max(-100, Math.min(100, (sentimentScore / data.articles.length) * 50));

        return {
            score: Math.round(normalizedScore),
            confidence: 0.7,
            source: 'NEWS_API',
            articleCount: data.articles.length
        };
    } catch (error) {
        console.warn('News sentiment fetch failed:', error);
        return { score: 0, confidence: 0.3, source: 'NEWS_API_ERROR' };
    }
}

/**
 * Get social media sentiment
 * Aggregates from Twitter, Reddit, etc.
 */
async function getSocialSentiment(symbol) {
    // For crypto, we can use CoinGecko's sentiment data (free)
    if (symbol.match(/BTC|ETH|SOL|BNB|XRP|ADA|DOT/i)) {
        try {
            const coinMap = {
                'BTC': 'bitcoin',
                'ETH': 'ethereum',
                'SOL': 'solana',
                'BNB': 'binancecoin',
                'XRP': 'ripple',
                'ADA': 'cardano',
                'DOT': 'polkadot'
            };

            const coinId = coinMap[symbol] || 'bitcoin';
            const url = `/api/coingecko/coins/${coinId}?localization=false&tickers=false&community_data=true&developer_data=false`;

            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' }
            });
            if (response.status === 429) throw new Error('Throttled');
            const data = await response.json();

            if (data.sentiment_votes_up_percentage !== undefined) {
                // Convert 0-100% to -100 to +100 scale
                const score = (data.sentiment_votes_up_percentage - 50) * 2;

                return {
                    score: Math.round(score),
                    confidence: 0.65,
                    source: 'COINGECKO_SENTIMENT',
                    upVotes: data.sentiment_votes_up_percentage,
                    downVotes: data.sentiment_votes_down_percentage
                };
            }
        } catch (error) {
            console.warn('Social sentiment fetch failed:', error);
        }
    }

    // Fallback for non-crypto or API failure
    return { score: 0, confidence: 0.4, source: 'UNAVAILABLE' };
}

/**
 * Get Fear & Greed Index
 * Crypto: Alternative.me API (free)
 * Stocks: CNN Fear & Greed (if available)
 */
async function getFearGreedIndex(symbol) {
    // For crypto assets
    if (symbol.match(/BTC|ETH|SOL|BNB|XRP|ADA|DOT/i)) {
        try {
            const url = '/api/sentiment/fng';
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Fear & Greed fetch failed: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                // If we get HTML (e.g. from a server crash/proxy), don't try to parse it
                console.warn('[SENTIMENT] Fear & Greed received non-JSON response:', text.substring(0, 100));
                throw new Error('Fear & Greed response not JSON');
            }

            const data = await response.json();

            if (data && data.data && data.data[0]) {
                const fngValue = parseInt(data.data[0].value);
                const fngLabel = data.data[0].value_classification;

                // Convert 0-100 scale to -100 to +100 (where 50 = neutral)
                const score = (fngValue - 50) * 2;

                return {
                    score: Math.round(score),
                    confidence: 0.8,
                    source: 'CRYPTO_FEAR_GREED_INDEX',
                    rawValue: fngValue,
                    label: fngLabel
                };
            }
            throw new Error('Fear & Greed data format unexpected');
        } catch (error) {
            console.warn('[SENTIMENT] Fear & Greed index fetch failed:', error.message);
            return { score: 0, confidence: 0.3, source: 'FNG_FETCH_ERROR' };
        }
    }

    return { score: 0, confidence: 0.5, source: 'NEUTRAL_DEFAULT' };
}

/**
 * Helper: Calculate standard deviation
 */
function calculateStdDev(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * Fallback sentiment when APIs are unavailable
 */
function getFallbackSentiment() {
    return {
        score: 0,
        label: 'NEUTRAL',
        bias: 'NEUTRAL',
        confidence: 0.3,
        sources: {
            news: { score: 0, confidence: 0, source: 'UNAVAILABLE' },
            social: { score: 0, confidence: 0, source: 'UNAVAILABLE' },
            fearGreed: { score: 0, confidence: 0, source: 'UNAVAILABLE' }
        },
        timestamp: Date.now()
    };
}
