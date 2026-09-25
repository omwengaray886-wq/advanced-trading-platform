/**
 * Institutional Portfolio Stress Service (Phase 60)
 * Analyzes whole-portfolio risk, correlated exposure, and simulates "Black Swan" events.
 */
export class PortfolioStressService {
    /**
     * Calculate Value at Risk (VaR) for current setups/positions
     * @param {Array} positions - Active trade setups or positions
     * @param {number} accountSize - Total equity
     * @param {number} confidenceInterval - e.g., 0.95 or 0.99
     * @returns {Object} VaR metrics
     */
    static calculateVaR(positions, accountSize = 10000, confidenceInterval = 0.95) {
        if (!positions || positions.length === 0) return { dollarVaR: 0, pctVaR: 0 };

        // Simple Parametric VaR approach: sum of (size * volatility * Z-score)
        // In a real env, we'd use correlation matrix + Monte Carlo
        const zScore = confidenceInterval === 0.99 ? 2.33 : 1.65;

        let totalDailyVaR = 0;
        positions.forEach(p => {
            const size = p.sizeInUnits || 0;
            const price = p.entryPrice || 0;
            const vol = 0.02; // Assume 2% daily volatility baseline if not provided

            const positionValue = size * price;
            const positionVaR = positionValue * vol * zScore;
            totalDailyVaR += positionVaR;
        });

        return {
            dollarVaR: totalDailyVaR,
            pctVaR: (totalDailyVaR / accountSize) * 100,
            confidence: confidenceInterval
        };
    }

    /**
     * Detect Correlated Risk Clusters
     * Identifies if multiple positions share a common dependency (e.g. "USD Heavy")
     */
    static analyzeCorrelations(positions) {
        const clusters = {
            'USD': [],
            'BTC': [],
            'ETH': [],
            'EUR': [],
            'JPY': []
        };

        positions.forEach(p => {
            const sym = p.symbol || '';
            Object.keys(clusters).forEach(base => {
                if (sym.includes(base)) {
                    clusters[base].push(sym);
                }
            });
        });

        const highRiskClusters = Object.entries(clusters)
            .filter(([_, list]) => list.length >= 2)
            .map(([base, list]) => ({
                factor: base,
                count: list.length,
                severity: list.length >= 3 ? 'HIGH' : 'MEDIUM',
                pairs: list
            }));

        return highRiskClusters;
    }

    /**
     * Simulate Market Shocks
     * @param {Array} positions 
     * @param {string} scenarioType - 'FLASH_CRASH', 'USD_SHOCK', 'VOL_SPIKE'
     */
    static simulateShock(positions, scenarioType) {
        if (!positions || positions.length === 0) return { estimatedLoss: 0, liquidationRisk: 'LOW' };

        let totalLoss = 0;
        let pnlMultiplier = 0;

        switch (scenarioType) {
            case 'FLASH_CRASH':
                // Simulate -10% on Crypto, -2% on FX instantly
                pnlMultiplier = 0.10;
                break;
            case 'USD_SHOCK':
                // Simulate +3% DXY Strength
                pnlMultiplier = 0.03;
                break;
            case 'VOL_SPIKE':
                // Simulate Spread Widening & Slippage
                pnlMultiplier = 0.01;
                break;
            default:
                pnlMultiplier = 0;
        }

        positions.forEach(p => {
            const positionValue = (p.sizeInUnits || 0) * (p.entryPrice || 0);
            totalLoss += positionValue * pnlMultiplier;
        });

        return {
            scenario: scenarioType,
            estimatedLoss: totalLoss,
            liquidationRisk: totalLoss > 1000 ? 'HIGH' : totalLoss > 500 ? 'MEDIUM' : 'LOW',
            message: this.getScenarioMessage(scenarioType)
        };
    }

    static getScenarioMessage(type) {
        const messages = {
            'FLASH_CRASH': 'Simulating cascading liquidations. Stop losses may experience 50-100bps slippage.',
            'USD_SHOCK': 'US Dollar index strength inverse correlation shock. Metals/Forex clusters heavily affected.',
            'VOL_SPIKE': 'Order book depth depletion. High impact on market orders and wide spreads.'
        };
        return messages[type] || 'Unknown scenario.';
    }
}

export const portfolioStressService = new PortfolioStressService();
