// Quick test to verify live API connectivity
import { marketData } from './src/services/marketData.js';

console.log("🔍 Testing Live API Connectivity...\n");

// Test 1: Fetch Live Candles
console.log("[1] Fetching live candles for BTCUSDT...");
const candles = await marketData.fetchHistory('BTCUSDT', '1h', 10);
if (candles && candles.length > 0) {
    console.log(`✅ SUCCESS: Received ${candles.length} candles`);
    console.log(`   Latest: ${candles[candles.length - 1].close} (${new Date(candles[candles.length - 1].time * 1000).toISOString()})`);
} else {
    console.log(`❌ FAILED: No candles received`);
}

// Test 2: Fetch Order Book
console.log("\n[2] Fetching order book for BTCUSDT...");
const orderBook = await marketData.fetchOrderBook('BTCUSDT', 20);
if (orderBook && orderBook.bids && orderBook.asks) {
    console.log(`✅ SUCCESS: Received order book`);
    console.log(`   Best Bid: ${orderBook.bids[0]?.price} (${orderBook.bids[0]?.quantity})`);
    console.log(`   Best Ask: ${orderBook.asks[0]?.price} (${orderBook.asks[0]?.quantity})`);
    console.log(`   Spread: ${(orderBook.asks[0]?.price - orderBook.bids[0]?.price).toFixed(2)}`);
} else {
    console.log(`❌ FAILED: No order book data`);
}

// Test 3: Check Firestore Connection
console.log("\n[3] Checking Firestore connection...");
try {
    const { db } = await import('./src/services/db.js');
    const signals = await db.getGlobalSignals();
    console.log(`✅ SUCCESS: Firestore connected`);
    console.log(`   Signals in DB: ${signals.length}`);
    if (signals.length > 0) {
        const latest = signals[0];
        console.log(`   Latest Signal: ${latest.symbol} ${latest.direction} @ ${latest.entry}`);
        console.log(`   Has riskPercentage: ${latest.riskPercentage ? '✓' : '✗'}`);
        console.log(`   Has trailingStop: ${latest.trailingStop ? '✓' : '✗'}`);
    }
} catch (error) {
    console.log(`❌ FAILED: ${error.message}`);
}

console.log("\n✅ Live API Test Complete");
process.exit(0);
