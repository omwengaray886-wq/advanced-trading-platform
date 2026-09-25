
import axios from 'axios';

async function checkSpecificSymbols() {
    const symbols = ['GBPUSDT', 'GBPJPY', 'GBPUSD', 'BTCUSDT'];
    const categories = ['linear', 'spot'];

    for (const cat of categories) {
        console.log(`\n--- Checking ${cat.toUpperCase()} ---`);
        for (const sym of symbols) {
            try {
                const url = 'https://api.bybit.com/v5/market/kline';
                const params = {
                    category: cat,
                    symbol: sym,
                    interval: '60',
                    limit: 1
                };
                const res = await axios.get(url, { params });
                if (res.data.retCode === 0 && res.data.result.list.length > 0) {
                    console.log(`${sym}: FOUND (${res.data.result.list[0][4]})`);
                } else {
                    console.log(`${sym}: MISSING (${res.data.retMsg})`);
                }
            } catch (e) {
                console.log(`${sym}: ERROR ${e.message}`);
            }
        }
    }
}

checkSpecificSymbols();
