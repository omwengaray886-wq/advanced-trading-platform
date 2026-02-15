
import axios from 'axios';

async function verifyGBPJPY() {
    try {
        console.log('--- Verifying GBPJPY Data Fix ---');

        // Wait for server to be ready
        await new Promise(r => setTimeout(r, 2000));

        const url = 'http://localhost:3001/api/binance/klines?symbol=GBPJPY&interval=1h&limit=5';
        console.log(`GET ${url}`);

        const res = await axios.get(url);
        const data = res.data;

        if (!Array.isArray(data) || data.length === 0) {
            console.error('FAIL: No data returned');
            return;
        }

        console.log(`Received ${data.length} candles.`);

        // Analyze first candle
        const first = data[0];
        const open = parseFloat(first[1]);
        const close = parseFloat(first[4]);

        console.log(`Sample Candle: O=${open} H=${first[2]} L=${first[3]} C=${close}`);

        if (open === 190.5 && close === 190.5) {
            console.error('FAIL: Still receiving Ghost Candles (190.5 flat)');
        } else {
            console.log('PASS: Data appears dynamic and synthetic.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

verifyGBPJPY();
