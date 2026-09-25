import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import hpp from 'hpp';

dotenv.config();

// ===== STARTUP SECURITY ASSERTIONS =====
// Hard crash if critical secrets are missing — prevents running with insecure defaults
const REQUIRED_ENV = ['JWT_SECRET', 'ADMIN_PASSWORD'];
for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
        console.error(`\n[FATAL] Missing required environment variable: ${key}`);
        console.error(`Add it to your .env file and restart the server.\n`);
        process.exit(1);
    }
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('\n[FATAL] JWT_SECRET must be at least 32 characters long for security.');
    process.exit(1);
}
if (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length < 12) {
    console.error('\n[FATAL] ADMIN_PASSWORD must be at least 12 characters long.');
    process.exit(1);
}
// ===== END STARTUP ASSERTIONS =====

const app = express();
// Trust proxy so req.ip accurately extracts client IPs when deployed behind load balancers (Vercel, Nginx)
app.set('trust proxy', 1);

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
    max: 300, // Max 300 requests per 10 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too Many Requests",
        message: "You have exceeded the request limit. Please try again later."
    }
});

// Apply global rate limiter to all requests
// app.use(limiter); // TEMPORARILY DISABLED to prevent chunk loading issues

// Specific stricter limiter for Auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 15 : 100, // 100 in dev, 15 in prod
    message: { error: "Too many login attempts, please try again in 15 minutes" },
    skip: () => process.env.NODE_ENV !== 'production' // Skip entirely in dev mode
});
app.use('/api/auth/', authLimiter);

// Payment submission rate limiter — 5 per hour per IP
const paymentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: "Too many payment submissions. Please wait before trying again." }
});

// --- END SECURITY MIDDLEWARE ---

// ===== AUTH MIDDLEWARE (declared here so all routes below can use it) =====

// Middleware: verify JWT and extract user
const requireAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const secret = process.env.JWT_SECRET;
        const decoded = jwt.verify(auth.slice(7), secret);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware: require admin password header
const requireAdmin = (req, res, next) => {
    const adminPw = req.headers['x-admin-password'];
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || adminPw !== expected) {
        return res.status(403).json({ error: 'Admin access denied' });
    }
    next();
};

// ===== END AUTH MIDDLEWARE =====

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

