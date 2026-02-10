import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const BINANCE_BASE = 'https://api.binance.com';
const startTime = Date.now();

// In-memory cache for public data
const cache = {
    coingecko: new Map(),
    binance_ticker: new Map()
};

const CACHE_TTL = 60 * 1000; // 60 seconds

// Request Queue for Rate Limiting (Phase 1: API Stability)
class RequestQueue {
    constructor(maxPerMinute = 10) {
        this.queue = [];
        this.processing = false;
        this.requestTimestamps = [];
        this.maxPerMinute = maxPerMinute;
    }

    async enqueue(fn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.process();
        });
    }

    async process() {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        // Clean old timestamps
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);

        // Check rate limit
        if (this.requestTimestamps.length >= this.maxPerMinute) {
            const oldestTimestamp = this.requestTimestamps[0];
            const waitTime = 60000 - (now - oldestTimestamp);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestTimestamps = [];
        }

        const { fn, resolve, reject } = this.queue.shift();
        this.requestTimestamps.push(Date.now());

        try {
            const result = await fn();
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            this.processing = false;
            if (this.queue.length > 0) {
                this.process();
            }
        }
    }
}

const coinGeckoQueue = new RequestQueue(10); // 10 requests per minute for free tier

// Enable CORS for frontend
const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:3001'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow same-origin requests (no origin header)
        if (!origin) return callback(null, true);

        // Allow localhost in dev
        if (allowedOrigins.includes(origin)) return callback(null, true);

        // Allow all vercel.app subdomains and other production origins
        if (origin.endsWith('.vercel.app') || process.env.NODE_ENV === 'production') {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-KEY', 'X-API-SECRET']
}));

app.use(express.json());

// Helper: Sign Binance Request
const signRequest = (params, secret) => {
    const query = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
    return crypto.createHmac('sha256', secret).update(query).digest('hex');
};

// 0. System Health & Connectivity Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        env: process.env.NODE_ENV || 'development',
        vercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION || 'local',
        config: {
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            hasNewsKey: !!process.env.NEWS_API_KEY,
            hasCoinGeckoKey: !!process.env.COINGECKO_API_KEY
        }
    });
});

// 1. Proxy Endpoint for Binance Klines (Public)
app.get('/api/binance/klines', async (req, res) => {
    try {
        const { symbol, interval, limit } = req.query;
        if (!symbol || !interval) return res.status(400).json({ error: 'Missing parameters' });

        let binanceSymbol = symbol.replace('/', '').toUpperCase();
        if (binanceSymbol === 'XAUUSDT' || binanceSymbol === 'XAUUSD' || binanceSymbol === 'GOLD') binanceSymbol = 'PAXGUSDT';
        if (binanceSymbol === 'XAGUSDT' || binanceSymbol === 'XAGUSD' || binanceSymbol === 'SILVER') binanceSymbol = 'PAXGUSDT';


        // Forex Proxies: Binance Spot lacks most Forex. Use BTCUSDT for structural context if real forex pair doesn't exist.
        const forexPairs = ['USDJPY', 'USDTJPY', 'USDCHF', 'USDCAD', 'EURUSD', 'GBPUSD', 'AUDUSD'];
        if (forexPairs.includes(binanceSymbol)) {
            // Try the direct mapping first, then fallback to BTCUSDT if it's not a native Binance pair
            // Actually, we'll just check if it's one of the ones we KNOW Binance has (like EURUSDT, GBPUSDT)
            if (!['EURUSD', 'EURUSDT', 'GBPUSD', 'GBPUSDT', 'AUDUSD', 'AUDUSDT', 'BTCUSDT', 'ETHUSDT', 'PAXGUSDT'].includes(binanceSymbol)) {
                binanceSymbol = 'BTCUSDT';
            }

        }

        const fetchWithRetry = async (url, params, retries = 2) => {
            try {
                return await axios.get(url, { params, timeout: 8000 });
            } catch (err) {
                const isRetryable = err.code === 'ECONNABORTED' ||
                    err.code === 'ETIMEDOUT' ||
                    err.response?.status === 429 ||
                    err.response?.status >= 500;

                if (retries > 0 && isRetryable) {
                    const delay = (3 - retries) * 1000;
                    console.log(`[RETRY] Retrying ${params.symbol} in ${delay}ms... (${retries} left)`);
                    await new Promise(r => setTimeout(r, delay));
                    return fetchWithRetry(url, params, retries - 1);
                }
                throw err;
            }
        };

        const response = await fetchWithRetry(`${BINANCE_BASE}/api/v3/klines`, {
            symbol: binanceSymbol,
            interval,
            limit: limit || 100
        });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        console.error(`[PROXY ERROR] Klines ${status} for ${req.query.symbol}: ${error.message}`);

        if (error.response) {
            console.error('[BINANCE ERROR DATA]', error.response.data);
            return res.status(status).json(error.response.data);
        }

        res.status(status).json({
            error: 'Binance Proxy Connection Failed',
            details: error.message,
            target: `${BINANCE_BASE}/api/v3/klines`
        });
    }
});

