// src/services/marketData.js

const BINANCE_WS_BASE = 'wss://stream.binance.com/ws';

// Map intervals to Binance format
const INTERVAL_MAP = {
    '1m': '1m', '1M': '1m',
    '5m': '5m', '5M': '5m',
    '15m': '15m', '15M': '15m',
    '30m': '30m', '30M': '30m',

    '1h': '1h', '1H': '1h',
    '2h': '2h', '2H': '2h',
    '4h': '4h', '4H': '4h',
    '1d': '1d', '1D': '1d',
    '1w': '1w', '1W': '1w'
};

const isDev = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);

// Always use proxy in browser/dev to avoid CORS and hide keys, but use absolute URL in Node.js
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const BINANCE_REST_BASE = isNode ? 'https://api.binance.com/api/v3' : '/api/binance';

/**
 * Map institutional symbols to exchange-specific symbols (Binance Spot)
 */
export const mapSymbol = (symbol) => {
    if (!symbol) return 'BTCUSDT';

    // Normalize: remove slash and uppercase
    const s = symbol.replace('/', '').toUpperCase();

    // Registry of supported mappings
    const registry = {
        // --- CRYPTO (BINANCE SPOT) ---
        'BTCUSDT': 'BTCUSDT',
        'ETHUSDT': 'ETHUSDT',
        'SOLUSDT': 'SOLUSDT',
        'BNBUSDT': 'BNBUSDT',
        'XRPUSDT': 'XRPUSDT',
        'ADAUSDT': 'ADAUSDT',
        'DOTUSDT': 'DOTUSDT',
        'MATICUSDT': 'MATICUSDT',
        'AVAXUSDT': 'AVAXUSDT',
        'LINKUSDT': 'LINKUSDT',
        'DOGEUSDT': 'DOGEUSDT',
        'SHIBUSDT': 'SHIBUSDT',
        'LTCUSDT': 'LTCUSDT',
        'UNIUSDT': 'UNIUSDT',
        'ATOMUSDT': 'ATOMUSDT',
        'NEARUSDT': 'NEARUSDT',
        'OPUSDT': 'OPUSDT',
        'ARBUSDT': 'ARBUSDT',

        // --- FOREX (VIA BINANCE STABLECOIN/FIAT PAIRS) ---
        'EURUSD': 'EURUSDT',
        'EURUSDT': 'EURUSDT',
        'GBPUSD': 'GBPUSDT',
        'GBPUSDT': 'GBPUSDT',
        // GBPJPY is synthetic - handled by server proxy
        'USDTRY': 'USDTTRY',
        'USDZAR': 'USDTZAR',
        'USDMXN': 'USDTMXN',
        'USDBRL': 'USDTBRL',
        'USDRUB': 'USDTRUB',

        // --- METALS (PROXY) ---
        'XAUUSD': 'PAXGUSDT',
        'XAUUSDT': 'PAXGUSDT',
        'GOLD': 'PAXGUSDT',

        // --- MACRO PROXIES ---
        'DXY': 'EURUSDT', // DXY is inverse related to EURUSD
    };

    // Generic Case: If it looks like XXXUSDT or XXX/USDT, normalize it
    if (!registry[s]) {
        if (s.includes('USDT')) return s;
        // If it's a 6-char forex looking pair but not mapped (e.g. BTCETH), let it pass as-is
        return s;
    }

    return registry[s];
};

/**
 * Get metadata for symbols (Proxy status, source, etc.)
 */
