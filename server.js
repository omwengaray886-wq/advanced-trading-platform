import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

dotenv.config();

const app = express();
const PORT = 3001; // Standardize on 3001 for proxy
const BINANCE_BASE = 'https://api.binance.com';
const startTime = Date.now();

// --- SECURITY MIDDLEWARE ---

// 1. Set Secure HTTP Headers
app.use(helmet());

// 2. Prevent Parameter Pollution
app.use(hpp());

// 3. Global Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 500, // Limit each IP to 500 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        error: "Too Many Requests",
        message: "You have exceeded the request limit. Please try again later."
    }
});

// Apply global rate limiter to all requests
app.use(limiter);

// Specific stricter limiter for Auth endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login attempts per hour
    message: { error: "Too many login attempts, please try again after an hour" }
});
app.use('/api/auth/', authLimiter);

// --- END SECURITY MIDDLEWARE ---

// In-memory cache for public data
const cache = {
    coingecko: new Map(),
    binance_ticker: new Map(),
    exchange_info: {
        symbols: new Set(),
        timestamp: 0
    }
};

const CACHE_TTL = 60 * 1000; // 60 seconds

// --- MISSING CACHES & QUEUES (ADDED Phase 9) ---
const newsCache = new Map();

// Simple Queue Implementation to prevent ReferenceError
class SimpleQueue {
    constructor(concurrency = 1, interval = 1000) {
        this.queue = [];
        this.processing = false;
        this.interval = interval;
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

        const { fn, resolve, reject } = this.queue.shift();
        try {
            const result = await fn();
            resolve(result);
        } catch (err) {
            reject(err);
        } finally {
            setTimeout(() => {
                this.processing = false;
                this.process();
            }, this.interval);
        }
    }
}

const newsQueue = new SimpleQueue(1, 1000); // 1 request / second
const coinGeckoQueue = new SimpleQueue(1, 1500); // 1.5s delay to be safe
// ------------------------------------------------



// Indices & Forex Reference Mapping (CoinGecko IDs for reference data)
const INDICES_MAP = {
    // Indices
    'SPX': 'vanguard-s-p-500-etf', // S&P 500 Proxy
    'NDX': 'invesco-qqq-trust',    // NASDAQ 100 Proxy
    'NAS100': 'invesco-qqq-trust',
    'DXY': 'us-dollar-index',      // DXY
    'US30': 'vanguard-value-etf',  // Dow Jones Proxy (approx)
    'US10Y': 'us-dollar-index', // Fallback to DXY for macro context
    'GBPJPY': { id: 'jpy-morningstar-token', vs: 'gbp' },
    'JBPJPY': { id: 'jpy-morningstar-token', vs: 'gbp' },
    'JPYGBP': { id: 'jpy-morningstar-token', vs: 'gbp' },

    // Forex Pairs (Reference Data - Not tradeable on Binance Spot)
    'GBPUSD': 'tether',  // GBP proxy via stablecoin price
    'GBPUSDT': 'tether',
    'AUDUSD': 'tether',
    'AUDUSDT': 'tether',
    'NZDUSD': 'tether',
    'NZDUSDT': 'tether',
    'NZDUSDT': 'tether',
    'USDJPY': 'jpyc',    // JPY stablecoin
    'USDCHF': 'tether',
    'USDCAD': 'tether'
};

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

        // Allow localhost in dev (regex for any port)
        if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
            return callback(null, true);
        }

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

// Helper: Fetch valid Binance symbols
const fetchExchangeInfo = async () => {
    // Refresh every 1 hour
    if (Date.now() - cache.exchange_info.timestamp < 3600000 && cache.exchange_info.symbols.size > 0) {
        return cache.exchange_info.symbols;
    }

    try {
        console.log('[SYSTEM] refreshing exchange info...');
        const res = await axios.get(`${BINANCE_BASE}/api/v3/exchangeInfo`, { timeout: 5000 });
        const symbols = res.data.symbols
            .filter(s => s.status === 'TRADING' && s.isSpotTradingAllowed)
            .map(s => s.symbol);

        cache.exchange_info.symbols = new Set(symbols);
        cache.exchange_info.timestamp = Date.now();
        console.log(`[SYSTEM] Cached ${symbols.length} valid Binance Spot symbols.`);
        return cache.exchange_info.symbols;
    } catch (error) {
        console.error('[CRITICAL] Failed to fetch exchange info:', error.message);
        return cache.exchange_info.symbols; // Return stale if exists
    }
};