// 1.1 Proxy for Binance Depth (Public)
app.get('/api/binance/depth', async (req, res) => {
    try {
        const { symbol, limit } = req.query;
        if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

        let binanceSymbol = symbol.replace('/', '').toUpperCase();

        // Asset Mapping: Binance Spot doesn't have XAUUSDT, use PAXGUSDT (Gold)
        if (binanceSymbol === 'XAUUSDT' || binanceSymbol === 'XAUUSD' || binanceSymbol === 'GOLD') binanceSymbol = 'PAXGUSDT';
        if (binanceSymbol === 'XAGUSDT' || binanceSymbol === 'XAGUSD' || binanceSymbol === 'SILVER') binanceSymbol = 'PAXGUSDT';

        if (!['EURUSD', 'EURUSDT', 'GBPUSD', 'GBPUSDT', 'AUDUSD', 'AUDUSDT', 'BTCUSDT', 'ETHUSDT', 'PAXGUSDT'].includes(binanceSymbol)) {
            binanceSymbol = 'BTCUSDT';
        }


        const response = await axios.get(`${BINANCE_BASE}/api/v3/depth`, {
            params: { symbol: binanceSymbol, limit: limit || 20 }
        });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        console.error(`[PROXY ERROR] Depth ${status} for ${req.query.symbol}: ${error.message}`);
        if (error.response) {
            return res.status(status).json(error.response.data);
        }
        res.status(status).json({ error: 'Binance Depth Proxy Internal Error', message: error.message });
    }
});

