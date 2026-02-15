
import axios from 'axios';

async function checkYahoo() {
    try {
        console.log('Checking Yahoo Finance for GBPJPY=X...');
        // Yahoo Finance v8 chart API
        const symbol = 'GBPJPY=X';
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

        const params = {
            interval: '60m', // 1h
            range: '1d'      // 1 day of data
        };

        console.log(`GET ${url}`);
        const res = await axios.get(url, { params });

        const result = res.data.chart.result[0];
        const meta = result.meta;
        const timestamp = result.timestamp;
        const quote = result.indicators.quote[0];

        console.log(`Symbol: ${meta.symbol}`);
        console.log(`Currency: ${meta.currency}`);
        console.log(`Price: ${meta.regularMarketPrice}`);
        console.log(`Data Points: ${timestamp.length}`);

        const lastIdx = timestamp.length - 1;
        const lastTime = new Date(timestamp[lastIdx] * 1000).toISOString();
        const lastClose = quote.close[lastIdx];

        console.log(`Last Candle: ${lastTime} Close=${lastClose}`);

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

checkYahoo();