export const getSymbolMetadata = (symbol) => {
    if (!symbol) return { isProxy: false };
    const s = symbol.replace('/', '').toUpperCase();

    const proxies = {
        'XAUUSD': { isProxy: true, source: 'Binance Spot (PAXG Proxy)', note: 'Price may vary from spot gold' },
        'XAUUSDT': { isProxy: true, source: 'Binance Spot (PAXG Proxy)', note: 'Price may vary from spot gold' },
        'GOLD': { isProxy: true, source: 'Binance Spot (PAXG Proxy)', note: 'Price may vary from spot gold' },
        'XAGUSD': { isProxy: true, source: 'Unsupported', note: 'Silver spot not available on Binance' },
        'XAGUSDT': { isProxy: true, source: 'Unsupported', note: 'Silver spot not available on Binance' },
        'SILVER': { isProxy: true, source: 'Unsupported', note: 'Silver spot not available on Binance' },
        'DXY': { isProxy: true, source: 'CoinGecko Reference Index', note: 'US Dollar Index' },
        'SPX': { isProxy: true, source: 'CoinGecko Reference Index', note: 'S&P 500 Index Proxy' },
        'SPXUSD': { isProxy: true, source: 'CoinGecko Reference Index', note: 'S&P 500 Index Proxy' },
        'NDX': { isProxy: true, source: 'CoinGecko Reference Index', note: 'NASDAQ 100 Index Proxy' },
        'NASDAQ': { isProxy: true, source: 'CoinGecko Reference Index', note: 'NASDAQ 100 Index Proxy' },
        'NAS100': { isProxy: true, source: 'CoinGecko Reference Index', note: 'NASDAQ 100 Index Proxy' },
        'US30': { isProxy: true, source: 'CoinGecko Reference Index', note: 'Dow Jones Index Proxy' },
        'GBPJPY': { isProxy: true, source: 'Institutional Synthetic Bridge', note: 'GBP/JPY Currency Cross' },
        'JBPJPY': { isProxy: true, source: 'Institutional Synthetic Bridge', note: 'GBP/JPY Currency Cross' }
    };

    if (proxies[s]) return proxies[s];

    // Default for any other symbol: Assume it's a native Binance pair
    // (The server will 404 if it's actually invalid)
    return { isProxy: false, source: 'Binance Spot (Native)' };
};

export class MarketDataService {
    constructor() {
        this.subscribers = new Set();
        this.healthSubscribers = new Set();
        this.ws = null;
        this.depthWS = new Map(); // Track depth connections per symbol
        this.activeSymbol = 'btcusdt';
        this.activeInterval = '1h';
        this.isConnected = false;
        this.latency = 0;
        this.lastHeartbeat = Date.now();
        this.reconnectAttempts = 0;
        this.minReconnectDelay = 1000;
        this.maxReconnectDelay = 30000;
        this.isClosing = false;
        this.pendingClose = false;
        this.requestCache = new Map(); // Phase 42: Request deduplication
    }

    /**
     * Map institutional symbols to exchange-specific symbols (Binance Spot)
     */
    mapSymbol(symbol) {
        return mapSymbol(symbol);
    }

    /**
     * Fetch historical kline data
     */
    async fetchHistory(symbol, interval = '1h', limit = 200) {
        const mappedSymbol = mapSymbol(symbol);
        const binanceInterval = INTERVAL_MAP[interval] || interval;
        const cacheKey = `${mappedSymbol}_${binanceInterval}_${limit}`;

        // Phase 42: Deduplicate inflight requests to prevent AbortError storm
        if (this.requestCache.has(cacheKey)) {
            return this.requestCache.get(cacheKey);
        }

        const requestPromise = (async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    controller.abort('Analysis request timed out after 20s');
                }, 20000); // Increased from 12s for institutional robustness

