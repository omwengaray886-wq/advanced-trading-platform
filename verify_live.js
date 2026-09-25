import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function verifyLiveTicking() {
    console.log("--- Verifying GBPJPY Real-Time Candle Formation ---");

    for (let i = 0; i < 3; i++) {
        try {
            const res = await axios.get(`${BASE_URL}/binance/klines`, {
                params: { symbol: 'GBPJPY', interval: '1m', limit: 5 }
            });
            const klines = res.data;
            const last = klines[klines.length - 1];
            const now = Date.now();

            console.log(`\nPoll ${i + 1} @ ${new Date(now).toLocaleTimeString()}`);
            console.log(`- Last Candle Open: ${new Date(last[0]).toLocaleTimeString()}`);
            console.log(`- Last Candle Close Time: ${new Date(last[6]).toLocaleTimeString()}`);
            console.log(`- Current Price (Ticking): ${last[4]}`);

            if (now > last[0] && now <= last[6]) {
                console.log(`✅ Candle is ACTIVE (Price is forming live)`);
            } else {
                console.log(`⚠️ Candle is STALE (History only)`);
            }

            await new Promise(r => setTimeout(r, 6000)); // Wait 6s between polls
        } catch (err) {
            console.error("Error:", err.message);
        }
    }
}

verifyLiveTicking();
