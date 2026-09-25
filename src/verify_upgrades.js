import axios from 'axios';

const BASE_URL = 'http://localhost:3002/api/binance';

async function verifyUpgrades() {
    console.log('--- STARTING UPGRADES VERIFICATION ---');

    // 1. Test Indices Fallback (Klines)
    try {
        console.log('Testing Index Fallback [SPX]...');
        const res = await axios.get(`${BASE_URL}/klines?symbol=SPX&interval=1d&limit=5`);
        if (res.data && res.data.length > 0) {
            console.log(`✅ [SPX] Success: Received ${res.data.length} candles from CoinGecko.`);
            console.log(`Typical candle: ${JSON.stringify(res.data[0].slice(0, 5))}`);
        }
    } catch (e) {
        console.error(`❌ [SPX] Failed: ${e.message}`);
    }

    // 2. Test Indices Ticker Fallback
    try {
        console.log('Testing Index Ticker [DXY]...');
        const res = await axios.get(`${BASE_URL}/ticker/24hr?symbol=DXY`);
        if (res.data && res.data.isReference) {
            console.log(`✅ [DXY] Success: Price=${res.data.lastPrice}, Change=${res.data.priceChangePercent}% (Reference Source)`);
        }
    } catch (e) {
        console.error(`❌ [DXY] Failed: ${e.message}`);
        if (e.response?.data) console.error('Error Details:', JSON.stringify(e.response.data, null, 2));
    }

    // 3. Test Full Ticker List for Search UI
    try {
        console.log('Testing Global Ticker List...');
        const res = await axios.get(`${BASE_URL}/ticker/24hr`);
        if (Array.isArray(res.data) && res.data.length > 1000) {
            console.log(`✅ [TICKERS] Success: Found ${res.data.length} tickers for live search.`);
            const sol = res.data.find(t => t.symbol === 'SOLUSDT');
            if (sol) {
                console.log(`Example: SOL/USDT Price=${sol.lastPrice} (${sol.priceChangePercent}%)`);
            }
        }
    } catch (e) {
        console.error(`❌ [TICKERS] Failed: ${e.message}`);
    }

    console.log('--- VERIFICATION COMPLETE ---');
}

verifyUpgrades();
