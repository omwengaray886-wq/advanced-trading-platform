import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-this';

if (SECRET_KEY === 'your-secret-key-change-this') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET. Please set JWT_SECRET in .env for production security.');
}

const generateToken = (role = 'premium', days = 365) => {
    const payload = {
        role,
        issued: Date.now(),
        type: 'access_key'
    };

    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: `${days}d` });

    console.log('\n==================================================');
    console.log('🔑  NEW ACCESS KEY GENERATED');
    console.log('==================================================');
    console.log(`Role:       ${role}`);
    console.log(`Expires:    ${days} days`);
    console.log('--------------------------------------------------');
    console.log(token);
    console.log('==================================================\n');
};

// Get args
const args = process.argv.slice(2);
const role = args[0] || 'premium';

generateToken(role);
