
import axios from 'axios';

async function listKrakenEUR() {
    try {
        console.log('Fetching Kraken AssetPairs (EUR)...');
        const res = await axios.get('https://api.kraken.com/0/public/AssetPairs');
        const pairs = Object.keys(res.data.result);

        const eurPairs = pairs.filter(p => p.includes('EUR') && !p.includes('USD') && !p.includes('GBP'));
        console.log('Kraken EUR Pairs (filtered):', eurPairs.join(', '));

        // Check specifically for EURJPY
        const eurjpy = pairs.find(p => p.includes('EUR') && p.includes('JPY'));
        console.log(`EURJPY found: ${eurjpy || 'NO'}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

listKrakenEUR();
