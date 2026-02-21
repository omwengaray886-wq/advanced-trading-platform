
import { ChartAnnotation } from '../ChartAnnotation.js';

export class WhaleAlert extends ChartAnnotation {
    constructor(txHash, symbol, valueUsd, fromType, toType, timestamp, sentiment) {
        super('WHALE_ALERT', { time: timestamp, price: 0 }); // Price 0 as placeholder, mapper will position it

        this.txHash = txHash;
        this.symbol = symbol;
        this.valueUsd = valueUsd;
        this.fromType = fromType;
        this.toType = toType;
        this.sentiment = sentiment;

        this.formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1
        });
    }

    getLabel() {
        const val = this.formatter.format(this.valueUsd);
        const icon = this.sentiment === 'BULLISH' ? '🐋' : '⚠️';
        const direction = this.sentiment === 'BULLISH' ? 'Accumulation' : 'Dump Risk';
        return `${icon} ${val} ${direction}`;
    }
}