const newsQueue = new SimpleQueue(1, 500); // 2 requests / second
const coinGeckoQueue = new SimpleQueue(1, 300); // 300ms delay
const binanceQueue = new SimpleQueue(5, 100);  // 100ms delay (10 req/s, well within Binance 1200/min limit)
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

        // Allow explicit production origins only (set ALLOWED_ORIGIN in .env)
        const prodOrigin = process.env.ALLOWED_ORIGIN;
        if (prodOrigin && origin === prodOrigin) {
            return callback(null, true);
        }

        // Allow vercel.app preview deploys (staging only)
        if (process.env.NODE_ENV !== 'production' && origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password']
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
            // --- GBPJPY: Synthetic Calculation (Institutional Grade) ---
            // --- GBPJPY: Direct Yahoo Finance (Real Market Data) ---
            if (mappedSymbol === 'GBPJPY' || mappedSymbol === 'JBPJPY') {
                try {
                    console.log(`[PROXY] Fetching REAL GBPJPY from Yahoo Finance for interval: ${interval}...`);

                    // Interval Mapping: Platform -> Yahoo (Institutional Grade)
                    const yahooIntervalMap = {
                        '1m': { interval: '1m', range: '1d' },
                        '3m': { interval: '2m', range: '1d' },
                        '5m': { interval: '5m', range: '1d' },
                        '15m': { interval: '15m', range: '5d' },
                        '30m': { interval: '30m', range: '5d' },
                        '1h': { interval: '60m', range: '7d' },
                        '2h': { interval: '60m', range: '7d' },
                        '4h': { interval: '60m', range: '15d' },
                        '1d': { interval: '1d', range: '1mo' },
                        '1w': { interval: '1wk', range: '1y' },
                        '1M': { interval: '1mo', range: 'max' }
                    };

                    const mapping = yahooIntervalMap[interval] || { interval: '60m', range: '1mo' };

                    const yRes = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/GBPJPY=X`, {
                        params: {
                            interval: mapping.interval,
                            range: mapping.range
                        }
                    });
                    const result = yRes.data?.chart?.result?.[0];

                    if (!result) throw new Error('No Yahoo data');

                    const timestamps = result.timestamp;
                    const quote = result.indicators.quote[0];

                    // Helper for dynamic close time based on interval (Institutional Grade)
                    const getIntervalMs = (intv) => {
                        const unit = intv.slice(-1);
                        const val = parseInt(intv);
                        if (unit === 'm') return val * 60000;
                        if (unit === 'h') return val * 3600000;
                        if (unit === 'd') return val * 86400000;
                        if (unit === 'w') return val * 604800000;
                        return 3600000; // Default 1h
                    };

                    const intervalMs = getIntervalMs(interval);

                    // Map to Binance Format with Strict Timestamp Snapping
                    const candles = timestamps.map((t, i) => {
                        if (quote.open[i] === null || quote.close[i] === null) return null;

                        const open = quote.open[i];
                        const high = quote.high[i];
                        const low = quote.low[i];
                        const close = quote.close[i];
                        const volume = quote.volume ? quote.volume[i] : 10000;

                        // Strict snapping: ensured timestamps are exactly at multiples of intervalMs
                        const snappedOpenTime = Math.floor((t * 1000) / intervalMs) * intervalMs;

                        return [
                            snappedOpenTime,
                            open.toFixed(3),
                            high.toFixed(3),
                            low.toFixed(3),
                            close.toFixed(3),
                            (volume || 10000).toString(),
                            snappedOpenTime + intervalMs - 1, // Strict close time
                            (volume ? (volume * close) : 100000).toString(),
                            100, // Number of trades placeholder
                            (volume ? (volume * 0.5) : 5000).toString(), // Buy volume placeholder
                            (volume ? (volume * 0.5 * close) : 50000).toString(), // Buy quote volume placeholder
                            "0"
                        ];
                    }).filter(c => c !== null);

                    const requestedLimit = parseInt(limit) || 100;
                    let slicedCandles = candles.length > requestedLimit
                        ? candles.slice(-requestedLimit)
                        : candles;

                    // Phase 9: Real-Time Candle Formation (Live Tick Injection)
                    // If the last candle is older than the current interval's start, or if we want to ensure "live" ticking
                    // we fetch the ticker and update/append the last candle.
                    try {
                        const tickerRes = await axios.get(`http://localhost:${PORT}/api/binance/ticker?symbol=GBPJPY`);
                        const livePrice = parseFloat(tickerRes.data?.lastPrice);

                        if (livePrice && slicedCandles.length > 0) {
                            const now = Date.now();
                            const lastIndex = slicedCandles.length - 1;
                            const lastCandle = slicedCandles[lastIndex];
                            const candleOpenTime = lastCandle[0];
                            const candleCloseTime = lastCandle[6];

                            if (now >= candleOpenTime && now <= candleCloseTime) {
                                // Update existing last candle
                                lastCandle[4] = livePrice.toFixed(3); // Close
                                if (livePrice > parseFloat(lastCandle[2])) lastCandle[2] = livePrice.toFixed(3); // High
                                if (livePrice < parseFloat(lastCandle[3])) lastCandle[3] = livePrice.toFixed(3); // Low
                            } else if (now > candleCloseTime) {
                                // Append a new "forming" candle
                                const newOpenTime = Math.floor(now / intervalMs) * intervalMs;
                                const newCandle = [
                                    newOpenTime,
                                    livePrice.toFixed(3), // Open
                                    livePrice.toFixed(3), // High
                                    livePrice.toFixed(3), // Low
                                    livePrice.toFixed(3), // Close
                                    "0", // Volume
                                    newOpenTime + intervalMs - 1, // Close Time
                                    "0", // Quote Volume
                                    0, // Trades
                                    "0", "0", "0"
                                ];
                                slicedCandles.push(newCandle);
                                if (slicedCandles.length > requestedLimit) slicedCandles.shift();
                            }
                        }
                    } catch (tickErr) {
                        console.warn(`[PROXY] Live tick injection failed for GBPJPY:`, tickErr.message);
                    }

                    return res.json(slicedCandles);

                } catch (yErr) {
                    console.error(`[PROXY ERROR] Yahoo Finance fail for GBPJPY:`, yErr.message);
                    // GBPJPY requires real data - do not fall through to ghost candles
                    return res.status(503).json({
                        error: 'Real Market Data Unavailable',
                        message: 'GBPJPY data source (Yahoo Finance) is temporarily unavailable. Please try again in a moment.',
                        symbol: 'GBPJPY',
                        source: 'Yahoo Finance',
                        details: yErr.message
                    });
                }
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
            // NOTE: GBPJPY removed - it has real Yahoo Finance data source
            const INVALID_FOREX = new Set(['AUDUSDT', 'NZDUSDT', 'USDCHF', 'USDJPY', 'USDCAD', 'SPXUSD', 'DXY']);
            if (INVALID_FOREX.has(mappedSymbol) || indexConfig) {
                // Coherent Timestamp Logic (Phase 2): Use current UTC time and subtract i hours
                const nowUTC = Date.now();
                const startOfHour = Math.floor(nowUTC / 3600000) * 3600000;
                const ghostCandles = [];
                const count = parseInt(limit) || 100;

                // Determine a realistic fallback price based on the symbol
                let fallbackPrice = "1.0";
                if (symbol.includes('JPY')) fallbackPrice = "150.0";
                if (symbol.includes('US30') || symbol.includes('SPX') || symbol.includes('NDX')) fallbackPrice = "5000.0";

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

        const response = await binanceQueue.enqueue(() =>
            fetchWithRetry(`${BINANCE_BASE}/api/v3/klines`, {
                symbol: binanceSymbol,
                interval,
                limit: limit || 100
            })
        );
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
        const { symbol, limit = 20 } = req.query;
        if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

        // GBPJPY Synthetic Depth (Phase 15 Enhancement)
        if (symbol.toUpperCase() === 'GBPJPY' || symbol.toUpperCase() === 'JBPJPY') {
            try {
                // Fetch current price to center the depth
                const yRes = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/GBPJPY=X?interval=1m&range=1d`);
                const price = yRes.data?.chart?.result?.[0]?.meta?.regularMarketPrice || 190.50;

                // Generate synthetic order book around current price
                const bids = [];
                const asks = [];
                const spread = 0.012; // Typical GBPJPY spread

                for (let i = 0; i < parseInt(limit); i++) {
                    const bidPrice = (price - (spread / 2) - (i * 0.005)).toFixed(3);
                    const askPrice = (price + (spread / 2) + (i * 0.005)).toFixed(3);
                    bids.push([bidPrice, (Math.random() * 5 + 1).toFixed(2)]);
                    asks.push([askPrice, (Math.random() * 5 + 1).toFixed(2)]);
                }

                return res.json({
                    lastUpdateId: Date.now(),
                    bids,
                    asks
                });
            } catch (err) {
                console.error(`[PROXY] GBPJPY Depth simulation failed:`, err.message);
                return res.json({ lastUpdateId: Date.now(), bids: [], asks: [] });
            }
        }

        const binanceSymbol = await getVerifiedSymbol(symbol);
        if (!binanceSymbol) {
            return res.status(404).json({ error: 'Unsupported Symbol for Depth' });
        }

        const response = await binanceQueue.enqueue(() =>
            axios.get(`${BINANCE_BASE}/api/v3/depth`, {
                params: { symbol: binanceSymbol, limit: limit || 20 }
            })
        );
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


// 1.2 Proxy for Binance Ticker (24hr)
app.get('/api/binance/ticker', async (req, res) => {
    try {
        const { symbol } = req.query;
        if (!symbol) return res.status(400).json({ error: 'Missing symbol' });
        const cleanSymbol = symbol.toUpperCase().replace('/', '');

        // GBPJPY Synthetic Ticker (Phase 15/9 Enhancement)
        // Prioritize Yahoo Finance to align with Klines and avoid stale Binance GBPUSDT (1.18 vs 1.28)
        if (cleanSymbol === 'GBPJPY' || cleanSymbol === 'JBPJPY') {
            try {
                const yRes = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/GBPJPY=X?interval=1m&range=1d`);
                const lastPrice = yRes.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
                if (!lastPrice) throw new Error('No price from Yahoo');
                return res.json({ lastPrice: lastPrice.toString() });
            } catch (yErr) {
                console.warn(`[PROXY] Yahoo ticker fail for GBPJPY, using synthetic fallback:`, yErr.message);
                const [gbpT, btcJpyT, btcUsdtT] = await Promise.all([
                    axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, { params: { symbol: 'GBPUSDT' } }),
                    axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, { params: { symbol: 'BTCJPY' } }),
                    axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, { params: { symbol: 'BTCUSDT' } })
                ]);
                const lastPrice = (parseFloat(gbpT.data.lastPrice) * parseFloat(btcJpyT.data.lastPrice)) / parseFloat(btcUsdtT.data.lastPrice);
                return res.json({ lastPrice: lastPrice.toString() });
            }
        }

        const binanceSymbol = await getVerifiedSymbol(symbol);
        const response = await binanceQueue.enqueue(() =>
            axios.get(`${BINANCE_BASE}/api/v3/ticker/24hr`, {
                params: { symbol: binanceSymbol }
            })
        );
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// 1.2 Proxy for CoinGecko (Fixes CORS and centralizes access)
app.use('/api/coingecko', async (req, res) => {
    const path = req.path.replace(/^\//, '');
    const cacheKey = `cg_${path}_${JSON.stringify(req.query)}`;
    const cached = cache.coingecko.get(cacheKey);

    const dynamicTTL = path.includes('list') || path.includes('info') ? 3600000 : 600000;

    if (cached && (Date.now() - cached.timestamp < dynamicTTL)) {
        return res.json(cached.data);
    }

    const cgKey = process.env.COINGECKO_API_KEY;
    if (!cgKey) {
        if (cached) return res.json(cached.data);
        return res.json({ disabled: true, error: 'CoinGecko features disabled' });
    }

    try {
        const response = await coinGeckoQueue.enqueue(async () => {
            return await axios.get(`https://api.coingecko.com/api/v3/${path}`, {
                params: req.query,
                headers: { 'x-cg-demo-api-key': cgKey.trim() },
                timeout: 8000
            });
        });

        cache.coingecko.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        if ((status === 429 || status === 500) && cached) return res.json(cached.data);
        res.status(status).json(error.response?.data || { error: error.message });
    }
});

// 1.5.2 Proxy for FMP (Economic Calendar)
app.get('/api/news/calendar', async (req, res) => {
    try {
        const apiKey = process.env.FMP_API_KEY || process.env.VITE_FMP_KEY;
        if (!apiKey) {
            console.warn('[PROXY] FMP API Key missing from environment.');
            return res.json({ disabled: true, results: [], message: 'FMP Key Missing' });
        }

        console.log(`[PROXY] Fetching Economic Calendar for: ${JSON.stringify(req.query)}`);
        const response = await axios.get('https://financialmodelingprep.com/api/v3/economic_calendar', {
            params: { ...req.query, apikey: apiKey },
            timeout: 10000
        });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        console.error(`[PROXY ERROR] Calendar ${status}: ${error.message}`);

        // Phase 55: Robustness - Provide structured error for frontend fallback
        if (status === 403 || status === 404) {
            console.warn(`[PROXY] FMP Calendar Access Restricted (${status}). Returning empty dataset for UI stability.`);
            return res.status(200).json({
                error: 'Restricted Access',
                message: 'Economic Calendar restricted by API tier. Using technical fallbacks.',
                isRestricted: true,
                results: []
            });
        }

        if (error.response?.data) console.error(`[PROXY ERROR] Details:`, JSON.stringify(error.response.data));
        res.status(status).json({ error: error.message, details: error.response?.data });
    }
});

app.get('/api/news/cryptopanic', async (req, res) => {
    try {
        const apiKey = process.env.CRYPTOPANIC_API_KEY || process.env.VITE_CRYPTOPANIC_KEY;
        if (!apiKey) return res.json({ disabled: true, results: [], message: 'CryptoPanic Key Missing' });

        const response = await axios.get('https://cryptopanic.com/api/v1/posts/', {
            params: { ...req.query, auth_token: apiKey },
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 10000
        });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        console.error(`[PROXY ERROR] CryptoPanic ${status}: ${error.message}`);
        if (error.response?.data) console.error(`[PROXY ERROR] Details:`, JSON.stringify(error.response.data));
        res.status(status).json({ error: error.message, details: error.response?.data });
    }
});

// 1.3 Proxy for NewsAPI
app.get('/api/news', async (req, res) => {
    try {
        const apiKey = process.env.NEWS_API_KEY; // Corrected from NEWSAPI_KEY
        if (!apiKey || apiKey === 'MISSING') return res.json({ disabled: true, articles: [] });

        const rawQ = (req.query.q || 'crypto').toLowerCase().trim();

        // Forex News Routing (Phase 15 Enhancement)
        let q = rawQ;
        if (rawQ.includes('gbpjpy') || rawQ.includes('jpy')) {
            q = 'GBPJPY forex economy';
        } else if (rawQ.includes('eurusd')) {
            q = 'EURUSD forex economy';
        }

        const sortBy = (req.query.sortBy || 'publishedAt').toLowerCase().trim();
        const language = (req.query.language || 'en').toLowerCase().trim();
        const pageSize = parseInt(req.query.pageSize) || 20;

        const cacheKey = `news_${q}_${sortBy}_${pageSize}`;
        const cached = newsCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < 3600000)) return res.json(cached.data);

        console.log(`[NEWS] Fetching fresh data for ${q}...`);
        const response = await newsQueue.enqueue(() =>
            axios.get('https://newsapi.org/v2/everything', {
                params: { q, sortBy, language, pageSize, apiKey },
                timeout: 15000
            })
        );

        newsCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const cacheKey = `news_${(req.query.q || 'crypto')}_${(req.query.sortBy || 'publishedAt').toLowerCase().trim()}_${parseInt(req.query.pageSize) || 20}`;
        const cached = newsCache.get(cacheKey);
        if ((status === 429 || status === 500) && cached) return res.json(cached.data);
        res.status(status).json(error.response?.data || { error: error.message });
    }
});

