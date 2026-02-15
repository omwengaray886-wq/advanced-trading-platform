
import axios from 'axios';

async function checkGBPPairs() {
    try {
        console.log('Fetching Binance Exchange Info...');
        const res = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
        const symbols = res.data.symbols
            .filter(s => s.symbol.includes('GBP'))
            .map(s => s.symbol);

        console.log('\n--- Available GBP Pairs ---');
        console.log(symbols.join(', '));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkGBPPairs();
