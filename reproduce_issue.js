import { DirectionalConfidenceGate } from './src/analysis/DirectionalConfidenceGate.js';

console.log('Static import test...');
try {
    console.log('Static Import: DirectionalConfidenceGate is', typeof DirectionalConfidenceGate);
} catch (e) {
    console.error('Static Import Error:', e);
}

async function testDynamicImport() {
    try {
        console.log('Attempting dynamic import...');
        const module = await import('./src/analysis/DirectionalConfidenceGate.js');
        console.log('Dynamic Import keys:', Object.keys(module));

        if (module.DirectionalConfidenceGate) {
            console.log('Dynamic Import: DirectionalConfidenceGate class found.');
        } else {
            console.error('Dynamic Import: DirectionalConfidenceGate class NOT found in exports.');
        }
    } catch (error) {
        console.error('Dynamic import failed:', error);
    }
}

testDynamicImport();
