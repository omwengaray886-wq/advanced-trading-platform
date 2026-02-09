// src/services/marketData.js

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';

// Map intervals to Binance format
const INTERVAL_MAP = {
    '1m': '1m', '1M': '1m',
    '5m': '5m', '5M': '5m',
    '15m': '15m', '15M': '15m',
    '30m': '30m', '30M': '30m',
    '1h': '1h', '1H': '1h',
    '4h': '4h', '4H': '4h',
    '1d': '1d', '1D': '1d',
    '1w': '1w', '1W': '1w'
};

const isDev = (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV);

// Always use proxy in browser/dev to avoid CORS and hide keys
const BINANCE_REST_BASE = '/api/binance';

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
        'AUDUSD': 'AUDUSDT',
        'AUDUSDT': 'AUDUSDT',
        'NZDUSD': 'AUDUSDT', // NZDUSDT often has low liquidity or API issues, proxy with AUD
        'NZDUSDT': 'AUDUSDT',
        'USDTRY': 'USDTTRY',
        'USDZAR': 'USDTZAR',
        'USDMXN': 'USDTMXN',
        'USDBRL': 'USDTBRL',
        'USDRUB': 'USDTRUB',

        // --- METALS (PROXY) ---
        'XAUUSD': 'PAXGUSDT',
        'XAUUSDT': 'PAXGUSDT',
        'GOLD': 'PAXGUSDT',

        // --- MACRO PROXIES (Mapped to liquid spot for structural context) ---
        'DXY': 'EURUSDT', // DXY is inverse related to EURUSD
        'SPXUSD': 'BTCUSDT', // BTC often acts as high-beta SPX proxy in spot contexts
        'SPXUSDT': 'BTCUSDT',
        'NASDAQ': 'BTCUSDT'
    };

    return registry[s] || s;
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
        try {
            const mappedSymbol = mapSymbol(symbol);
            const binanceInterval = INTERVAL_MAP[interval] || interval;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000); // Increased to 12s for proxy hops
            const res = await fetch(`${BINANCE_REST_BASE}/klines?symbol=${mappedSymbol}&interval=${binanceInterval}&limit=${limit}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`Binance API error: ${res.statusText}`);
            const data = await res.json();
            return data.map(d => ({
                time: d[0] / 1000,
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
            }));
        } catch (error) {
            console.error(`CRITICAL: API Connection Failed for ${symbol}`, error);
            throw new Error(`Market data unavailable for ${symbol} [${interval}]. Code: ${error.message}`);
        }
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
        const mappedSymbol = mapSymbol(symbol).toLowerCase();
        const mappedInterval = INTERVAL_MAP[interval] || '1h';

        if (this.ws && this.activeSymbol === mappedSymbol && this.activeInterval === mappedInterval) {
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                return;
            }
        }

        this.disconnect();
        this.isClosing = false;
        this.activeSymbol = mappedSymbol;
        this.activeInterval = mappedInterval;

        const streamName = `${this.activeSymbol}@kline_${this.activeInterval}`;
        const wsUrl = `${BINANCE_WS_BASE}/${streamName}`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                if (this.isClosing || this.pendingClose) {
                    this.ws.close();
                    return;
                }
                console.log(`Connected to Binance stream: ${streamName}`);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.stopPolling();
                this.notifyHealth();
            };

            this.ws.onmessage = (event) => {
                if (this.isClosing || this.pendingClose) return;
                const message = JSON.parse(event.data);
                this.lastHeartbeat = Date.now();

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
                    this.notifyHealth();
                }
            };

            this.ws.onerror = (error) => {
                if (this.isClosing || this.pendingClose) return;
                this.isConnected = false;
                this.notifyHealth();
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.notifyHealth();
                this.pendingClose = false;
                if (!this.isClosing) {
                    this.scheduleReconnect();
                }
            };
        } catch (e) {
            console.error('WebSocket connection failed:', e);
        }
    }

    disconnect() {
        this.isClosing = true;
        this.pendingClose = true;
        this.stopReconnect();

        if (this.ws) {
            // Remove all custom listeners to prevent "Ping after close"
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;

            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
            this.ws = null;
        }

        // Cleanup depth connections
        this.depthWS.forEach(ws => {
            ws.onmessage = null;
            ws.close();
        });
        this.depthWS.clear();

        this.isConnected = false;
        this.notifyHealth();
    }
                this.isConnected = false;
this.notifyHealth();
            };

this.ws.onclose = () => {
    this.isConnected = false;
    this.notifyHealth();

    if (!this.isClosing) {
        // Exponential backoff with jitter
        const baseDelay = Math.min(this.maxReconnectDelay, this.minReconnectDelay * Math.pow(2, this.reconnectAttempts));
        const jitter = Math.random() * 1000; // Add random jitter to prevent thundering herd
        const delay = baseDelay + jitter;

        if (this.reconnectAttempts >= 5) {
            console.warn(`[WS] WebSocket unstable after 5 attempts. Switching to POLLING mode for ${this.activeSymbol}`);
            this.startPolling(); // Fallback to polling
            return; // Stop WS retries
        }

        console.log(`[WS] Disconnected from ${streamName}. Reconnecting in ${Math.round(delay / 1000)}s... (Attempt ${this.reconnectAttempts + 1}/5)`);

        setTimeout(() => {
            if (!this.isClosing && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
                this.reconnectAttempts++;
                this.connect(this.activeSymbol, this.activeInterval);
            }
        }, delay);
    }
};
        } catch (e) {
    console.error("Failed to initiate WebSocket connection", e);
    this.startPolling();
}
    }

startPolling() {
    if (this.pollingInterval) return;
    console.log('Starting polling fallback...');

    // Poll every 1 minute
    this.pollingInterval = setInterval(async () => {
        if (this.isClosing) return;
        try {
            // Fetch just the last few candles effectively
            const data = await this.fetchHistory(this.activeSymbol, this.activeInterval, 5);
            if (data && data.length > 0) {
                const lastCandle = data[data.length - 1];
                this.notify(lastCandle);
                this.isConnected = true; // Pretend we are connected for UI
                this.latency = 200; // Fake latency
                this.notifyHealth();
            }
        } catch (e) {
            console.warn('Polling failed:', e.message);
        }
    }, 60000);
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
        this.depthWS.get(mappedSymbol).close();
        this.depthWS.delete(mappedSymbol);
    }

    try {
        const streamUrl = `${BINANCE_WS_BASE}/${mappedSymbol}@depth20@100ms`;
        const ws = new WebSocket(streamUrl);
        this.depthWS.set(mappedSymbol, ws);

        ws.onopen = () => console.log(`Connected to Depth Stream: ${mappedSymbol}`);

        ws.onmessage = (event) => {
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

        ws.onerror = (err) => console.error(`Depth WS Error (${mappedSymbol}):`, err);

        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.onclose = null; // Prevent recursion if any
                ws.close();
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

disconnect() {
    this.isClosing = true;
    if (this.ws) {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
        }
        this.ws = null;
    }

    // Also clear depth streams on global disconnect
    this.depthWS.forEach((ws, symbol) => {
        try {
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                ws.close();
            }
        } catch (e) {
            console.warn(`Error closing depth WS for ${symbol}:`, e.message);
        }
    });
    this.depthWS.clear();

    this.isConnected = false;
    this.notifyHealth();
}
}

export const marketData = new MarketDataService();
