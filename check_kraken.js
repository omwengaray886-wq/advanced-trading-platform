
import axios from 'axios';

async function checkKraken() {
    try {
        console.log('Checking Kraken for GBPJPY...');
        const url = 'https://api.kraken.com/0/public/OHLC';
        const params = {
            pair: 'GBPJPY',
            interval: 60 // 1 hour
        };

        console.log(`GET ${url}`);
        const res = await axios.get(url, { params });

        if (res.data.error && res.data.error.length > 0) {
            console.log('Kraken Error:', res.data.error);
        } else {
            const keys = Object.keys(res.data.result);
            const pairName = keys.find(k => k !== 'last');
            const candles = res.data.result[pairName];

            console.log(`SUCCESS: Found ${pairName} on Kraken.`);
            console.log(`Sample Candle: Time=${new Date(candles[0][0] * 1000).toISOString()} Close=${candles[0][4]}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

checkKraken();