                const res = await fetch(`${BINANCE_REST_BASE}/klines?symbol=${mappedSymbol}&interval=${binanceInterval}&limit=${limit}`, {
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Binance API error: ${res.status} ${res.statusText} - ${errorText.substring(0, 100)}`);
                }
                const data = await res.json();
                return data.map(d => ({
                    time: d[0] / 1000,
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));
            } finally {
                // Always clear cache entry after completion (win or lose)
                // so subsequent calls get fresh data if needed, but parallel calls are deduped
                setTimeout(() => this.requestCache.delete(cacheKey), 1000);
            }
        })();

        this.requestCache.set(cacheKey, requestPromise);
        return requestPromise;
    }

    /**
     * Fetch multiple timeframes concurrently for trend consensus
     * @param {string} symbol - Trading symbol
     * @param {Array} timeframes - Intervals to fetch
     * @param {number} limit - Limit per timeframe
     * @returns {Promise<Object>} - Map of results
     */
    async fetchMultiTimeframe(symbol, timeframes = ['15m', '1h', '4h', '1d'], limit = 100) {
        try {
            const results = await Promise.all(
                timeframes.map(tf => this.fetchHistory(symbol, tf, limit).catch(e => {
                    console.warn(`Parallel fetch failed for ${symbol} @ ${tf}:`, e.message);
                    return null;
                }))
            );

            return timeframes.reduce((acc, tf, i) => {
                acc[tf] = results[i];
                return acc;
            }, {});
        } catch (error) {
            console.error(`Multi-TF fetch failed for ${symbol}`, error);
            return {};
        }
    }

    /**
     * Fetch Order Book Snapshot (REST)
     */
    async fetchOrderBook(symbol, limit = 20) {
        try {
            const mappedSymbol = mapSymbol(symbol);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(`${BINANCE_REST_BASE}/depth?symbol=${mappedSymbol}&limit=${limit}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`Binance Depth API error: ${res.statusText}`);
            const data = await res.json();
            return {
                bids: data.bids.map(b => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
                asks: data.asks.map(a => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
                lastUpdateId: data.lastUpdateId
            };
        } catch (error) {
            console.error('Failed to fetch Order Book:', error);
            return null;
        }
    }

    connect(symbol = 'btcusdt', interval = '1h') {
        if (this.pendingClose) return;

        // Prevent overlapping connections for the same stream
        const mappedSymbol = mapSymbol(symbol);

        // Check if this is a synthetic/proxy symbol that doesn't have Binance WS
        const metadata = getSymbolMetadata(symbol);
        const isSynthetic = metadata.isProxy ||
            !mappedSymbol ||
            ['GBPJPY', 'JBPJPY', 'DXY', 'SPX', 'SPXUSD', 'NDX', 'NAS100', 'US30'].includes(symbol.replace('/', '').toUpperCase());

        if (isSynthetic) {
            console.log(`[MarketData] ${symbol} is synthetic/proxy. Using polling mode only.`);

            // Disconnect any existing connections first (before setting new state)
            this.disconnect();

            // Now set up for polling mode
            this.isClosing = false;
            this.activeSymbol = (mappedSymbol || symbol).toLowerCase();
            this.activeInterval = INTERVAL_MAP[interval] || '1h';

            // Start polling (which will set isConnected=true and notify health)
            this.startPolling();
            return;
        }

        const lowerSymbol = mappedSymbol.toLowerCase();
        const mappedInterval = INTERVAL_MAP[interval] || '1h';

        if (this.ws && this.activeSymbol === lowerSymbol && this.activeInterval === mappedInterval) {
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                return;
            }
        }

        this.disconnect();
        this.isClosing = false;
        this.activeSymbol = lowerSymbol;
        this.activeInterval = mappedInterval;

        const streamName = `${this.activeSymbol}@kline_${this.activeInterval}`;
        const wsUrl = `${BINANCE_WS_BASE}/${streamName}`;

        // Set up fallback polling if WebSocket doesn't connect within 5 seconds
        this.fallbackTimeout = setTimeout(() => {
            if (!this.isConnected && !this.pollingInterval) {
                console.warn('[MarketData] WebSocket connection timeout. Falling back to polling mode.');
                this.startPolling();
            }
            this.fallbackTimeout = null;
        }, 5000);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                if (this.isClosing || this.pendingClose) {
                    this.ws.close();
                    return;
                }
                console.log(`Connected to Binance stream: ${streamName}`);
                if (this.fallbackTimeout) {
                    clearTimeout(this.fallbackTimeout);
                    this.fallbackTimeout = null;
                }
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.stopPolling(); // Stop polling if it was running
                this.notifyHealth();
            };

