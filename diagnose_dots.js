import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function diagnoseDots() {
    console.log("--- Diagnosing GBPJPY 'Dots' Issue ---");

    try {
        const res = await axios.get(`${BASE_URL}/binance/klines`, {
            params: { symbol: 'GBPJPY', interval: '1m', limit: 10 }
        });
        const data = res.data;

        console.log("\nRecent Klines (Last 5):");
        data.slice(-5).forEach((c, i) => {
            const openTime = new Date(c[0]);
            const closeTime = new Date(c[6]);
            const o = parseFloat(c[1]);
            const h = parseFloat(c[2]);
            const l = parseFloat(c[3]);
            const c_ = parseFloat(c[4]);

            console.log(`[${i}] Open: ${openTime.toISOString()} (${c[0]})`);
            console.log(`    Close: ${closeTime.toISOString()} (${c[6]})`);
            console.log(`    OHLC: ${o}, ${h}, ${l}, ${c_}`);
            console.log(`    Is Dot (O==C): ${o === c_}`);
            console.log(`    Is Flat (H==L): ${h === l}`);

            if (i > 0) {
                const prevClose = data[data.length - 5 + i - 1][6];
                if (c[0] <= prevClose) {
                    console.error(`    ❌ OVERLAP DETECTED! Current Open (${c[0]}) <= Previous Close (${prevClose})`);
                }
            }
        });

    } catch (err) {
        console.error("Diagnosis failed:", err.message);
    }
}

diagnoseDots();
