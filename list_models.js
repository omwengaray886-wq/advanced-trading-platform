import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found');
        return;
    }

    try {
        console.log('--- Listing Gemini Models (REST) ---');
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        console.log('Total models:', response.data.models.length);

        const models = response.data.models.map(m => m.name.replace('models/', ''));
        console.log('Available models:', models.join(', '));

        const hasFlash = models.includes('gemini-1.5-flash');
        const hasPro = models.includes('gemini-1.5-pro');
        console.log('Has 1.5-flash:', hasFlash);
        console.log('Has 1.5-pro:', hasPro);

    } catch (err) {
        console.error('Failed to list models:', err.response?.status, err.message);
        if (err.response?.data) console.error('Details:', JSON.stringify(err.response.data));
    }
}

listModels();
