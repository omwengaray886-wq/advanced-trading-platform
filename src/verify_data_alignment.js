// src/verify_data_alignment.js
import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api/binance/klines';

async function testSymbol(symbol) {
    try {
        console.log(`Testing [${symbol}]...`);
        const res = await axios.get(`${BASE_URL}?symbol=${symbol}&interval=1h&limit=1`);
        const data = res.data;
        if (!Array.isArray(data) || data.length === 0) {
            console.error(`❌ [${symbol}] FAILED: Unexpected response format`, data);
            return false;
        }

        const price = parseFloat(data[0][4]);
        console.log(`✅ [${symbol}] SUCCESS: Price = ${price}`);
        return price;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`ℹ️ [${symbol}] REJECTED: 404 (Expected for invalid symbols)`);
            return 404;
        }
        console.error(`❌ [${symbol}] FAILED: ${error.message}`);
        if (error.response) console.error(error.response.data);
        return false;
    }
}

async function run() {
    console.log('🚀 Starting Data Alignment Verification...\n');

    // 1. Check Gold (Proxy)
    const goldPrice = await testSymbol('XAU/USD');
    if (goldPrice && goldPrice > 1000 && goldPrice < 10000) {
        console.log('✅ Gold price looks reasonable (~$2000-$6000)');
    } else {
        console.error('❌ Gold price looks incorrect!', goldPrice);
    }

    // 2. Check BTC (Sanity check)
    const btcPrice = await testSymbol('BTC/USDT');
    if (goldPrice && btcPrice && Math.abs(goldPrice - btcPrice) < 1) {
        console.error('❌ CRITICAL: Gold price matches BTC price! Mapping is broken.');
    } else {
        console.log('✅ Gold price is distinct from BTC price');
    }

    // 3. Check EURUSD (Forex)
    const eurPrice = await testSymbol('EUR/USD');
    if (eurPrice && eurPrice > 0.8 && eurPrice < 1.3) {
        console.log('✅ EUR/USD price looks reasonable (~1.0x)');
    } else {
        console.error('❌ EUR/USD price looks incorrect!', eurPrice);
    }

    // 4. Check Random Spot Pairs (New Dynamic Feature)
    await testSymbol('PEPE/USDT');
    await testSymbol('SOL/USDT');
    await testSymbol('ETH/BTC');

    // 5. Check Invalid Symbol (Strict check)
    const invalidStatus = await testSymbol('INVALID_XYZ');
    if (invalidStatus === 404) {
        console.log('✅ Invalid symbol correctly rejected with 404');
    } else {
        console.error('❌ Invalid symbol was NOT rejected with 404!');
    }

    console.log('\n🏁 Verification Finished.');
}

run();
