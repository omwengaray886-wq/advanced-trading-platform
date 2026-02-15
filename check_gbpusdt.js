
import axios from 'axios';

async function checkGBPUSDT() {
    try {
        console.log('Checking GBPUSDT Freshness...');
        const res = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol: 'GBPUSDT', interval: '1h', limit: 1 }
        });

        if (res.data.length > 0) {
            const candle = res.data[0];
            const time = new Date(candle[0]).toISOString();
            const close = candle[4];
            console.log(`Last GBPUSDT Candle: ${time} Close=${close}`);
        } else {
            console.log('GBPUSDT: No data');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkGBPUSDT();
