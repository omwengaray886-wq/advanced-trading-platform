
import axios from 'axios';

async function checkEuroPairs() {
    const pairs = ['EURGBP', 'EURJPY', 'EURUSDT'];

    console.log('Checking Euro Pairs on Binance...');

    for (const symbol of pairs) {
        try {
            const res = await axios.get('https://api.binance.com/api/v3/klines', {
                params: { symbol, interval: '1h', limit: 1 }
            });

            if (res.data.length > 0) {
                const candle = res.data[0];
                const time = new Date(candle[0]).toISOString();
                const close = candle[4];
                console.log(`${symbol}: ACTIVE (Time=${time}, Close=${close})`);
            } else {
                console.log(`${symbol}: EMPTY`);
            }
        } catch (error) {
            console.log(`${symbol}: ERROR ${error.message} (${error.response?.data?.msg || 'N/A'})`);
        }
    }
}

checkEuroPairs();