// 1.2 Proxy for CoinGecko (Fixes CORS and centralizes access)
app.use('/api/coingecko', async (req, res) => {
    const path = req.path.replace(/^\//, '');
    const cacheKey = `cg_${path}_${JSON.stringify(req.query)}`;
    const cached = cache.coingecko.get(cacheKey);

    // Dynamic TTL based on content: snapshots live longer than live data
    const isStatic = path.includes('list') || path.includes('info');
    const dynamicTTL = isStatic ? 3600000 : 600000; // 1h for static, 10m for charts/live (increased from 5m)

    if (cached && (Date.now() - cached.timestamp < dynamicTTL)) {
        return res.json(cached.data);
    }

    const cgKey = process.env.COINGECKO_API_KEY;

    // Graceful Degradation: If no API key, return 200 with disabled status instead of 503
    if (!cgKey || cgKey.trim() === '') {
        if (cached) {
            console.warn(`[PROXY] CoinGecko disabled (no API key). Serving stale cache for ${path}`);
            return res.json(cached.data);
        }
        console.warn(`[PROXY] CoinGecko disabled (no API key). Request for ${path} placeholder returned.`);
        return res.json({
            disabled: true,
            error: 'CoinGecko features disabled',
            message: 'Add COINGECKO_API_KEY to .env to enable',
            isConfigError: true
        });
    }

    try {
        // Use request queue to prevent rate limiting
        const response = await coinGeckoQueue.enqueue(async () => {
            const url = `https://api.coingecko.com/api/v3/${path}`;

            return await axios.get(url, {
                params: req.query,
                headers: {
                    'User-Agent': 'Institutional-Trading-Platform/1.0',
                    'Accept': 'application/json',
                    'x-cg-demo-api-key': cgKey.trim()
                },
                timeout: 8000
            });
        });

        cache.coingecko.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        console.error(`[PROXY ERROR] CoinGecko (${req.path}): ${status} - ${error.message}`);

        // FALLBACK: If throttled but we HAVE cached data (even if stale), return it
        if ((status === 429 || status === 500 || status === 503) && cached) {
            console.warn(`[PROXY] Serving stale CoinGecko data for ${path} due to error ${status}`);
            return res.json(cached.data);
        }

        if (status === 401) {
            console.warn(`[PROXY] CoinGecko Unauthorized - Check API Key`);
            return res.status(401).json({ error: 'CoinGecko Unauthorized. Check COINGECKO_API_KEY in .env', isConfigError: true });
        }

        // Final safety: Ensure response is always JSON
        const errorData = (error.response?.data && typeof error.response.data === 'object')
            ? error.response.data
            : { error: error.message, status };

        res.status(status).json(errorData);
    }
});


// 1.3 Proxy for NewsAPI
app.use('/api/news/v2', async (req, res) => {
    const cacheKey = `news_v2_${JSON.stringify(req.query)}`;
    const cached = cache.coingecko.get(cacheKey); // Reuse coingecko map for generic caching

    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey || apiKey === 'MISSING') {
        return res.json({
            disabled: true,
            articles: [],
            totalResults: 0,
            message: 'NewsAPI key missing'
        });
    }

    if (cached && (Date.now() - cached.timestamp < 1800000)) { // 30m TTL for news (increased from 15m)
        return res.json(cached.data);
    }

    try {
        const path = req.path.replace(/^\//, '');
        const url = `https://newsapi.org/v2/${path}`;
        const apiKey = process.env.NEWS_API_KEY;

        const response = await axios.get(url, {
            params: { ...req.query, apiKey: apiKey },
            headers: {
                'User-Agent': 'Institutional-Trading-Platform/1.0',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        cache.coingecko.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        console.error(`[PROXY ERROR] NewsAPI (${req.path}): ${status} - ${error.message}`);

        // Fallback to stale if rate limited
        if (status === 429 && cached) {
            console.warn('[PROXY] NewsAPI Throttled. Serving stale news.');
            return res.json(cached.data);
        }

        // Final safety: Ensure response is always JSON
        const errorData = (error.response?.data && typeof error.response.data === 'object')
            ? error.response.data
            : { error: error.message, status };

        res.status(status).json(errorData);
    }
});

// 1.4 Proxy for Binance Ticker (24hr Statistics)
app.get('/api/binance/ticker/24hr', async (req, res) => {
    const { symbol } = req.query;
    let binanceSymbol = symbol ? symbol.replace('/', '').toUpperCase() : null;

    // Asset Mapping for Gold/Silver
    if (binanceSymbol === 'XAUUSDT') binanceSymbol = 'PAXGUSDT';
    if (binanceSymbol === 'XAGUSDT') binanceSymbol = 'PAXGUSDT';

    const cacheKey = binanceSymbol || 'all';
    const cached = cache.binance_ticker.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < 10000)) { // 10s TTL for tickers
        return res.json(cached.data);
    }

    try {
        const response = await axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, {
            params: binanceSymbol ? { symbol: binanceSymbol } : {}
        });

        cache.binance_ticker.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        console.error(`[PROXY ERROR] Ticker for ${req.query.symbol}: ${error.message}`);
        if (cached) return res.json(cached.data);
        const status = error.response?.status || 500;
        const errorData = (error.response?.data && typeof error.response.data === 'object')
            ? error.response.data
            : { error: error.message, status };

        res.status(status).json(errorData);
    }
});

// 1.5 Proxy for Fear & Greed Index
app.get('/api/sentiment/fng', async (req, res) => {
    const cacheKey = 'fng';
    const cached = cache.coingecko.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1h TTL
        return res.json(cached.data);
    }

    try {
        const response = await axios.get('https://api.alternative.me/fng/?limit=1', { timeout: 5000 });
        cache.coingecko.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        console.error(`[PROXY ERROR] Fear & Greed: ${error.message}`);
        if (cached) return res.json(cached.data);

        const status = error.response?.status || 500;
        res.status(status).json({
            error: 'Failed to fetch Fear & Greed',
            message: error.message,
            timestamp: Date.now(),
            fallback: true
        });
    }
});