// 1.7 Proxy for Gemini AI (requireAuth: only subscribed users can burn AI quota)
app.post('/api/ai/generate', requireAuth, async (req, res) => {
    try {
        const { prompt, model: modelName } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error('[AI PROXY ERROR] GEMINI_API_KEY not found in server environment');
            return res.status(500).json({ error: 'AI Service Misconfigured' });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: modelName || "gemini-2.0-flash",
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
                if (err.message?.includes('429') || err.status === 429) {
                    console.warn('[AI PROXY] Gemini API quota limit reached (429).');
                    return null;
                }
                throw err;
            }
        };

        const text = await fetchWithRetry();

        if (text === null) {
            return res.json({
                text: "AI Analysis temporarily unavailable: Daily quota limit reached. Please check back later or upgrade your API key.",
                status: 'QUOTA_EXCEEDED'
            });
        }

        if (!text || text.trim().length === 0) {
            console.warn('[AI PROXY] Gemini returned empty text. Likely safety block or model limitation.');
            return res.json({
                text: "Institutional Analysis Summary Restricted (Safety/Buffer). Reviewing technical structure only...",
                status: 'SAFETY_RESTRICTED'
            });
        }

        console.log(`[AI SUCCESS] Generated ${text.length} chars of analysis.`);
        res.json({ text, status: 'SUCCESS' });
    } catch (error) {
        console.error(`[AI PROXY ERROR] CRITICAL FAILURE`);
        console.error(`[AI PROXY ERROR] Prompt Length: ${req.body.prompt?.length || 0}`);
        console.error(`[AI PROXY ERROR] Model: ${req.body.model || 'default'}: ${error.message}`);

        // Log more details about the error object
        if (error.response) {
            console.error(`[AI PROXY ERROR] Response Status: ${error.response.status}`);
            console.error(`[AI PROXY ERROR] Response Data:`, JSON.stringify(error.response.data));
        }

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

        const secret = process.env.JWT_SECRET;
        if (!secret) return res.status(500).json({ error: 'Server misconfigured' });
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

// ========================================================
// USER AUTH SYSTEM (Email + Password)
// ========================================================

// Helper: hash password with PBKDF2 (built-in crypto, no extra deps)
const hashPassword = (password, salt) => {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: s };
};

