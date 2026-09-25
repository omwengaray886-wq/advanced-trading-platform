
import fs from 'fs';
import path from 'path';

const filePath = path.resolve('server.js');
console.log(`Reading ${filePath}...`);

const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find start line
const startIdx = lines.findIndex(l => l.includes("if (mappedSymbol === 'GBPJPY' || mappedSymbol === 'JBPJPY') {"));
if (startIdx === -1) {
    console.error('Could not find start line!');
    process.exit(1);
}
console.log(`Found start at line ${startIdx + 1}`);

// Find end line
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("const indexConfig = typeof INDICES_MAP[mappedSymbol] === 'string'"));
if (endIdx === -1) {
    console.error('Could not find end line!');
    process.exit(1);
}
console.log(`Found end at line ${endIdx + 1}`);

// New content to insert
const newBlock = `            // --- GBPJPY: Direct Yahoo Finance (Real Market Data) ---
            if (mappedSymbol === 'GBPJPY' || mappedSymbol === 'JBPJPY') {
                try {
                    console.log(\`[PROXY] Fetching REAL GBPJPY from Yahoo Finance...\`);
                    const range = interval === '1h' ? '7d' : '1mo'; 
                    const yParams = {
                        interval: interval === '4h' ? '60m' : '60m', 
                        range: range
                    };
                    
                    const yRes = await axios.get(\`https://query1.finance.yahoo.com/v8/finance/chart/GBPJPY=X\`, { params: yParams });
                    const result = yRes.data?.chart?.result?.[0];

                    if (!result) throw new Error('No Yahoo data');

                    const timestamps = result.timestamp;
                    const quote = result.indicators.quote[0];
                    
                    // Map to Binance Format
                    const candles = timestamps.map((t, i) => {
                        if (quote.open[i] === null || quote.close[i] === null) return null;
                        
                        return [
                            t * 1000, 
                            quote.open[i].toFixed(3),
                            quote.high[i].toFixed(3),
                            quote.low[i].toFixed(3),
                            quote.close[i].toFixed(3),
                            "10000", 
                            (t * 1000) + 3599999,
                            "100000",
                            100,
                            "5000",
                            "50000",
                            "0"
                        ];
                    }).filter(c => c !== null);

                    return res.json(candles.reverse().slice(0, parseInt(limit) || 100).reverse()); // Ensure limit

                } catch (yErr) {
                    console.error(\`[PROXY ERROR] Yahoo Finance fail for GBPJPY:\`, yErr.message);
                }
            }`;

// Splice and replace
// Remove from startIdx up to (but not including) endIdx
// Insert newBlock
lines.splice(startIdx, endIdx - startIdx, newBlock);

console.log('Writing updated content...');
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done!');
