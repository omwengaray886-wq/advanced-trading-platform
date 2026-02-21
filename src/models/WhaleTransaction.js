
/**
 * WhaleTransaction Model
 * Represents a significant on-chain transaction (> $1M or > 10 BTC)
 * indicating potential institutional accumulation or distribution.
 */
export class WhaleTransaction {
    /**
     * @param {string} txHash - Transaction Hash
     * @param {string} symbol - 'BTC', 'ETH', 'USDT'
     * @param {number} amount - quantity
     * @param {number} valueUsd - value in USD
     * @param {string} fromType - 'EXCHANGE', 'WALLET', 'MINER'
     * @param {string} toType - 'EXCHANGE', 'WALLET', 'BURN'
     * @param {number} timestamp - unix timestamp
     */
    constructor(txHash, symbol, amount, valueUsd, fromType, toType, timestamp) {
        this.txHash = txHash;
        this.symbol = symbol;
        this.amount = amount;
        this.valueUsd = valueUsd;
        this.fromType = fromType;
        this.toType = toType;
        this.timestamp = timestamp;

        this.impact = this.calculateImpact();
        this.sentiment = this.calculateSentiment();
    }

    calculateImpact() {
        if (this.valueUsd > 100_000_000) return 'MEGA_WHALE'; // > $100M
        if (this.valueUsd > 10_000_000) return 'HIGH';        // > $10M
        if (this.valueUsd > 1_000_000) return 'MEDIUM';       // > $1M
        return 'LOW';
    }

    calculateSentiment() {
        // Exchange Inflow = Sell Pressure (Bearish)
        if (this.toType === 'EXCHANGE' && this.fromType !== 'EXCHANGE') return 'BEARISH';

        // Exchange Outflow = Accumulation (Bullish)
        if (this.fromType === 'EXCHANGE' && this.toType === 'WALLET') return 'BULLISH';

        return 'NEUTRAL';
    }
}
