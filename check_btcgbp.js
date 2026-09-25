
import axios from 'axios';

async function checkBTCGBP() {
    try {
        console.log('Checking BTCGBP Activity...');
        const res = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol: 'BTCGBP', interval: '1h', limit: 1 }
        });

        const lastCandle = res.data[0];
        const time = new Date(lastCandle[0]).toISOString();
        const close = lastCandle[4];

        console.log(`Last BTCGBP Candle: ${time} Close=${close}`);

        // Check BTCJPY too
        const res2 = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol: 'BTCJPY', interval: '1h', limit: 1 }
        });
        const lastCandle2 = res2.data[0];
        const time2 = new Date(lastCandle2[0]).toISOString();
        const close2 = lastCandle2[4];

        console.log(`Last BTCJPY Candle: ${time2} Close=${close2}`);

        // implied
        const implied = parseFloat(close2) / parseFloat(close);
        console.log(`Implied GBPJPY: ${implied.toFixed(3)}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkBTCGBP();