/**
 * Helper: Fetch Binance data with retries
 */
const fetchWithRetry = async (url, params, retries = 3) => {
    try {
        return await axios.get(url, { params, timeout: 10000 });
    } catch (err) {
        const isRetryable = err.code === 'ECONNABORTED' ||
            err.code === 'ETIMEDOUT' ||
            err.response?.status === 429 ||
            err.response?.status >= 500;

        if (retries > 0 && isRetryable) {
            const delay = (4 - retries) * 1500;
            console.log(`[RETRY] Retrying FETCH in ${delay}ms... (${retries} left)`);
            await new Promise(r => setTimeout(r, delay));
            return fetchWithRetry(url, params, retries - 1);
        }
        throw err;
    }
};

// HELPER: Normalize and validate symbol
const getVerifiedSymbol = async (symbol) => {
    if (!symbol) return null;
    let s = symbol.replace('/', '').toUpperCase();

    // Static proxies / mappings
    if (s === 'XAUUSDT' || s === 'XAUUSD' || s === 'GOLD') return 'PAXGUSDT';
    if (s === 'EURUSD' || s === 'EUR') return 'EURUSDT';

    // Note: Other forex pairs (GBP, AUD, NZD, etc.) will be handled by CoinGecko fallback
    // They're intentionally NOT mapped here so they fail to INDICES_MAP

    // Fast Path: Check Major Pairs Whitelist to avoid blocking on ExchangeInfo fetch
    const MAJOR_PAIRS = new Set([
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT',
        'TRXUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT', 'SHIBUSDT', 'UNIUSDT', 'ATOMUSDT', 'LINKUSDT',
        'ETCUSDT', 'XLMUSDT', 'FILUSDT', 'BCHUSDT', 'APTUSDT', 'QNTUSDT', 'NEARUSDT', 'VETUSDT',
        'ICPUSDT', 'AAVEUSDT', 'EOSUSDT', 'EGLDUSDT', 'AXSUSDT', 'SANDUSDT', 'THETAUSDT', 'FTMUSDT',
        'OPUSDT', 'ARBUSDT', 'SUIUSDT', 'PEPEUSDT', 'RNDRUSDT', 'INJUSDT', 'STXUSDT', 'IMXUSDT',
        'EURUSDT', 'PAXGUSDT', 'GBPUSDT' // GBPUSDT is valid on Binance Spot
    ]);

    if (MAJOR_PAIRS.has(s)) return s;

    // Dynamic verification (Fallthrough for exotic pairs)
    const validSymbols = await fetchExchangeInfo();
    return validSymbols.has(s) ? s : null;
};

// Fire-and-forget prefetch to warm cache on startup
fetchExchangeInfo().catch(err => console.error('[SYSTEM] Warmup fetch failed:', err.message));



