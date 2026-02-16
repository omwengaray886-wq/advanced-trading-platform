
import axios from 'axios';
import { AnalysisOrchestrator } from './src/services/analysisOrchestrator.js';
import { setInternalDb } from './src/services/db.js';

// --- MOCK DB ---
const mockCollection = {
    doc: () => mockDoc,
    add: () => Promise.resolve({ id: 'mock-id' }),
    where: () => mockCollection,
    orderBy: () => mockCollection,
    limit: () => mockCollection,
    get: () => Promise.resolve({ forEach: () => { }, empty: true, docs: [] }),
    onSnapshot: () => () => { }
};

const mockDoc = {
    set: () => Promise.resolve(true),
    get: () => Promise.resolve({ exists: false, data: () => null }),
    update: () => Promise.resolve(true),
    collection: () => mockCollection
};

const mockDb = {
    collection: () => mockCollection,
    doc: () => mockDoc
};

// Inject mock db for AnalysisOrchestrator dependencies
try {
    setInternalDb(mockDb);
    console.log('[Setup] Mock DB injected (silencing Firebase errors).');
} catch (e) {
    console.warn('[Setup] Failed to inject mock DB:', e);
}

// --- MOCK FETCH (for SentimentService relative URLs) ---
global.fetch = async (url) => {
    // console.log(`[MockFetch] ${url}`);
    if (url.toString().startsWith('/api')) {
        // Return empty/neutral data for internal APIs
        return {
            ok: true,
            json: async () => ({})
        };
    }
    return {
        ok: false,
        status: 404,
        json: async () => ({})
    };
};


const PAIRS = [
    'BTC/USDT',
    'ETH/USDT',
    'SOL/USDT',
    'GBP/JPY',
    'EUR/USD',
    'USD/JPY',
    'XRP/USDT',
    'BNB/USDT',
    'ADA/USDT',
    'DOGE/USDT'
];

async function fetchCandles(symbol) {
    try {
        const apiSymbol = symbol.replace('/', '');
        const url = `http://localhost:3001/api/binance/klines?symbol=${apiSymbol}&interval=1h&limit=100`;

        const res = await axios.get(url);
        if (!Array.isArray(res.data) || res.data.length < 50) {
            return null;
        }

        return res.data.map(c => ({
            time: c[0],
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5])
        }));
    } catch (e) {
        return null; // Silent fail for fetch
    }
}

async function verifyAll() {
    console.log('--- GLOBAL ANALYSIS VERIFICATION ---');
    console.log('Checking logic integrity for all major pairs...\n');

    const orchestrator = new AnalysisOrchestrator();

    for (const symbol of PAIRS) {
        process.stdout.write(`Testing ${symbol.padEnd(10)} ... `);

        const candles = await fetchCandles(symbol);
        if (!candles) {
            console.log('FAIL (Data Unavailable)');
            continue;
        }

        try {
            // isLight=true skips some heavy stuff but mostly preserves logic
            const result = await orchestrator.analyze(candles, symbol, '1h', null, null, true);

            if (result && result.marketState) {
                const trend = result.marketState.currentTrend ? result.marketState.currentTrend.direction : 'N/A';
                const setupCount = result.setups ? result.setups.length : 0;
                const bias = result.prediction ? result.prediction.bias : 'NEUTRAL';

                // Formatting
                const trendStr = trend === 'BULLISH' ? 'BULLISH ' : trend === 'BEARISH' ? 'BEARISH ' : trend;

                console.log(`PASS | Trend: ${trendStr.padEnd(8)} | Bias: ${bias.padEnd(8)} | Setups: ${setupCount}`);
            } else {
                console.log('FAIL (No Result)');
            }
        } catch (err) {
            console.log(`ERROR: ${err.message}`);
        }
    }
    console.log('\n--- Verification Complete ---');
    process.exit(0);
}

verifyAll();
