import { marketData } from './marketData';

export class CorrelationService {
    /**
     * Calculate Pearson correlation coefficient between two sets of prices
     * @param {Array<number>} x 
     * @param {Array<number>} y 
     * @returns {number} - Correlation coefficient (-1 to 1)
     */
    calculatePearson(x, y) {
        const n = Math.min(x.length, y.length);
        if (n < 2) return 0;

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (let i = 0; i < n; i++) {
            sumX += x[i];
            sumY += y[i];
            sumXY += x[i] * y[i];
            sumX2 += x[i] * x[i];
            sumY2 += y[i] * y[i];
        }

        const numerator = (n * sumXY) - (sumX * sumY);
        const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

        if (denominator === 0) return 0;
        return numerator / denominator;
    }

    /**
     * Get correlation matrix for a list of symbols
     * @param {Array<string>} symbols 
     * @param {string} interval 
     * @returns {Promise<Object>} - Matrix object
     */
    async getMatrix(symbols, interval = '1h') {
        const dataMap = {};

        // 1. Fetch history for all symbols
        await Promise.all(symbols.map(async (symbol) => {
            const history = await marketData.fetchHistory(symbol, interval, 100);
            dataMap[symbol] = history.map(h => h.close);
        }));

        const matrix = {};

        // 2. Compute pairs
        for (const s1 of symbols) {
            matrix[s1] = {};
            for (const s2 of symbols) {
                if (s1 === s2) {
                    matrix[s1][s2] = 1;
                } else {
                    matrix[s1][s2] = this.calculatePearson(dataMap[s1], dataMap[s2]);
                }
            }
        }

        return matrix;
    }
}

export const correlationService = new CorrelationService();
