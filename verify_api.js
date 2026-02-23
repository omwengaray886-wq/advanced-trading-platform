import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function testEndpoints() {
    console.log('--- Starting API Verification ---');

    const tests = [
        { name: 'Binance Klines', url: '/binance/klines?symbol=BTCUSDT&interval=1h&limit=5' },
        { name: 'Binance Depth', url: '/binance/depth?symbol=BTCUSDT&limit=5' },
        { name: 'Binance Ticker', url: '/binance/ticker/24hr?symbol=BTCUSDT' },
        { name: 'News API', url: '/news?q=crypto&pageSize=1' },
        { name: 'CryptoPanic', url: '/news/cryptopanic?currencies=BTC&kind=news' },
        { name: 'Economic Calendar', url: '/news/calendar?from=2026-02-23&to=2026-02-26' },
        { name: 'Health Check', url: '/health' }
    ];

    for (const test of tests) {
        try {
            console.log(`[TEST] Testing ${test.name}...`);
            const start = Date.now();
            const res = await axios.get(`${BASE_URL}${test.url}`, { timeout: 15000 });
            const duration = Date.now() - start;
            console.log(`[SUCCESS] ${test.name} - Status: ${res.status} (${duration}ms)`);
            if (test.name === 'Health Check') console.log('       ', JSON.stringify(res.data));
        } catch (err) {
            console.error(`[FAILED] ${test.name} - Status: ${err.response?.status || 'TIMEOUT/NETWORK'}`);
            console.error(`         Error: ${err.message}`);
            if (err.response?.data) console.error(`         Details:`, JSON.stringify(err.response.data));
        }
    }

    // Test AI Generation
    try {
        console.log('[TEST] Testing AI Generation...');
        const start = Date.now();
        const res = await axios.post(`${BASE_URL}/ai/generate`, {
            prompt: 'Test prompt for institutional analysis verification. Respond with "VERIFIED".',
            model: 'gemini-2.0-flash'
        }, { timeout: 30000 });
        const duration = Date.now() - start;
        console.log(`[SUCCESS] AI Generation - Status: ${res.status} (${duration}ms)`);
        console.log(`          Response: ${res.data.text.trim()}`);
    } catch (err) {
        console.error(`[FAILED] AI Generation - Status: ${err.response?.status || 'TIMEOUT/NETWORK'}`);
        console.error(`         Error: ${err.message}`);
        if (err.response?.data) console.error(`         Details:`, JSON.stringify(err.response.data));
    }

    console.log('--- API Verification Complete ---');
}

testEndpoints();
