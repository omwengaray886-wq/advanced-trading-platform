import axios from 'axios';

async function comparePrices() {
    console.log("--- Price Source Comparison ---");

    try {
        // 1. Yahoo Finance
        const yRes = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/GBPJPY=X?interval=1m&range=1d`);
        const yPrice = yRes.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        console.log(`Yahoo Finance (GBPJPY=X): ${yPrice}`);

        // 2. Binance Synthetic
        const [gbpT, btcJpyT, btcUsdtT] = await Promise.all([
            axios.get(`https://api.binance.com/api/v3/ticker/24hr`, { params: { symbol: 'GBPUSDT' } }).catch(() => ({ data: { lastPrice: "0" } })),
            axios.get(`https://api.binance.com/api/v3/ticker/24hr`, { params: { symbol: 'BTCJPY' } }).catch(() => ({ data: { lastPrice: "0" } })),
            axios.get(`https://api.binance.com/api/v3/ticker/24hr`, { params: { symbol: 'BTCUSDT' } }).catch(() => ({ data: { lastPrice: "0" } }))
        ]);

        const bSynthetic = (parseFloat(gbpT.data.lastPrice) * parseFloat(btcJpyT.data.lastPrice)) / parseFloat(btcUsdtT.data.lastPrice);
        console.log(`Binance Synthetic: ${bSynthetic} (GBP:${gbpT.data.lastPrice}, BTCJPY:${btcJpyT.data.lastPrice}, BTCUSD:${btcUsdtT.data.lastPrice})`);

    } catch (err) {
        console.error(err.message);
    }
}

comparePrices();
