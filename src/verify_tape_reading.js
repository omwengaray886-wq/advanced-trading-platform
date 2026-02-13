import { EdgeScoringEngine } from './services/EdgeScoringEngine.js';
import { OrderFlowAnalyzer } from './services/OrderFlowAnalyzer.js';
import { TapeReadingEngine } from './services/TapeReadingEngine.js';

console.log('--- STARTING TAPE READING VERIFICATION ---');

// Mock Data
const mockSetup = { direction: 'LONG', strategy: { name: 'WhaleHunter' }, rr: 2.5 };
const baseMarket = { symbol: 'BTCUSDT', timeframe: '1h', regime: 'TRENDING_UP' };

// Test 1: Whale Print
console.log('\n[TEST 1] Whale Print Detection');
const candles = Array(50).fill({ volume: 100, high: 100, low: 90, close: 95, open: 92 });
const whaleTick = { price: 95, volume: 5000 }; // Huge print

const whaleScan = TapeReadingEngine.monitorTape(candles, whaleTick);
console.log('Whale Scan Result:', whaleScan);

const whaleMarket = { ...baseMarket, tape: { whale: whaleScan } };
const score1 = EdgeScoringEngine.calculateScore(mockSetup, whaleMarket, { probability: 0.6 });
console.log(`Score with Whale: ${score1.score} | Breakdown: ${JSON.stringify(score1.breakdown)}`);

// Test 2: Iceberg Detection
console.log('\n[TEST 2] Iceberg Detection');
// Simulate 10 candles hitting the same low range with MASSIVE volume but no break
const icebergCandles = Array(20).fill(0).map((_, i) => ({
    time: 1000 + i,
    open: 105,
    high: 110,
    low: 100,
    close: 101, // Close near low (101-100 = 1 < 2.0 threshold)
    volume: i >= 10 ? 5000 : 100 // Last 10 candles have huge volume
}));

const icebergScan = OrderFlowAnalyzer.detectIceberg(icebergCandles);
console.log('Iceberg Scan Result:', icebergScan);

const icebergMarket = { ...baseMarket, orderFlow: { iceberg: icebergScan } };
const score2 = EdgeScoringEngine.calculateScore(mockSetup, icebergMarket, { probability: 0.6 });
console.log(`Score with Iceberg: ${score2.score} | Breakdown: ${JSON.stringify(score2.breakdown)}`);


console.log('\n--- VERIFICATION COMPLETE ---');
