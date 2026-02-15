
import axios from 'axios';

async function checkSymbols() {
    try {
        console.log('Fetching Binance Exchange Info...');
        const res = await axios.get('https://api.binance.com/api/v3/exchangeInfo');
        const symbols = new Set(res.data.symbols.map(s => s.symbol));

        const checkList = ['GBPUSDT', 'BTCJPY', 'ETHJPY', 'USDCJPY', 'BUSDATE'];

        console.log('\n--- Symbol Availability ---');
        checkList.forEach(s => {
            console.log(`${s}: ${symbols.has(s) ? 'AVAILABLE' : 'MISSING'}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkSymbols();