// 1.5.1 Proxy for CryptoPanic (Crypto News)
app.get('/api/news/cryptopanic', async (req, res) => {
    try {
        const apiKey = process.env.CRYPTOPANIC_API_KEY || process.env.VITE_CRYPTOPANIC_KEY;
        if (!apiKey) return res.json({ disabled: true, results: [], message: 'CryptoPanic Key Missing' });

        const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
            params: { ...req.query, auth_token: apiKey },
            timeout: 8000
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// 1.5.2 Proxy for FMP (Economic Calendar)
app.get('/api/news/calendar', async (req, res) => {
    try {
        const apiKey = process.env.FMP_API_KEY || process.env.VITE_FMP_KEY;
        if (!apiKey) return res.json({ disabled: true, results: [], message: 'FMP Key Missing' });

        const response = await axios.get('https://financialmodelingprep.com/api/v3/economic_calendar', {
            params: { ...req.query, apikey: apiKey },
            timeout: 8000
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// 1.7 Proxy for Gemini AI
app.post('/api/ai/generate', async (req, res) => {
    try {
        const { prompt, model: modelName } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('[AI PROXY ERROR] GEMINI_API_KEY not found in server environment');
            return res.status(500).json({ error: 'AI Service Misconfigured' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName || 'gemini-flash-latest' });

        const fetchWithRetry = async (retries = 1) => {
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            } catch (err) {
                if (retries > 0 && (err.message?.includes('500') || err.message?.includes('overloaded'))) {
                    console.log(`[AI RETRY] Gemini overloaded, retrying...`);
                    await new Promise(r => setTimeout(r, 1000));
                    return fetchWithRetry(retries - 1);
                }
                throw err;
            }
        };

        const text = await fetchWithRetry();

        if (!text) {
            throw new Error('Empty response from Gemini');
        }

        res.json({ text });
    } catch (error) {
        console.error(`[AI PROXY ERROR] Model: ${req.body.model || 'default'}: ${error.message}`);
        if (error.stack) console.error(error.stack);

        res.status(500).json({
            error: 'AI Generation Failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 1.6 System Health
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        cacheSizes: {
            coingecko: cache.coingecko.size,
            ticker: cache.binance_ticker.size
        },
        environment: 'PRO_TERMINAL'
    });
});

// 2. Authenticated: Fetch Account Balances
app.get('/api/binance/account', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const apiSecret = req.headers['x-api-secret'];
        if (!apiKey || !apiSecret) return res.status(401).json({ error: 'Missing API Keys' });

        const params = { timestamp: Date.now(), recvWindow: 5000 };
        const signature = signRequest(params, apiSecret);

        const response = await axios.get(`${BINANCE_BASE}/api/v3/account`, {
            params: { ...params, signature },
            headers: { 'X-MBX-APIKEY': apiKey }
        });

        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || error.message);
    }
});

// 3. Authenticated: Place Order (Spot)
app.post('/api/binance/order', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const apiSecret = req.headers['x-api-secret'];
        if (!apiKey || !apiSecret) return res.status(401).json({ error: 'Missing API Keys' });

        const { symbol, side, type, quantity, price, stopPrice } = req.body;

        const params = {
            symbol: symbol.toUpperCase(),
            side: side.toUpperCase(),
            type: type.toUpperCase(),
            quantity,
            timestamp: Date.now(),
            recvWindow: 5000
        };

        if (price) params.price = price;
        if (stopPrice) params.stopPrice = stopPrice;
        if (type === 'LIMIT') params.timeInForce = 'GTC';

        const signature = signRequest(params, apiSecret);

        const response = await axios.post(`${BINANCE_BASE}/api/v3/order`, null, {
            params: { ...params, signature },
            headers: { 'X-MBX-APIKEY': apiKey }
        });

        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || error.message);
    }
});

// 4. Authenticated: Get Open Orders
app.get('/api/binance/open-orders', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const apiSecret = req.headers['x-api-secret'];
        if (!apiKey || !apiSecret) return res.status(401).json({ error: 'Missing API Keys' });

        const { symbol } = req.query;
        const params = { timestamp: Date.now(), recvWindow: 5000 };
        if (symbol) params.symbol = symbol.toUpperCase();

        const signature = signRequest(params, apiSecret);

        const response = await axios.get(`${BINANCE_BASE}/api/v3/openOrders`, {
            params: { ...params, signature },
            headers: { 'X-MBX-APIKEY': apiKey }
        });

        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || error.message);
    }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`✅ Institutional Proxy running on http://localhost:${PORT}`);
    });
}

export default app;
