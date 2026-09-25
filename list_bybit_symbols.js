
import axios from 'axios';

async function listBybitSymbols() {
    try {
        console.log('Fetching Bybit Instruments...');
        const url = 'https://api.bybit.com/v5/market/instruments-info';
        const params = {
            category: 'spot', // Check spot
            limit: 1000
        };

        const res = await axios.get(url, { params });
        if (res.data.retCode === 0) {
            const symbols = res.data.result.list.map(s => s.symbol);
            console.log('First 5 Spot Symbols:', symbols.slice(0, 5).join(', '));

            const gbpPairs = symbols.filter(s => s.includes('GBP'));
            console.log('Bybit GBP Pairs (Spot):', gbpPairs.join(', '));
        } else {
            console.error('Failed to fetch linear:', res.data);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

listBybitSymbols();