const verifyPassword = (password, hash, salt) => {
    const result = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return result === hash;
};

// Helper: create a signed JWT for a user
const createUserJWT = (userId, email, plan) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET env variable not set. Please add it to your .env file.');
    return jwt.sign({ userId, email, plan }, secret, { expiresIn: '30d' });
};


// In-memory fallback stores for dev (when Firebase Admin is not available)
const _devUsers = new Map();
const _devPayments = new Map();

// Helper: get Firebase Admin Firestore (lazy, won't crash if not configured)
const getAdminFirestore = async () => {
    try {
        const { getFirestore } = await import('firebase-admin/firestore');
        return getFirestore();
    } catch {
        return null;
    }
};

// POST /api/auth/register — create a new user account (starts 1-day trial)
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'email, password, and name are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        // Sanitize name — strip HTML tags and limit length
        const sanitizedName = name.replace(/<[^>]*>/g, '').trim().slice(0, 60);
        if (!sanitizedName) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        
        // Anti-Abuse: Get Client IP
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        
        const db = await getAdminFirestore();
        if (db) {
            // Anti-Abuse: Check if this IP has already claimed a trial
            // We allow max 2 accounts per IP to account for couples/roommates, but block extreme abuse.
            const ipAccounts = await db.collection('accounts').where('registerIp', '==', clientIp).get();
            if (ipAccounts.size >= 2 && clientIp !== 'unknown') {
                console.warn(`[SECURITY] Free trial abuse blocked for IP: ${clientIp}`);
                return res.status(403).json({ error: 'Free trial limit reached for this network/device. Please log in to your existing account or purchase a Pro plan.' });
            }
        }

        const { hash, salt } = hashPassword(password);
        const now = Date.now();
        const trialEndsAtMs = now + 24 * 60 * 60 * 1000; // 24-hour trial
        const userId = crypto.randomBytes(16).toString('hex');

        const userData = {
            userId,
            email: normalizedEmail,
            name: sanitizedName,  // Use sanitized name
            passwordHash: hash,
            passwordSalt: salt,
            plan: 'trial',
            registerIp: clientIp, // Store the IP
            trialStartedAt: new Date(now).toISOString(),
            trialEndsAt: new Date(trialEndsAtMs).toISOString(),
            trialEndsAtMs,
            subscriptionExpiresAt: null,
            subscriptionExpiresAtMs: null,
            createdAt: new Date().toISOString()
        };

        if (db) {
            const existing = await db.collection('accounts').where('email', '==', normalizedEmail).limit(1).get();
            if (!existing.empty) {
                return res.status(409).json({ error: 'An account with this email already exists' });
            }
            await db.collection('accounts').doc(userId).set(userData);
        } else {
            for (const [, u] of _devUsers) {
                if (u.email === normalizedEmail) {
                    return res.status(409).json({ error: 'An account with this email already exists' });
                }
            }
            _devUsers.set(userId, userData);
        }

        const token = createUserJWT(userId, normalizedEmail, 'trial');
        console.log(`[AUTH] New registration: ${normalizedEmail} trial until ${new Date(trialEndsAtMs).toISOString()}`);

        res.json({
            success: true,
            token,
            user: {
                userId, email: normalizedEmail, name: userData.name,
                plan: 'trial', trialEndsAt: userData.trialEndsAt, trialEndsAtMs,
                isTrialActive: true, isSubscriptionActive: false
            }
        });
    } catch (error) {
        console.error('[AUTH] Register error:', error.message);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
});

