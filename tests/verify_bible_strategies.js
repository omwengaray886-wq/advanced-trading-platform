
import { detectCandlePatterns } from '../src/analysis/indicators.js';
import { PriceActionConfirmation } from '../src/strategies/modules/PriceActionConfirmation.js';

const createDoji = () => {
    return [
        { time: 100, open: 110, high: 115, low: 105, close: 111, volume: 1000 },
        { time: 200, open: 100, high: 110, low: 90, close: 100.1, volume: 1000 }
    ];
};

const createEngulfing = () => {
    return [
        { time: 100, open: 100, high: 102, low: 98, close: 101, volume: 1000 },
        { time: 200, open: 102, high: 110, low: 90, close: 95, volume: 1500 } // Clear Engulfing
    ];
};

const createMorningStar = () => {
    return [
        { time: 100, open: 110, high: 112, low: 100, close: 101, volume: 1000 }, // Big Bearish (Body 9)
        { time: 200, open: 100.5, high: 101, low: 99.5, close: 100.7, volume: 500 }, // Small (Body 0.2)
        { time: 300, open: 101, high: 104, low: 100, close: 108, volume: 1200 } // Big Bullish (Body 7, Range 4)
    ];
    // prev2Body (9) > curr.range (4) * 1.5 (6) -> TRUE
};

async function testPatterns() {
    console.log('Testing Bible Candlestick Patterns...');

    const dojiData = createDoji();
    const dojiTest = detectCandlePatterns(dojiData);
    console.log('Doji Detection:', dojiTest);
    console.log('Doji Test:', dojiTest.some(p => p.type.includes('DOJI')) ? 'PASS' : 'FAIL');

    const engulfingData = createEngulfing();
    const engulfingTest = detectCandlePatterns(engulfingData);
    console.log('Engulfing Detection:', engulfingTest);
    console.log('Engulfing Test:', engulfingTest.some(p => p.type === 'ENGULFING') ? 'PASS' : 'FAIL');

    const msData = createMorningStar();
    const morningStarTest = detectCandlePatterns(msData);
    console.log('Morning Star Detection:', morningStarTest);
    console.log('Morning Star Test:', morningStarTest.some(p => p.type === 'MORNING_STAR') ? 'PASS' : 'FAIL');

    console.log('\nTesting Strategy Logic...');
    const strategy = new PriceActionConfirmation();
    const mockState = {
        trend: { direction: 'BULLISH' },
        structures: [{ price: 108, significance: 'high' }]
    };

    // Create a series of candles that includes a pattern and matches confluence
    // We'll use Morning Star. The last candle is at 108.
    const annotations = strategy.generateAnnotations(msData, mockState);

    console.log('Annotations Found:', annotations.length);
    // Correct metadata access
    const hasBibleNote = annotations.some(a => a.metadata && a.metadata.note && a.metadata.note.includes('Bible Setup'));
    console.log('Bible Strategy Integration:', hasBibleNote ? 'PASS' : 'FAIL');

    if (hasBibleNote) {
        annotations.forEach(a => {
            if (a.metadata && a.metadata.note && a.metadata.note.includes('Bible Setup')) {
                console.log('>> SUCCESS: Detected Setup:', a.metadata.note);
            }
        });
    }
}

testPatterns().catch(err => {
    console.error(err);
    process.exit(1);
});
