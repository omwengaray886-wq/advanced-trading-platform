
import axios from 'axios';

async function checkBybitGBPJPY() {
    try {
        console.log('Checking Bybit for GBPJPY...');
        const url = 'https://api.bybit.com/v5/market/kline';
        const params = {
            category: 'linear', // Try linear (perpetual) first as forex is often perp
            symbol: 'GBPJPY',
            interval: '60', // 1h
            limit: 1
        };

        console.log(`GET ${url}`);
        const res = await axios.get(url, { params });

        if (res.data.retCode === 0 && res.data.result.list.length > 0) {
            const candle = res.data.result.list[0]; // [startTime, open, high, low, close, volume, turnover]
            console.log('SUCCESS: Found GBPJPY on Bybit (Linear)');
            console.log(`Sample: Time=${new Date(parseInt(candle[0])).toISOString()} Close=${candle[4]}`);
        } else {
            console.log('Bybit Linear response:', res.data);

            // Try Spot
            console.log('Checking Bybit Spot...');
            params.category = 'spot';
            const res2 = await axios.get(url, { params });
            if (res2.data.retCode === 0 && res2.data.result.list.length > 0) {
                console.log('SUCCESS: Found GBPJPY on Bybit (Spot)');
            } else {
                console.log('Bybit Spot response:', res2.data);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

checkBybitGBPJPY();
