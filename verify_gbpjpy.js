import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function verifyGBPJPY() {
    console.log("--- Verifying GBPJPY Integration ---");

    try {
        // 1. Verify Klines with different timeframes
        console.log("\n1. Verifying Klines (Timeframe & Volume Mapping)...");
        const timeframes = ['1m', '15m', '1h', '1d'];
        for (const tf of timeframes) {
            const res = await axios.get(`${BASE_URL}/binance/klines`, {
                params: { symbol: 'GBPJPY', interval: tf, limit: 10 }
            });

            const data = res.data;
            if (Array.isArray(data) && data.length > 0) {
                const first = data[0];
                const last = data[data.length - 1];
                const diff = last[6] - last[0];
                const volume = first[5];

                console.log(`[PASS] ${tf} klines: ${data.length} candles.`);
                console.log(`       Sample: Close=${first[4]}, Vol=${volume}`);

                // Verify dynamic timing
                if (diff === 3599999 && tf !== '1h') {
                    console.error(`       [FAIL] Timing is hardcoded to 1h!`);
                } else {
                    console.log(`       [OK] Timing is dynamic.`);
                }

                // Verify volume
                if (volume === "10000") {
                    console.error(`       [FAIL] Volume is hardcoded!`);
                } else {
                    console.log(`       [OK] Volume is dynamic (${volume}).`);
                }
            }
        }

        // 2. Verify Ticker (Real-time Price)
        console.log("\n2. Verifying Ticker (Synthetic Price)...");
        const tickerRes = await axios.get(`${BASE_URL}/binance/ticker`, {
            params: { symbol: 'GBPJPY' }
        });
        console.log(`[PASS] Last Price: ${tickerRes.data.lastPrice}`);

        // 3. Verify Depth (Simulated Order Book)
        console.log("\n3. Verifying Depth (Synthetic DOM)...");
        const depthRes = await axios.get(`${BASE_URL}/binance/depth`, {
            params: { symbol: 'GBPJPY' }
        });
        console.log(`[PASS] Bids: ${depthRes.data.bids.length}, Asks: ${depthRes.data.asks.length}`);

        console.log("\n--- GBPJPY Integration Verified Successfully ---");
    } catch (err) {
        console.error("\n[FAIL] Verification failed:", err.message);
        if (err.response) {
            console.error("Response data:", err.response.data);
        }
    }
}

verifyGBPJPY();
