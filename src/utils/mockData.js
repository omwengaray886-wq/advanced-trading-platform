// Mock Data for Trading Analysis Platform

export const MARKET_STATUS = {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED',
    PRE_MARKET: 'PRE_MARKET'
};

export const SESSIONS = {
    ASIA: 'Asia',
    LONDON: 'London',
    NY: 'New York'
};

export const pairs = [
    { id: 'EURUSD', symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'Forex' },
    { id: 'GBPUSD', symbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'Forex' },
    { id: 'BTCUSD', symbol: 'BTC/USD', name: 'Bitcoin', type: 'Crypto' },
    { id: 'ETHUSD', symbol: 'ETH/USD', name: 'Ethereum', type: 'Crypto' },
    { id: 'XAUUSD', symbol: 'XAU/USD', name: 'Gold', type: 'Commodities' },
    { id: 'SPX500', symbol: 'SPX500', name: 'S&P 500', type: 'Indices' },
];

export const tradeSetups = [
    {
        id: 'setup-1',
        symbol: 'EUR/USD',
        direction: 'LONG',
        bias: 'Bullish',
        entryZone: [1.0840, 1.0855],
        stopLoss: 1.0820,
        targets: [1.0890, 1.0950],
        rrRatio: 2.5,
        confidence: 85,
        status: 'ACTIVE', // ACTIVE, PENDING, INVALIDATED, HIT_TP, HIT_SL
        timestamp: Date.now() - 3600000,
        thesis: 'Price swept liquidity at Asian Lows and broke structure to the upside on the 15m. Retesting the demand zone created by the impulse leg.',
        imageUrl: '/mock-chart-eurusd.png'
    },
    {
        id: 'setup-2',
        symbol: 'BTC/USD',
        direction: 'LONG',
        bias: 'Bullish',
        entryZone: [83500, 84200],
        stopLoss: 82100,
        targets: [86500, 88000],
        rrRatio: 3.1,
        confidence: 72,
        status: 'PENDING',
        timestamp: Date.now() - 7200000,
        thesis: 'Bullish divergence on 4H. Price approaching weekly demand zone with increasing volume. Expecting bounce.',
        imageUrl: '/mock-chart-btcusd.png'
    }
];

export const marketSentiment = {
    overall: 'Mixed',
    forex: 'Bullish USD',
    crypto: 'Bearish',
    indices: 'Consolidating'
};

export const generateCandleData = (initialPrice = 100, count = 200) => {
    let data = [];
    let time = new Date().getTime() - (count * 60 * 60 * 1000); // 1h candles
    let price = initialPrice;

    // Pattern variables
    let patternPhase = 0;
    let resistanceLevel = initialPrice * 1.02;
    let supportLevel = initialPrice * 0.98;

    for (let i = 0; i < count; i++) {
        let change = (Math.random() - 0.5) * (initialPrice * 0.005);
        let open = price;
        let close = open + change;

        let high = Math.max(open, close) + Math.random() * (initialPrice * 0.002);
        let low = Math.min(open, close) - Math.random() * (initialPrice * 0.002);

        // Inject Equal Highs Pattern (Resistance) every ~50 candles
        if (i % 50 === 10) resistanceLevel = high; // Set new resistance
        if (i % 50 === 30) {
            // Touch resistance again (Double Top)
            high = resistanceLevel;
            if (open < high) close = high - (initialPrice * 0.001); // Reject
        }

        // Inject Equal Lows Pattern (Support) every ~60 candles
        if (i % 60 === 10) supportLevel = low;
        if (i % 60 === 40) {
            // Touch support again (Double Bottom)
            low = supportLevel;
            if (open > low) close = low + (initialPrice * 0.001); // Bounce
        }

        // Ensure reasonable wicks
        if (high < Math.max(open, close)) high = Math.max(open, close) + 0.1;
        if (low > Math.min(open, close)) low = Math.min(open, close) - 0.1;

        data.push({
            time: time / 1000,
            open,
            high,
            low,
            close
        });

        price = close;
        time += (60 * 60 * 1000);
    }
    return data;
};