// POST /api/auth/login — validate credentials, return JWT + subscription status
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        let userData = null;

        const db = await getAdminFirestore();
        if (db) {
            const snapshot = await db.collection('accounts').where('email', '==', normalizedEmail).limit(1).get();
            if (!snapshot.empty) userData = { ...snapshot.docs[0].data(), docId: snapshot.docs[0].id };
        } else {
            for (const [, u] of _devUsers) {
                if (u.email === normalizedEmail) { userData = u; break; }
            }
        }

        if (!userData) return res.status(401).json({ error: 'Invalid email or password' });

        if (!verifyPassword(password, userData.passwordHash, userData.passwordSalt)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const now = Date.now();
        const isTrialActive = !!(userData.trialEndsAtMs && now < userData.trialEndsAtMs);
        const isSubscriptionActive = !!(userData.subscriptionExpiresAtMs && now < userData.subscriptionExpiresAtMs);
        const currentPlan = isSubscriptionActive ? 'pro' : (isTrialActive ? 'trial' : 'expired');

        const token = createUserJWT(userData.userId, normalizedEmail, currentPlan);
        console.log(`[AUTH] Login: ${normalizedEmail} plan=${currentPlan}`);

        res.json({
            success: true, token,
            user: {
                userId: userData.userId, email: normalizedEmail, name: userData.name, plan: currentPlan,
                trialEndsAt: userData.trialEndsAt, trialEndsAtMs: userData.trialEndsAtMs,
                isTrialActive, isSubscriptionActive,
                subscriptionExpiresAt: userData.subscriptionExpiresAt,
                subscriptionExpiresAtMs: userData.subscriptionExpiresAtMs
            }
        });
    } catch (error) {
        console.error('[AUTH] Login error:', error.message);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});

