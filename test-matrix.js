import { correlationService } from './src/services/correlationService.js';

async function testMatrix() {
    try {
        console.log("Fetching correlation matrix...");
        const matrix = await correlationService.getMatrix(['BTCUSDT', 'ETHUSDT', 'DXY'], '1h');
        console.log("Matrix fetched successfully:");
        console.log(JSON.stringify(matrix, null, 2));
    } catch (err) {
        console.error("Matrix fetch failed:", err.message);
    }
}

testMatrix();
