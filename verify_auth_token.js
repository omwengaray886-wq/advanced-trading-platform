import axios from 'axios';

const token = process.argv[2];

if (!token) {
    console.error('Please provide a token to verify.');
    process.exit(1);
}

async function verify() {
    try {
        console.log('Verifying token...');
        const response = await axios.post('http://localhost:3001/api/auth/verify', { token });
        console.log('✅ Token Valid:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('❌ Verification Failed:', error.response.status, error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

verify();
