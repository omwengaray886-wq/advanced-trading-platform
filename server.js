import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import crypto from 'crypto';

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

// Enable CORS for frontend
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
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

// 1. Proxy Endpoint for Binance Klines (Public)
app.get('/api/binance/klines', async (req, res) => {
    try {
        const { symbol, interval, limit } = req.query;
        if (!symbol || !interval) return res.status(400).json({ error: 'Missing parameters' });

        let binanceSymbol = symbol.replace('/', '').toUpperCase();
        if (binanceSymbol === 'XAUUSDT') binanceSymbol = 'PAXGUSDT';

        const response = await axios.get(`${BINANCE_BASE}/api/v3/klines`, {
            params: { symbol: binanceSymbol, interval, limit: limit || 100 }
        });
        res.json(response.data);
    } catch (error) {
        const targetUrl = `${BINANCE_BASE}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit || 100}`;
        console.error(`[PROXY ERROR] Klines 500 for ${req.query.symbol} (Target: ${targetUrl}): ${error.message}`);

        if (error.response) {
            console.error('[BINANCE ERROR DATA]', error.response.data);
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ error: 'Binance Proxy Connection Failed', details: error.message, target: targetUrl });
    }
});

// 1.1 Proxy for Binance Depth (Public)
app.get('/api/binance/depth', async (req, res) => {
    try {
        const { symbol, limit } = req.query;
        if (!symbol) return res.status(400).json({ error: 'Missing symbol' });

        let binanceSymbol = symbol.replace('/', '').toUpperCase();

        // Asset Mapping: Binance Spot doesn't have XAUUSDT, use PAXGUSDT (Gold)
        if (binanceSymbol === 'XAUUSDT') binanceSymbol = 'PAXGUSDT';
        if (binanceSymbol === 'XAGUSDT') binanceSymbol = 'PAXGUSDT'; // Proxy for silver if needed

        const response = await axios.get(`${BINANCE_BASE}/api/v3/depth`, {
            params: { symbol: binanceSymbol, limit: limit || 20 }
        });
        res.json(response.data);
    } catch (error) {
        console.error(`[PROXY ERROR] Depth for ${req.query.symbol}: ${error.message}`);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        res.status(500).json({ error: 'Binance Depth Proxy Internal Error', message: error.message });
    }
});

// 1.2 Proxy for CoinGecko (Fixes CORS and centralizes access)
app.use('/api/coingecko', async (req, res) => {
    const path = req.path.replace(/^\//, '');
    const cacheKey = `cg_${path}_${JSON.stringify(req.query)}`;
    const cached = cache.coingecko.get(cacheKey);

    // Dynamic TTL based on content: snapshots live longer than live data
    const isStatic = path.includes('list') || path.includes('info');
    const dynamicTTL = isStatic ? 3600000 : 300000; // 1h for static, 5m for charts/live

    if (cached && (Date.now() - cached.timestamp < dynamicTTL)) {
        return res.json(cached.data);
    }

    try {
        const url = `https://api.coingecko.com/api/v3/${path}`;
        const cgKey = process.env.COINGECKO_API_KEY;

        const response = await axios.get(url, {
            params: req.query,
            headers: {
                'User-Agent': 'Institutional-Trading-Platform/1.0',
                'Accept': 'application/json',
                // Only send header if key exists and isn't a placeholder
                ...(cgKey && cgKey.trim() !== '' && cgKey !== 'YOUR_KEY' ? { 'x-cg-demo-api-key': cgKey.trim() } : {})
            },
            timeout: 8000
        });

        cache.coingecko.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        console.error(`[PROXY ERROR] CoinGecko (${req.path}): ${status} - ${error.message}`);

        // FALLBACK: If throttled but we HAVE cached data (even if stale), return it
        if ((status === 429 || status === 500) && cached) {
            console.warn(`[PROXY] Serving stale CoinGecko data for ${path} due to error ${status}`);
            return res.json(cached.data);
        }

        if (status === 401) {
            return res.status(401).json({ error: 'CoinGecko Unauthorized. Check COINGECKO_API_KEY in .env', isConfigError: true });
        }

        res.status(status).json(error.response?.data || { error: error.message });
    }
});


// 1.3 Proxy for NewsAPI
app.use('/api/news', async (req, res) => {
    const cacheKey = `news_${JSON.stringify(req.query)}`;
    const cached = cache.coingecko.get(cacheKey); // Reuse coingecko map for generic caching

    if (cached && (Date.now() - cached.timestamp < 900000)) { // 15m TTL for news
        return res.json(cached.data);
    }

    try {
        const path = req.path.replace(/^\//, '');
        const url = `https://newsapi.org/v2/${path}`;
        const apiKey = process.env.NEWS_API_KEY;

        const response = await axios.get(url, {
            params: { ...req.query, apiKey: apiKey || 'MISSING' },
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

        res.status(status).json(error.response?.data || { error: error.message });
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
        res.status(status).json(error.response?.data || { error: error.message });
    }
});

// 1.5 Proxy for Fear & Greed Index
app.get('/api/sentiment/fng', async (req, res) => {
    const cacheKey = 'fng';
    const cached = cache.coingecko.get(cacheKey); // Reuse coingecko cache map for simplicity or add fng

    if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1h TTL
        return res.json(cached.data);
    }

    try {
        const response = await axios.get('https://api.alternative.me/fng/?limit=1');
        cache.coingecko.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        console.error(`[PROXY ERROR] Fear & Greed: ${error.message}`);
        if (cached) return res.json(cached.data);
        res.status(500).json({ error: 'Failed to fetch Fear & Greed', message: error.message });
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
