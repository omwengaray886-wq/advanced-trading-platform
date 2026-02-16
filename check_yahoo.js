import axios from 'axios';

async function checkYahooStructure() {
    try {
        const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/GBPJPY=X?interval=1h&range=1d`);
        const result = res.data?.chart?.result?.[0];
        console.log("Indicators:", Object.keys(result.indicators));
        console.log("Quote Keys:", Object.keys(result.indicators.quote[0]));
        console.log("Volume Sample:", result.indicators.quote[0].volume?.slice(0, 5));
    } catch (err) {
        console.error(err.message);
    }
}

checkYahooStructure();
