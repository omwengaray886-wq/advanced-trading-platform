
import axios from 'axios';

async function checkEURGBP() {
    try {
        console.log('Checking EURGBP Activity...');
        const res = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol: 'EURGBP', interval: '1h', limit: 1 }
        });

        const lastCandle = res.data[0];
        const time = new Date(lastCandle[0]).toISOString();
        const close = lastCandle[4];

        console.log(`Last EURGBP Candle: ${time} Close=${close}`);

        // Also check EURUSDT
        const res2 = await axios.get('https://api.binance.com/api/v3/klines', {
            params: { symbol: 'EURUSDT', interval: '1h', limit: 1 }
        });
        console.log(`Last EURUSDT Candle: ${new Date(res2.data[0][0]).toISOString()} Close=${res2.data[0][4]}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkEURGBP();
