import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

async function listDatabases() {
    try {
        const keyPath = './.secrets/firebase-admin-key.json';
        const auth = new GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;

        const projectId = 'trading-platform-a13c1';
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases`;

        console.log(`Listing databases: ${url}`);

        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Databases:', JSON.stringify(res.data, null, 2));
        process.exit(0);
    } catch (e) {
        if (e.response) {
            console.error('Status:', e.response.status);
            console.error('Data:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.error('❌ ERROR:', e.message);
        }
        process.exit(1);
    }
}

listDatabases();
