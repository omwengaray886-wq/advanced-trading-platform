import { ExecutionEngine } from './src/services/ExecutionEngine.js';

console.log("--- Testing Execution Engine ---");

// 1. Test Spread Health
const price = 2000;
const atr = 10; // 0.5% daily range
const bid = 1999.5;
const ask = 2000.5; // Spread = 1

console.log("\n1. Normal Spread (1.0)");
const normalSpread = ExecutionEngine.checkSpreadHealth(price, bid, ask, atr);
console.log(normalSpread);

const wideAsk = 2005.0; // Spread = 5.5 (55% of ATR)
console.log("\n2. Wide Spread (5.5)");
const panicSpread = ExecutionEngine.checkSpreadHealth(price, bid, wideAsk, atr);
console.log(panicSpread);

// 2. Test Order Types
console.log("\n3. Volatility Order Types");
console.log("LOW:", ExecutionEngine.getOptimalOrderType({ level: 'LOW' }));
console.log("HIGH:", ExecutionEngine.getOptimalOrderType({ level: 'HIGH' }));
console.log("EXTREME:", ExecutionEngine.getOptimalOrderType({ level: 'EXTREME' }));
