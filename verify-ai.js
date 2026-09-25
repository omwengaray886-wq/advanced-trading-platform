import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load .env manually since we are running in Node
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = null;

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/^GEMINI_API_KEY=(.*)/m);
    apiKey = match ? match[1].trim() : null;
} catch (e) {
    console.error("Could not read .env file");
}

if (!apiKey) {
    console.error("API Key not found in .env");
    process.exit(1);
}

console.log("Found API Key:", apiKey.substring(0, 5) + "...");

async function testGemini() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        console.log("Sending test prompt to Gemini...");
        const result = await model.generateContent("Say 'Hello Trader' if you can hear me.");
        const response = await result.response;
        const text = response.text();

        console.log("Response received:", text);

        if (text.includes("Hello Trader")) {
            console.log("SUCCESS: API Key is valid and Gemini is responding.");
        } else {
            console.log("WARNING: Response received but unexpected content.");
        }

    } catch (error) {
        console.error("FAILURE: Gemini API test failed.");
        console.error(error);
    }
}

testGemini();
