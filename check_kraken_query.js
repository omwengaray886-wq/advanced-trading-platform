
import axios from 'axios';

async function verifyKrakenQuery() {
    console.log('Testing Kraken Query Format...');
    const pairs = ['EURGBP', 'EURJPY'];

    for (const pair of pairs) {
        try {
            const res = await axios.get('https://api.kraken.com/0/public/OHLC', {
                params: { pair, interval: 60 }
            });

            if (res.data.error && res.data.error.length > 0) {
                console.log(`${pair}: ERROR ${res.data.error}`);
            } else {
                // Kraken result keys are often not the query name (e.g., XXBTZUSD)
                // We need to find the key that holds the array
                const resultKeys = Object.keys(res.data.result).filter(k => k !== 'last');
                const data = res.data.result[resultKeys[0]];
                console.log(`${pair}: SUCCESS (Returned as ${resultKeys[0]}, Count=${data.length})`);
            }
        } catch (error) {
            console.error(`${pair}: NETWORK ERROR ${error.message}`);
        }
    }
}

verifyKrakenQuery();
