import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

async function testRest() {
    console.log('Starting REST test...');
    try {
        const keyPath = './.secrets/firebase-admin-key.json';
        console.log('Loading auth from:', keyPath);

        const auth = new GoogleAuth({
            keyFile: keyPath,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });

        console.log('Getting client...');
        const client = await auth.getClient();

        console.log('Getting token...');
        const tokenResponse = await client.getAccessToken();
        const token = tokenResponse.token;
        console.log('Token acquired (truncated):', token ? token.substring(0, 10) + '...' : 'null');

        const projectId = 'trading-platform-a13c1';
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

        console.log(`Testing REST API: ${url}`);

        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            validateStatus: () => true
        });

        console.log('Status:', res.status);
        console.log('Data:', JSON.stringify(res.data, null, 2));

        process.exit(0);
    } catch (e) {
        console.error('❌ ERROR:', e.message);
        console.error(e.stack);
        process.exit(1);
    }
}

testRest();
