/**
 * Verification Script: Price Alignment & Symbol Mapping
 * Run with: node src/verify_price_alignment.js
 */

import axios from 'axios';

const SERVER_URL = 'http://localhost:3001';

async function verify() {
    console.log("🚀 Starting Price Alignment Verification...\n");

    const pairs = [
        { symbol: 'BTC/USDT', expectedRange: [30000, 150000] },
        { symbol: 'ETH/USDT', expectedRange: [1000, 10000] },
        { symbol: 'XAU/USD', expectedRange: [1500, 3000] }, // Gold (PAXG)
        { symbol: 'EUR/USD', expectedRange: [0.8, 1.5] },
        { symbol: 'GBP/USD', expectedRange: [1.0, 1.6] },
        { symbol: 'NZD/USD', expectedRange: [0.5, 0.8] }
    ];

    for (const pair of pairs) {
        try {
            console.log(`Checking ${pair.symbol}...`);
            const res = await axios.get(`${SERVER_URL}/api/binance/klines`, {
                params: { symbol: pair.symbol, interval: '1h', limit: 1 }
            });

            if (!res.data || res.data.length === 0) {
                console.error(`❌ ${pair.symbol}: No data returned`);
                continue;
            }

            const closePrice = parseFloat(res.data[0][4]);
            console.log(`   - Price: ${closePrice}`);

            if (closePrice >= pair.expectedRange[0] && closePrice <= pair.expectedRange[1]) {
                console.log(`   ✅ ${pair.symbol}: Alignment OK`);
            } else {
                console.error(`   ❌ ${pair.symbol}: PRICE MISALIGNMENT! (Expected ${pair.expectedRange[0]}-${pair.expectedRange[1]}, got ${closePrice})`);
                if (pair.symbol !== 'BTC/USDT' && Math.abs(closePrice - 50000) < 30000) {
                    console.error(`      ⚠️ Possible fallback to BTCUSDT detected!`);
                }
            }
        } catch (error) {
            console.error(`   ❌ ${pair.symbol}: Request failed - ${error.message}`);
            if (error.response) {
                console.error(`      Status: ${error.response.status}`);
                console.error(`      Data:`, error.response.data);
            }
        }
        console.log("");
    }

    console.log("✨ Verification Complete!");
}

verify().catch(console.error);
