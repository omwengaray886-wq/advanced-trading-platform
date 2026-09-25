const axios = require('axios');

async function verifyAI() {
    console.log('Testing AI Proxy robustness...');
    try {
        const res = await axios.post('http://localhost:3001/api/ai/generate', {
            prompt: 'Explain the current market state for BTCUSDT',
            model: 'gemini-2.0-flash'
        });
        console.log('AI Response:', res.data.status);
        console.log('Text length:', res.data.text?.length || 0);
    } catch (e) {
        console.error('AI Proxy Failed:', e.message);
    }
}

async function verifyBinance() {
    console.log('\nTesting Binance Proxy (Klines)...');
    try {
        const res = await axios.get('http://localhost:3001/api/binance/klines?symbol=BTCUSDT&interval=1h&limit=5');
        console.log('Klines count:', res.data.length);
    } catch (e) {
        console.error('Binance Klines Failed:', e.status);
    }
}

async function verifyCalendar() {
    console.log('\nTesting News Calendar Proxy...');
    try {
        const res = await axios.get('http://localhost:3001/api/news/calendar?from=2026-02-26&to=2026-03-01');
        console.log('Calendar Response Status:', res.status);
        console.log('Results count:', res.data.results?.length || 0);
        if (res.data.isRestricted) console.log('Note: Calendar access is restricted (Graceful Handshake)');
    } catch (e) {
        console.error('Calendar Proxy Failed:', e.status);
    }
}

async function run() {
    await verifyBinance();
    await verifyCalendar();
    await verifyAI();
}

run();
