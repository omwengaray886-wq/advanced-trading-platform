
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testProxy(symbol) {
    const url = `http://localhost:3001/api/binance/klines?symbol=${symbol}&interval=1h&limit=5`;
    console.log(`Testing Proxy URL: ${url}`);
    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (res.ok) {
            console.log(`Successfully fetched ${data.length} candles via proxy for ${symbol}`);
        } else {
            console.log(`Proxy Error:`, data);
        }
    } catch (e) {
        console.error(`Fetch error: ${e.message}`);
    }
}

async function run() {
    await testProxy('BTCUSDT');
    await testProxy('PAXGUSDT');
    await testProxy('XAUUSD');
    await testProxy('XAU/USD');
}

run();
