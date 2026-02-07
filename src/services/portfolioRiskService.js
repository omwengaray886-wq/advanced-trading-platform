import { correlationEngine } from './correlationEngine.js';

/**
 * Portfolio Risk Service (Phase 40)
 * Aggregates risk across multiple assets and implements dynamic drawdown protection.
 */
class PortfolioRiskService {
    constructor() {
        this.openPositions = []; // In-memory cache of open trades
        this.accountHistory = []; // Needed for drawdown calculation
        this.peakEquity = 10000;
        this.currentEquity = 10000;
        this.drawdownThreshold = 0.05; // 5%
    }

    /**
     * Update account state and check drawdown
     */
    updateAccountState(equity) {
        this.currentEquity = equity;
        if (equity > this.peakEquity) {
            this.peakEquity = equity;
        }

        const drawdown = (this.peakEquity - equity) / this.peakEquity;
        return {
            drawdown,
            isDefensive: drawdown >= this.drawdownThreshold
        };
    }

    /**
     * Get dynamic risk multiplier based on drawdown
     */
    getRiskMultiplier() {
        const { isDefensive, drawdown } = this.updateAccountState(this.currentEquity);
        if (drawdown > 0.10) return 0.25; // 10% drawdown -> 25% risk (Aggressive Cut)
        if (isDefensive) return 0.5;      // 5% drawdown -> 50% risk
        return 1.0;
    }

    /**
     * Check for risk concentration / correlation
     * @param {string} newSymbol - The symbol being analyzed
     * @param {string} direction - LONG / SHORT
     */
    checkConcentrationRisk(newSymbol, direction) {
        // 1. Sector Concentration
        const sector = this.getAssetSector(newSymbol);
        const sectorPositions = this.openPositions.filter(p => this.getAssetSector(p.symbol) === sector);

        if (sectorPositions.length >= 3) {
            return {
                risky: true,
                reason: `Max sector concentration (${sector}) reached.`
            };
        }

        // 2. Correlation Check (Simulated)
        // In reality, this would query a correlation matrix
        const netBias = this.calculateNetDirectionalBias();
        if (direction === 'LONG' && netBias > 3) {
            return {
                risky: true,
                reason: 'High Portfolio Beta: Too many active Long positions.'
            };
        }

        return { risky: false };
    }

    /**
     * Helper to map symbols to sectors
     */
    getAssetSector(symbol) {
        if (symbol.includes('USDT')) return 'CRYPTO';
        if (['EUR', 'GBP', 'JPY', 'AUD', 'USD', 'DXY'].some(c => symbol.includes(c))) return 'FOREX';
        return 'EQUITY';
    }

    /**
     * Calculate net directional bias (+1 for Long, -1 for Short)
     */
    calculateNetDirectionalBias() {
        return this.openPositions.reduce((acc, p) => acc + (p.direction === 'LONG' ? 1 : -1), 0);
    }

    /**
     * Sync open positions from exchange/wallet
     */
    syncPositions(positions) {
        this.openPositions = positions;
    }
}

export const portfolioRiskService = new PortfolioRiskService();
