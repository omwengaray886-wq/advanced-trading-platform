
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function testSymbol(symbol) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=5`;
    console.log(`Testing URL: ${url}`);
    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status} ${res.statusText}`);
        if (res.ok) {
            const data = await res.json();
            console.log(`Successfully fetched ${data.length} candles for ${symbol}`);
        } else {
            const text = await res.text();
            console.log(`Error body: ${text}`);
        }
    } catch (e) {
        console.error(`Fetch error: ${e.message}`);
    }
}

async function run() {
    await testSymbol('BTCUSDT');
    await testSymbol('PAXGUSDT');
}

run();
