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

const BINANCE_REST_BASE = isDev
    ? '/api/binance'
    : 'https://api.binance.com/api/v3';

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
        'NZDUSD': 'NZDUSDT',
        'NZDUSDT': 'NZDUSDT',
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
        // 'DXY': 'EURUSDT', // Removed: Inverse correlation is not real data
        // 'NAS100': 'BTCUSDT' // Removed: Correlation is not real data
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
            const res = await fetch(`${BINANCE_REST_BASE}/klines?symbol=${mappedSymbol}&interval=${binanceInterval}&limit=${limit}`);
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
            // Try to read response body if available (for 500 errors from proxy)
            if (error.response) {
                try {
                    const errBody = await error.response.json(); // if it was a fetch response object, but here we caught an Error. 
                    console.error('Error Body:', errBody);
                } catch (e) { }
            }
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
            const res = await fetch(`${BINANCE_REST_BASE}/depth?symbol=${mappedSymbol}&limit=${limit}`);
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
        // Prevent overlapping connections for the same stream
        const mappedSymbol = mapSymbol(symbol).toLowerCase();
        const mappedInterval = INTERVAL_MAP[interval] || '1h';

        if (this.ws && this.activeSymbol === mappedSymbol && this.activeInterval === mappedInterval && this.isConnected) {
            return;
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
                if (this.isClosing) return;
                console.log(`Connected to Binance stream: ${streamName}`);
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.stopPolling(); // Stop polling if WS connects
                this.notifyHealth();
            };

            this.ws.onmessage = (event) => {
                if (this.isClosing) return;
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
                if (this.isClosing) return;
                // console.error('WebSocket Error:', error); // Reduce spam
                this.isConnected = false;
                this.notifyHealth();
            };

            this.ws.onclose = () => {
                this.isConnected = false;
                this.notifyHealth();

                if (!this.isClosing) {
                    const delay = Math.min(this.maxReconnectDelay, this.minReconnectDelay * Math.pow(2, this.reconnectAttempts));

                    if (this.reconnectAttempts > 3) {
                        console.warn(`WebSocket unstable. Switching to POLLING mode for ${this.activeSymbol}`);
                        this.startPolling(); // Fallback to polling
                        return; // Stop WS retries
                    }

                    console.log(`Disconnected. Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts + 1})`);

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
        // In a real app we'd broadcast to multiple callbacks
        if (this.depthWS.has(mappedSymbol)) {
            console.log(`Using existing Depth stream for ${mappedSymbol}`);
            return () => { };
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

        // Also clear depth streams on global disconnect if needed
        this.depthWS.forEach((ws, symbol) => {
            ws.onclose = null;
            ws.close();
        });
        this.depthWS.clear();

        this.isConnected = false;
        this.notifyHealth();
    }
}

export const marketData = new MarketDataService();