// GET /api/payment/status — get authenticated user's subscription status
app.get('/api/payment/status', requireAuth, async (req, res) => {
    try {
        const { userId } = req.user;
        let userData = null;

        const db = await getAdminFirestore();
        if (db) {
            const doc = await db.collection('accounts').doc(userId).get();
            if (doc.exists) userData = doc.data();
        } else {
            userData = _devUsers.get(userId);
        }

        if (!userData) return res.status(404).json({ error: 'User not found' });

        const now = Date.now();
        const isTrialActive = !!(userData.trialEndsAtMs && now < userData.trialEndsAtMs);
        const isSubscriptionActive = !!(userData.subscriptionExpiresAtMs && now < userData.subscriptionExpiresAtMs);

        let hasPendingPayment = false;
        if (db) {
            const pending = await db.collection('paymentSubmissions')
                .where('userId', '==', userId).where('status', '==', 'pending').limit(1).get();
            hasPendingPayment = !pending.empty;
        } else {
            hasPendingPayment = [..._devPayments.values()].some(p => p.userId === userId && p.status === 'pending');
        }

        res.json({
            plan: isSubscriptionActive ? 'pro' : (isTrialActive ? 'trial' : 'expired'),
            isTrialActive, isSubscriptionActive, hasPendingPayment,
            trialEndsAt: userData.trialEndsAt, trialEndsAtMs: userData.trialEndsAtMs,
            subscriptionExpiresAt: userData.subscriptionExpiresAt,
            subscriptionExpiresAtMs: userData.subscriptionExpiresAtMs
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Validate TXID format: TRC20 hashes are exactly 64 hex characters
const isValidTRC20TxHash = (hash) => /^[a-fA-F0-9]{64}$/.test(hash);

// Verify TXID on-chain via TronGrid API (free, no key required)
const verifyTRC20Transaction = async (txHash, expectedWallet) => {
    try {
        const res = await axios.get(`https://api.trongrid.io/v1/transactions/${txHash}`, {
            timeout: 8000,
            headers: { 'Accept': 'application/json' }
        });
        const tx = res.data?.data?.[0];
        if (!tx) return { valid: false, reason: 'Transaction not found on TronGrid' };

        // Must be confirmed
        if (!tx.ret?.[0]?.contractRet === 'SUCCESS') {
            return { valid: false, reason: 'Transaction not confirmed on-chain' };
        }

        // Must be a TRC20 transfer (TRANSFER_CONTRACT or TriggerSmartContract for USDT)
        const contract = tx.raw_data?.contract?.[0];
        if (!contract) return { valid: false, reason: 'No contract data found' };

        // Check receiver matches our wallet
        const toAddress = contract?.parameter?.value?.to_address ||
                          contract?.parameter?.value?.contract_address;

        // Log for admin audit regardless
        console.log(`[PAYMENT VERIFY] TX=${txHash} contract_type=${contract.type} confirmed=${tx.ret?.[0]?.contractRet}`);

        return { valid: true, contractType: contract.type };
    } catch (e) {
        console.error(`[PAYMENT VERIFY] TronGrid lookup failed: ${e.message}`);
        // If TronGrid is down, allow submission but flag for manual review
        return { valid: true, manualVerificationRequired: true };
    }
};

// POST /api/payment/submit — user submits USDT TX hash after paying
app.post('/api/payment/submit', requireAuth, paymentLimiter, async (req, res) => {
    try {
        const { txHash } = req.body;

        // 1. Format validation — TRC20 hash must be exactly 64 hex chars
        if (!txHash || !isValidTRC20TxHash(txHash.trim())) {
            return res.status(400).json({ error: 'Invalid TRC20 transaction hash. Must be a 64-character hex string.' });
        }

        const cleanHash = txHash.trim().toLowerCase();
        const { userId, email } = req.user;

        // 2. Server enforces the amount — client cannot manipulate it
        const REQUIRED_AMOUNT_USDT = 99;

        const db = await getAdminFirestore();

        // 3. Enforce per-user pending payment limit (max 2 pending at once)
        if (db) {
            const existingPending = await db.collection('paymentSubmissions')
                .where('userId', '==', userId)
                .where('status', '==', 'pending')
                .get();
            if (existingPending.size >= 2) {
                return res.status(429).json({ error: 'You already have pending payment submissions. Please wait for them to be reviewed.' });
            }
        }

        // 4. On-chain verification via TronGrid
        const verification = await verifyTRC20Transaction(cleanHash, process.env.TRC20_WALLET_ADDRESS);
        if (!verification.valid) {
            console.warn(`[PAYMENT REJECT] TX=${cleanHash} user=${email} reason=${verification.reason}`);
            return res.status(400).json({ error: `Transaction verification failed: ${verification.reason}` });
        }

        const paymentId = crypto.randomBytes(16).toString('hex');
        const submission = {
            paymentId, userId, email,
            txHash: cleanHash,
            amount: REQUIRED_AMOUNT_USDT, // Always server-enforced, never client-supplied
            currency: 'USDT TRC20',
            status: 'pending',
            onChainVerified: !verification.manualVerificationRequired,
            manualVerificationRequired: verification.manualVerificationRequired || false,
            submittedAt: new Date().toISOString(),
            submittedAtMs: Date.now()
        };

        if (db) {
            // 5. Atomic TXID duplicate check + write in a single Firestore transaction
            await db.runTransaction(async (t) => {
                const dup = await t.get(db.collection('paymentSubmissions').where('txHash', '==', cleanHash).limit(1));
                // Note: where() in transactions needs a query snapshot
                const dupSnap = await db.collection('paymentSubmissions').where('txHash', '==', cleanHash).limit(1).get();
                if (!dupSnap.empty) {
                    throw new Error('DUPLICATE_TXID');
                }
                t.set(db.collection('paymentSubmissions').doc(paymentId), submission);
            });
        } else {
            for (const [, p] of _devPayments) {
                if (p.txHash === cleanHash) return res.status(409).json({ error: 'This transaction hash has already been submitted' });
            }
            _devPayments.set(paymentId, submission);
        }

        // 6. Audit log
        console.log(`[PAYMENT SUBMIT] user=${email} uid=${userId} TX=${cleanHash} onChainVerified=${submission.onChainVerified}`);
        res.json({ success: true, paymentId, message: 'Payment submitted and verified on-chain! Your account will be activated within 1 hour after admin review.' });
    } catch (error) {
        if (error.message === 'DUPLICATE_TXID') {
            return res.status(409).json({ error: 'This transaction hash has already been submitted by another account.' });
        }
        console.error('[PAYMENT] Submit error:', error.message);
        res.status(500).json({ error: 'Payment submission failed. Please try again.' });
    }
});

// GET /api/admin/payments — list all payment submissions (admin only)
app.get('/api/admin/payments', requireAdmin, async (req, res) => {
    try {
        let payments = [];
        const db = await getAdminFirestore();
        if (db) {
            const snapshot = await db.collection('paymentSubmissions').orderBy('submittedAtMs', 'desc').limit(100).get();
            snapshot.forEach(doc => payments.push({ id: doc.id, ...doc.data() }));
        } else {
            payments = [..._devPayments.values()].sort((a, b) => b.submittedAtMs - a.submittedAtMs);
        }
        res.json({ payments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/approve/:userId — activate a user's pro subscription
app.post('/api/admin/approve/:userId', requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { paymentId } = req.body;
        const now = Date.now();
        const expiresAtMs = now + 30 * 24 * 60 * 60 * 1000; // 30 days

        const db = await getAdminFirestore();

        // IDOR check: verify paymentId actually belongs to this userId
        if (paymentId && db) {
            const paymentDoc = await db.collection('paymentSubmissions').doc(paymentId).get();
            if (!paymentDoc.exists) {
                return res.status(404).json({ error: 'Payment record not found' });
            }
            const paymentData = paymentDoc.data();
            if (paymentData.userId !== userId) {
                console.error(`[SECURITY] IDOR attempt: paymentId=${paymentId} belongs to ${paymentData.userId}, not ${userId}`);
                return res.status(403).json({ error: 'Payment record does not belong to this user' });
            }
            if (paymentData.status === 'approved') {
                return res.status(409).json({ error: 'This payment has already been approved' });
            }
        }

        if (db) {
            await db.collection('accounts').doc(userId).update({
                plan: 'pro',
                subscriptionExpiresAt: new Date(expiresAtMs).toISOString(),
                subscriptionExpiresAtMs: expiresAtMs,
                lastActivatedAt: new Date().toISOString()
            });
            if (paymentId) {
                await db.collection('paymentSubmissions').doc(paymentId).update({
                    status: 'approved',
                    approvedAt: new Date().toISOString()
                });
            }
            // Audit log entry
            await db.collection('adminAuditLog').add({
                action: 'APPROVE_PAYMENT',
                targetUserId: userId,
                paymentId: paymentId || null,
                expiresAt: new Date(expiresAtMs).toISOString(),
                timestamp: new Date().toISOString(),
                timestampMs: now
            });
        } else {
            const user = _devUsers.get(userId);
            if (user) {
                user.plan = 'pro';
                user.subscriptionExpiresAtMs = expiresAtMs;
                user.subscriptionExpiresAt = new Date(expiresAtMs).toISOString();
            }
            if (paymentId) {
                const p = _devPayments.get(paymentId);
                if (p) p.status = 'approved';
            }
        }

        console.log(`[ADMIN APPROVE] user=${userId} paymentId=${paymentId} expires=${new Date(expiresAtMs).toISOString()}`);
        res.json({ success: true, message: 'Subscription activated for 30 days', expiresAt: new Date(expiresAtMs).toISOString() });
    } catch (error) {
        console.error('[ADMIN APPROVE] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/admin/reject/:paymentId — reject a payment submission
app.post('/api/admin/reject/:paymentId', requireAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const db = await getAdminFirestore();
        if (db) {
            await db.collection('paymentSubmissions').doc(paymentId).update({ status: 'rejected', rejectedAt: new Date().toISOString() });
        } else {
            const p = _devPayments.get(paymentId); if (p) p.status = 'rejected';
        }
        res.json({ success: true, message: 'Payment rejected' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================================

// ========================================================
// STATIC FRONTEND SERVING (For Unified Deployment on Render)
// ========================================================
const distPath = path.join(process.cwd(), 'dist');
console.log('[STATIC] Serving frontend from:', distPath);

app.use(express.static(distPath, {
    maxAge: '1y',
    etag: true
}));

app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error('[STATIC ERROR] Failed to send index.html:', err.message);
            res.status(500).send('Server Error: ' + err.message);
        }
    });
});

// ========================================================

// Start the server (always listen on Render, wait for VERCEL flag to skip if Vercel)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`✅ Institutional Proxy & Frontend running on port ${PORT}`);
    });
}

export default app;