            this.ws.onmessage = (event) => {
                if (this.isClosing || this.pendingClose) return;
                const message = JSON.parse(event.data);
                this.lastHeartbeat = Date.now();
                this.isConnected = true; // Ensure status is 'LIVE' if we are getting messages
                this.notifyHealth(); // Ensure health status is updated

                if (message.E) {
                    this.latency = Math.max(0, Date.now() - message.E);
                }

                if (message.e === 'kline') {
                    const kline = message.k;
                    const candle = {
                        time: kline.t / 1000,
                        open: parseFloat(kline.o),
                        high: parseFloat(kline.h),
                        low: parseFloat(kline.l),
                        close: parseFloat(kline.c),
                    };
                    this.notify(candle);
                    // notifyHealth is redundant here as it's called in onmessage start or by subscribers
                }
            };

            this.ws.onerror = (error) => {
                if (this.isClosing || this.pendingClose) return;
                console.warn('[MarketData] WebSocket error, will use polling fallback');
                this.isConnected = false;
                this.notifyHealth();
            };

            this.ws.onclose = () => {
                if (this.fallbackTimeout) {
                    clearTimeout(this.fallbackTimeout);
                    this.fallbackTimeout = null;
                }
                this.isConnected = false;
                this.notifyHealth();
                this.pendingClose = false;
                if (!this.isClosing) {
                    // Start polling immediately on close, then schedule reconnect
                    if (!this.pollingInterval) {
                        console.log('[MarketData] WebSocket closed, starting polling fallback');
                        this.startPolling();
                    }
                    this.scheduleReconnect();
                }
            };
        } catch (e) {
            console.error('WebSocket connection failed:', e);
            clearTimeout(fallbackTimeout);
            // Immediately start polling if WS creation failed
            this.startPolling();
        }
    }

    disconnect() {
        this.isClosing = true;
        this.pendingClose = true;
        if (this.fallbackTimeout) {
            clearTimeout(this.fallbackTimeout);
            this.fallbackTimeout = null;
        }
        this.stopReconnect();

        if (this.ws) {
            // Remove ALL listeners immediately to prevent "Ping after close" or unexpected messages
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null; // Important: Clear onclose as well since we are manually handling it

            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                try {
                    this.ws.close();
                } catch (e) {
                    console.warn('Error closing primary WS:', e.message);
                }
            }
            this.ws = null;
        }

        // Cleanup depth connections with same aggressive listener clearing
        this.depthWS.forEach((ws, symbol) => {
            // Remove listeners BEFORE closing to prevent "Ping after close" or "State error"
            ws.onopen = null;
            ws.onmessage = null;
            ws.onerror = null;
            ws.onclose = null;
            try {
                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    ws.close();
                }
            } catch (e) {
                console.warn(`Error closing depth WS for ${symbol}:`, e.message);
            }
        });
        this.depthWS.clear();

        this.isConnected = false;
        this.pendingClose = false; // Reset to allow immediate reconnection
        this.notifyHealth();
    }


    startPolling() {
        if (this.pollingInterval) return;
        console.log('[MarketData] Starting REST API polling mode (15s intervals)...');

        // Immediately mark as connected for polling mode (especially for synthetic symbols like GBPJPY)
        // The actual validation happens in pollOnce(), but we want to show "connecting" immediately
        this.isConnected = true;
        this.latency = 150;
        this.notifyHealth(); // Notify immediately so UI doesn't show OFFLINE

        // Initial fetch to show online immediately
        this.pollOnce();

        // Poll every 15 seconds for responsive updates
        this.pollingInterval = setInterval(() => {
            this.pollOnce();
        }, 15000);
    }

    async pollOnce() {
        if (this.isClosing) return;
        try {
            const data = await this.fetchHistory(this.activeSymbol, this.activeInterval, 5);
            if (data && data.length > 0) {
                const lastCandle = data[data.length - 1];
                this.notify(lastCandle);
                this.isConnected = true; // Show as connected when polling works
                this.latency = 150; // Simulated latency for polling
                this.notifyHealth();
            }
        } catch (e) {
            console.warn('[MarketData] Polling failed:', e.message);
            this.isConnected = false;
            this.notifyHealth();
        }
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Subscribe to Live Depth Stream with pooled connections
     */
    subscribeToDepth(symbol, callback) {
        const mappedSymbol = mapSymbol(symbol).toLowerCase();

        // If already connected to this symbol, just return a fake "unsubscribe"
        if (this.depthWS.has(mappedSymbol)) {
            const existing = this.depthWS.get(mappedSymbol);
            if (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING) {
                console.log(`Using existing Depth stream for ${mappedSymbol}`);
                return () => { };
            }
        }

        // Clean up any failed or closed connection for this symbol
        if (this.depthWS.has(mappedSymbol)) {
            const oldWs = this.depthWS.get(mappedSymbol);
            oldWs.onopen = null;
            oldWs.onmessage = null;
            oldWs.onerror = null;
            oldWs.onclose = null;
            try { oldWs.close(); } catch (e) { }
            this.depthWS.delete(mappedSymbol);
        }

        try {
            const streamUrl = `${BINANCE_WS_BASE}/${mappedSymbol}@depth20@100ms`;
            const ws = new WebSocket(streamUrl);
            this.depthWS.set(mappedSymbol, ws);

            ws.onopen = () => console.log(`Connected to Depth Stream: ${mappedSymbol}`);

            ws.onmessage = (event) => {
                if (this.isClosing || this.pendingClose) return;
                const data = JSON.parse(event.data);
                if (data.bids && data.asks) {
                    const formatted = {
                        bids: data.bids.map(b => ({ price: parseFloat(b[0]), quantity: parseFloat(b[1]) })),
                        asks: data.asks.map(a => ({ price: parseFloat(a[0]), quantity: parseFloat(a[1]) })),
                        lastUpdateId: data.lastUpdateId
                    };
                    callback(formatted);
                }
            };

            ws.onerror = (err) => {
                if (this.isClosing || this.pendingClose) return;
                console.error(`Depth WS Error (${mappedSymbol}):`, err);
            };

            return () => {
                // Remove listeners immediately to prevent any further processing
                ws.onopen = null;
                ws.onmessage = null;
                ws.onerror = null;
                ws.onclose = null;

                if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                    try {
                        ws.close();
                    } catch (e) {
                        console.warn(`Error closing depth WS for ${mappedSymbol}:`, e.message);
                    }
                }
                this.depthWS.delete(mappedSymbol);
            };
        } catch (e) {
            console.error("Depth WS failed", e);
            return () => { };
        }
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    subscribeHealth(callback) {
        this.healthSubscribers.add(callback);
        callback({ isConnected: this.isConnected, latency: this.latency });
        return () => this.healthSubscribers.delete(callback);
    }

    notify(data) {
        this.subscribers.forEach(callback => callback(data));
    }

    notifyHealth() {
        const stats = { isConnected: this.isConnected, latency: this.latency };
        this.healthSubscribers.forEach(callback => callback(stats));
    }

    stopReconnect() {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    scheduleReconnect() {
        if (this.isClosing || this.reconnectTimeout) return;

        this.reconnectAttempts++;
        // Exponential backoff: 1s, 2s, 4s, 8s... capped at 30s
        const delay = Math.min(this.minReconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

        console.log(`[MarketData] Connection lost. Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts})...`);

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            if (!this.isClosing) {
                console.log('[MarketData] Reconnecting now...');
                // We need to re-call connect with the current state
                // mapSymbol handles case-insensitivity, so activeSymbol (lowercase) is fine to pass back or we can uppercase it
                // Logic: connect() expects 'BTCUSDT' (display) or mapped. 
                // activeSymbol is 'btcusdt'. mapSymbol('btcusdt') -> 'BTCUSDT'. Perfect.
                this.connect(this.activeSymbol.toUpperCase(), this.activeInterval);
            }
        }, delay);
    }
}

export const marketData = new MarketDataService();
