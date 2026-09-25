
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret = process.env.JWT_SECRET;
if (!secret) {
    console.error('Error: JWT_SECRET not found in .env');
    process.exit(1);
}

// Create a payload for a "Pro" user
const payload = {
    id: 'dev-admin',
    role: 'admin',
    access: 'unlimited',
    timestamp: Date.now()
};

// Sign token (valid for 30 days for dev convenience)
const token = jwt.sign(payload, secret, { expiresIn: '30d' });

console.log('\n✅ Generated Local Access Token (Valid 30d):');
console.log('---------------------------------------------------');
console.log(token);
console.log('---------------------------------------------------');
console.log('\nUsage:');
console.log('1. Add to headers: { "Authorization": "Bearer <token>" }');
console.log('2. Or use in /api/auth/verify endpoint');
