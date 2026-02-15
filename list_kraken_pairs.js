
import axios from 'axios';

async function listKrakenPairs() {
    try {
        console.log('Fetching Kraken AssetPairs...');
        const res = await axios.get('https://api.kraken.com/0/public/AssetPairs');
        const pairs = Object.keys(res.data.result);

        const gbpPairs = pairs.filter(p => p.includes('GBP'));
        console.log('Kraken GBP Pairs:', gbpPairs.join(', '));

    } catch (error) {
        console.error('Error:', error.message);
    }
}

listKrakenPairs();
