import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

// Load .env manually since we are running in Node
const envPath = path.resolve(process.cwd(), '.env');
let apiKey = null;

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const match = envContent.match(/VITE_GEMINI_API_KEY=(.*)/);
    apiKey = match ? match[1].trim() : null;
} catch (e) {
    console.error("Could not read .env file");
}

if (!apiKey) {
    console.error("API Key not found in .env");
    process.exit(1);
}

// Minimal fetch implementation to list models since SDK might hide it
async function listModels() {
    try {
        console.log("Attempting to list models via raw API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
            return true;
        } else {
            console.error("Could not list models:", data);
            return false;
        }
    } catch (e) {
        console.error("List models failed:", e);
        return false;
    }
}

listModels();