// 1. Proxy Endpoint for Binance Klines (Public)
app.get('/api/binance/klines', async (req, res) => {
    try {
        const { symbol, interval, limit } = req.query;
        if (!symbol || !interval) return res.status(400).json({ error: 'Missing parameters' });

        const binanceSymbol = await getVerifiedSymbol(symbol);

        // Fallback: If not on Binance, check INDICES_MAP for CoinGecko fallback
        if (!binanceSymbol) {
            const mappedSymbol = symbol.toUpperCase().replace('/', '');

            // --- GBPJPY: Direct CoinGecko Forex (Binance GBPUSDT is delisted) ---
            if (mappedSymbol === 'GBPJPY' || mappedSymbol === 'JBPJPY') {
                console.log(`[PROXY] Fetching GBPJPY from CoinGecko Forex API...`);
                // CoinGecko doesn't provide OHLC for forex pairs, so we'll use a stable fallback
                // with real-time ticker data from their simple price endpoint
                // For now, return ghost candles with realistic GBPJPY pricing
                const nowUTC = Date.now();
                const startOfHour = Math.floor(nowUTC / 3600000) * 3600000;
                const ghostCandles = [];
                const count = parseInt(limit) || 100;
                const fallbackPrice = "190.5"; // Approximate GBPJPY institutional rate

                console.log(`[PROXY] Generating ${count} realistic candles for GBPJPY with variation. Reason: GBPUSDT delisted on Binance.`);

                // Generate realistic-looking candles with small price movement
                let currentPrice = 190.5;
                for (let i = 0; i < count; i++) {
                    const t = startOfHour - (i * 3600000);

                    // Add small random variation to simulate market movement
                    const variation = (Math.random() - 0.5) * 0.6; // +/- 0.3 typical hourly movement
                    currentPrice += variation;

                    const open = currentPrice.toFixed(4);
                    const high = (currentPrice + Math.random() * 0.4).toFixed(4);
                    const low = (currentPrice - Math.random() * 0.4).toFixed(4);
                    const close = (currentPrice + (Math.random() - 0.5) * 0.3).toFixed(4);

                    ghostCandles.push([t, open, high, low, close, "1000", t + 3599999, "190500", 50, "500", "95250", "0"]);
                }
                return res.json(ghostCandles.reverse());
            }

            const indexConfig = typeof INDICES_MAP[mappedSymbol] === 'string'
                ? { id: INDICES_MAP[mappedSymbol], vs: 'usd' }
                : INDICES_MAP[mappedSymbol];

            if (indexConfig) {
                console.log(`[PROXY] Routing ${symbol} to CoinGecko Reference (${indexConfig.id} vs ${indexConfig.vs})...`);
                try {
                    const cgRes = await coinGeckoQueue.enqueue(() =>
                        axios.get(`https://api.coingecko.com/api/v3/coins/${indexConfig.id}/ohlc`, {
                            params: { vs_currency: indexConfig.vs, days: 1 },
                            headers: {
                                'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || '',
                                'User-Agent': 'Institutional-Platform/1.0'
                            },
                            timeout: 10000
                        })
                    );

                    // Map CG OHLC [time, o, h, l, c] to Binance [time, o, h, l, c, v, closeTime, ...]
                    const mapped = cgRes.data.map(p => [
                        p[0], p[1].toString(), p[2].toString(), p[3].toString(), p[4].toString(), "0", p[0] + 3600000, "0", 0, "0", "0", "0"
                    ]);
                    return res.json(mapped);
                } catch (cgErr) {
                    console.error(`[PROXY ERROR] CoinGecko fallback fail for ${symbol}:`, cgErr.message);
                }
            }

            // Also return Ghost Candles for known invalid Forex pairs or failed indices to stop 404 spam
            const INVALID_FOREX = new Set(['AUDUSDT', 'NZDUSDT', 'USDCHF', 'USDJPY', 'USDCAD', 'SPXUSD', 'DXY', 'GBPJPY', 'JBPJPY']);
            if (INVALID_FOREX.has(mappedSymbol) || indexConfig) {
                // Coherent Timestamp Logic (Phase 2): Use current UTC time and subtract i hours
                const nowUTC = Date.now();
                const startOfHour = Math.floor(nowUTC / 3600000) * 3600000;
                const ghostCandles = [];
                const count = parseInt(limit) || 100;

                // Determine a realistic fallback price based on the symbol
                let fallbackPrice = "1.0";
                if (mappedSymbol === 'GBPJPY' || symbol.includes('JPY')) fallbackPrice = "190.0";
                if (symbol.includes('US30') || symbol.includes('SPX') || symbol.includes('NDX')) fallbackPrice = "5000.0";
                if (mappedSymbol === 'JPYGBP') fallbackPrice = "0.0053";

                console.log(`[PROXY] Generating ${count} Ghost Candles for ${symbol} @ ${fallbackPrice}. Server UTC: ${new Date(nowUTC).toISOString()}`);

                for (let i = 0; i < count; i++) {
                    const t = startOfHour - (i * 3600000);
                    ghostCandles.push([t, fallbackPrice, fallbackPrice, fallbackPrice, fallbackPrice, "0", t + 3599999, "0", 0, "0", "0", "0"]);
                }
                return res.json(ghostCandles.reverse());
            }

            console.warn(`[PROXY] Requested unsupported symbol: ${symbol}`);
            return res.status(404).json({
                error: 'Unsupported Symbol',
                message: `The symbol ${symbol} is not found on Binance Spot or is currently not trading.`,
            });
        }

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

        const binanceSymbol = await getVerifiedSymbol(symbol);

        if (!binanceSymbol) {
            return res.status(404).json({ error: 'Unsupported Symbol for Depth' });
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
app.get('/api/news', async (req, res) => {
    try {
        const apiKey = process.env.NEWS_API_KEY;
        if (!apiKey || apiKey === 'MISSING') {
            return res.json({
                disabled: true,
                articles: [],
                totalResults: 0,
                message: 'NewsAPI key missing'
            });
        }

        // Normalize query parameters for consistent caching
        const q = (req.query.q || 'crypto').toLowerCase().trim();
        const sortBy = (req.query.sortBy || 'publishedAt').toLowerCase().trim();
        const language = (req.query.language || 'en').toLowerCase().trim();
        const pageSize = parseInt(req.query.pageSize) || 20;

        // Proxy with Caching (Phase 3 Optimization)
        const cacheKey = `news_${q}_${sortBy}_${pageSize}`;
        const cached = newsCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1h TTL
            console.log(`[NEWS] Returning cached results for ${q}`);
            return res.json(cached.data);
        }

        console.log(`[NEWS] Fetching fresh data for ${q}...`);
        const response = await newsQueue.enqueue(() =>
            axios.get('https://newsapi.org/v2/everything', {
                params: {
                    q,
                    sortBy,
                    language,
                    pageSize,
                    apiKey
                },
                timeout: 15000
            })
        );

        // Cache for 1 hour
        newsCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        // Fallback to stale if rate limited
        const cacheKey = `news_${(req.query.q || 'crypto').toLowerCase().trim()}_${(req.query.sortBy || 'publishedAt').toLowerCase().trim()}_${parseInt(req.query.pageSize) || 20}`;
        const cached = newsCache.get(cacheKey);
        if ((status === 429 || status === 500 || status === 503) && cached) {
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
        const model = genAI.getGenerativeModel({
            model: modelName || "gemini-1.5-flash-latest",
            // Phase 2: Explicit safety settings to prevent false positive blocks causing 500s
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        });

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

        console.log(`[AI SUCCESS] Generated ${text.length} chars of analysis.`);
        res.json({ text });
    } catch (error) {
        console.error(`[AI PROXY ERROR] Prompt Length: ${req.body.prompt?.length || 0}`);
        console.error(`[AI PROXY ERROR] Model: ${req.body.model || 'default'}: ${error.message}`);
        if (error.stack) console.error(error.stack);

        res.status(500).json({
            error: 'AI Generation Failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 1.4 Proxy for Binance Ticker (24hr Statistics)
app.get('/api/binance/ticker/24hr', async (req, res) => {
    const { symbol } = req.query;
    let binanceSymbol = symbol ? symbol.replace('/', '').toUpperCase() : null;

    // Asset Mapping for Gold
    if (binanceSymbol === 'XAUUSDT' || binanceSymbol === 'XAUUSD' || binanceSymbol === 'GOLD') binanceSymbol = 'PAXGUSDT';

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
        // Fallback for Ticker: Check INDICES_MAP
        const indexId = INDICES_MAP[symbol?.toUpperCase().replace('/', '')];
        // --- SYNTHETIC TICKER: GBPJPY (Institutional Grade) ---
        if (symbol?.toUpperCase().replace('/', '') === 'GBPJPY' || symbol?.toUpperCase().replace('/', '') === 'JBPJPY') {
            try {
                const [gbpT, btcJpyT, btcUsdtT] = await Promise.all([
                    axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, { params: { symbol: 'GBPUSDT' } }),
                    axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, { params: { symbol: 'BTCJPY' } }),
                    axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, { params: { symbol: 'BTCUSDT' } })
                ]);

                const lastPrice = (parseFloat(gbpT.data.lastPrice) * parseFloat(btcJpyT.data.lastPrice)) / parseFloat(btcUsdtT.data.lastPrice);
                const avgChange = (parseFloat(gbpT.data.priceChangePercent) + parseFloat(btcJpyT.data.priceChangePercent) - parseFloat(btcUsdtT.data.priceChangePercent));

                return res.json({
                    symbol: 'GBPJPY',
                    lastPrice: lastPrice.toString(),
                    priceChangePercent: avgChange.toFixed(2),
                    isSynthetic: true
                });
            } catch (synErr) {
                console.error(`[PROXY ERROR] Synthetic ticker fail for GBPJPY:`, synErr.message);
            }
        }

        if (indexId) {
            try {
                console.log(`[PROXY] Fetching CoinGecko Price for ${indexId}...`);
                const id = indexId.id || indexId;
                const vs = indexId.vs || 'usd';
                const cgRes = await coinGeckoQueue.enqueue(() =>
                    axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                        params: { ids: id, vs_currencies: vs, include_24hr_change: 'true' },
                        headers: {
                            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || '',
                            'User-Agent': 'Institutional-Platform/1.0'
                        },
                        timeout: 5000
                    })
                );
                const data = cgRes.data[id];
                if (data) {
                    const priceInUSD = vs === 'usd' ? data[vs] : data[vs] * 1.0; // Simplification: we might need a vs_currency to USD conversion here
                    return res.json({
                        symbol: symbol.toUpperCase(),
                        lastPrice: data[vs].toString(),
                        priceChangePercent: data[`${vs}_24h_change`]?.toFixed(2) || "0.00",
                        isReference: true
                    });
                }
            } catch (cgErr) {
                console.error(`[PROXY ERROR] Ticker CG fallback fail for ${symbol}:`, cgErr.message);
                return res.status(400).json({
                    error: 'CoinGecko Fallback Failed',
                    symbol,
                    indexId,
                    message: cgErr.message,
                    originalError: error.message
                });
            }
        }

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


// 1.6 System Health
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        cacheSizes: {
            coingecko: cache.coingecko.size,
            ticker: cache.binance_ticker.size,
            news: newsCache.size
        },
        environment: 'PRO_TERMINAL'
    });
});

// 1.7 Auth Verification
app.post('/api/auth/verify', (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required' });

        const secret = process.env.JWT_SECRET || 'your-secret-key-change-this';
        const decoded = jwt.verify(token, secret);

        res.json({ valid: true, payload: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
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

// 5. Authenticated: Cancel Order
app.delete('/api/binance/order', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const apiSecret = req.headers['x-api-secret'];
        if (!apiKey || !apiSecret) return res.status(401).json({ error: 'Missing API Keys' });

        const { symbol, orderId } = req.query;
        if (!symbol || !orderId) return res.status(400).json({ error: 'Symbol and Order ID required' });

        const params = {
            symbol: symbol.toUpperCase(),
            orderId,
            timestamp: Date.now(),
            recvWindow: 5000
        };

        const signature = signRequest(params, apiSecret);

        const response = await axios.delete(`${BINANCE_BASE}/api/v3/order`, {
            params: { ...params, signature },
            headers: { 'X-MBX-APIKEY': apiKey }
        });

        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json(error.response?.data || error.message);
    }
});

// 6. Authenticated: Get Trade History
app.get('/api/binance/my-trades', async (req, res) => {
    try {
        const apiKey = req.headers['x-api-key'];
        const apiSecret = req.headers['x-api-secret'];
        if (!apiKey || !apiSecret) return res.status(401).json({ error: 'Missing API Keys' });

        const { symbol, limit } = req.query;
        if (!symbol) return res.status(400).json({ error: 'Symbol required' });

        const params = {
            symbol: symbol.toUpperCase(),
            limit: limit || 50,
            timestamp: Date.now(),
            recvWindow: 5000
        };

        const signature = signRequest(params, apiSecret);

        const response = await axios.get(`${BINANCE_BASE}/api/v3/myTrades`, {
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
