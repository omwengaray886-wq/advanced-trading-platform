import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const cpKey = process.env.CRYPTOPANIC_API_KEY;

async function diagnose() {
    console.log('--- Diagnosis Start ---');

    // 1. Gemini List Models
    if (apiKey) {
        try {
            console.log('[GEMINI] Attempting to list models...');
            const genAI = new GoogleGenerativeAI(apiKey);
            // The library doesn't easily expose listModels in a simple way without additional setup usually
            // but we can try to hit a known model and see the exact error if it's different.
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("test");
            console.log('[GEMINI SUCCESS] gemini-pro works:', result.response.text().slice(0, 20));
        } catch (err) {
            console.error('[GEMINI FAILED] gemini-pro:', err.message);
        }
    }

    // 2. CryptoPanic Test
    if (cpKey) {
        const urls = [
            `https://cryptopanic.com/api/v1/posts/?auth_token=${cpKey}`,
            `https://cryptopanic.com/api/v1/posts/?auth_token=${cpKey}&public=true`,
            `https://cryptopanic.com/api/v1/posts/?auth_token=${cpKey}&filter=hot`
        ];

        for (const url of urls) {
            try {
                console.log(`[CP] Testing: ${url.split('auth_token=')[0]}...`);
                const res = await axios.get(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 5000
                });
                console.log(`[CP SUCCESS] Status: ${res.status}, Type: ${typeof res.data}, Keys: ${Object.keys(res.data)}`);
                if (Array.isArray(res.data.results)) {
                    console.log(`    Found ${res.data.results.length} results.`);
                    break;
                }
            } catch (err) {
                console.error(`[CP FAILED] Status: ${err.response?.status}, Msg: ${err.message.slice(0, 50)}`);
            }
        }
    }

    console.log('--- Diagnosis End ---');
}

diagnose();
