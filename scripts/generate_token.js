
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const SECRET_ENV = process.env.JWT_SECRET || 's3cr3t_7rad1ng_p1a7f0rm_k3y_2026_v2';
const SECRET_FALLBACK = 'your-secret-key-change-this'; // From server.js fallback

const payload = {
    role: 'admin',
    name: 'Authorized User',
    access_level: 'unrestricted',
    ts: Date.now() // Add timestamp to make it unique
};

const tokenEnv = jwt.sign(payload, SECRET_ENV, { expiresIn: '30d' });
const tokenFallback = jwt.sign(payload, SECRET_FALLBACK, { expiresIn: '30d' });

console.log('\n=== TOKEN 1 (ENV SECRET) ===');
console.log(tokenEnv);
console.log('\n=== TOKEN 2 (FALLBACK SECRET) ===');
console.log(tokenFallback);
console.log('==============================\n');
