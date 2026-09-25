import { correlationEngine } from './correlationEngine.js';

/**
 * Portfolio Risk Service (Phase 40)
 * Aggregates risk across multiple assets and implements dynamic drawdown protection.
 */
export class PortfolioRiskService {
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
     * Calculate Recommended Position Size (Institutional Model)
     * Uses Equity, Risk%, and Stop Loss distance to determine exact unit size.
     * @param {number} riskPercentage - % of equity to risk (e.g., 0.01 for 1%)
     * @param {number} entryPrice - Entry
     * @param {number} stopLossPrice - Stop Loss
     * @param {number} equity - Account Equity (optional, uses internal state if null)
     * @returns {Object} Sizing details
     */
    calculatePositionSize(riskPercentage, entryPrice, stopLossPrice, equity = null) {
        const accountEquity = equity || this.currentEquity;

        // 1. Determine Risk Amount (in $)
        // Apply dynamic risk multiplier based on drawdown (Phase 40 logic)
        const volatilityScaler = this.getRiskMultiplier();
        const effectiveRiskPct = riskPercentage * volatilityScaler;
        const riskAmount = accountEquity * effectiveRiskPct;

        // 2. Calculate Stop Distance
        const stopDistanceStr = Math.abs(entryPrice - stopLossPrice);
        const stopDistance = stopDistanceStr === 0 ? entryPrice * 0.01 : stopDistanceStr; // Safety: avoid divide by zero

        // 3. Calculate Units
        // Risk = Units * StopDistance  =>  Units = Risk / StopDistance
        let units = riskAmount / stopDistance;

        // 4. Formatting / Rounding (simplified)
        units = parseFloat(units.toPrecision(6));

        return {
            units,
            riskAmount,
            effectiveRiskPct: parseFloat((effectiveRiskPct * 100).toFixed(2)),
            leverage: (units * entryPrice) / accountEquity, // Implied leverage
            isSafe: true
        };
    }

    /**
     * Check for risk concentration using Real-Time Correlation Matrix
     * @param {string} newSymbol - The symbol being analyzed
     * @returns {Promise<Object>} Risk assessment
     */
    async checkConcentrationRisk(newSymbol) {
        // Collect all active symbols + new one
        const portfolioSymbols = this.openPositions.map(p => p.symbol);

        // If portfolio is empty, no correlation risk
        if (portfolioSymbols.length === 0) return { risky: false, correlation: 0 };

        const analysisSet = [...new Set([...portfolioSymbols, newSymbol])];

        // Generate Real-Time Matrix
        const matrix = await correlationEngine.generateCorrelationMatrix(analysisSet, '4h');

        // Calculate average correlation of newSymbol to existing portfolio
        let totalCorr = 0;
        let count = 0;
        const maxCorr = { symbol: '', val: -1 };

        portfolioSymbols.forEach(existing => {
            if (existing === newSymbol) return;
            const corr = matrix[newSymbol] ? matrix[newSymbol][existing] : 0;
            totalCorr += corr;
            count++;

            if (corr > maxCorr.val) {
                maxCorr.val = corr;
                maxCorr.symbol = existing;
            }
        });

        const avgCorr = count > 0 ? totalCorr / count : 0;

        // Risk Thresholds (Institutional Standard)
        // > 0.7 = High Concentration
        // > 0.85 = Critical Overlap
        if (avgCorr > 0.7) {
            return {
                risky: true,
                reason: `High Portfolio Correlation (${avgCorr.toFixed(2)}). Highly correlated with ${maxCorr.symbol} (${maxCorr.val}).`,
                metrics: { avgCorr, maxCorr }
            };
        }

        return {
            risky: false,
            metrics: { avgCorr, maxCorr }
        };
    }

    /**
     * validateTrade: The Gatekeeper (Phase 17)
     * Performs all risk checks before a trade is approved.
     */
    async validateTrade(setup) {
        const { symbol, entry, stopLoss } = setup;

        // 1. Correlation/Concentration Check
        const concentration = await this.checkConcentrationRisk(symbol);
        if (concentration.risky) {
            return {
                approved: false,
                reason: concentration.reason,
                code: 'RISK_CORRELATION',
                adjustment: 'REJECT'
            };
        }

        // 2. Position Sizing Check
        const sizing = this.calculatePositionSize(0.01, entry, stopLoss); // Default 1% risk

        // Cap max leverage (e.g., 5x for safety)
        if (sizing.leverage > 5) {
            return {
                approved: false,
                reason: `Leverage too high (${sizing.leverage.toFixed(1)}x) for defined stop loss.`,
                code: 'RISK_LEVERAGE',
                adjustment: 'REDUCE_SIZE'
            };
        }

        return {
            approved: true,
            sizing,
            warnings: []
        };
    }

    // Legacy methods kept for compatibility...
    getAssetSector(symbol) { return 'CRYPTO'; }
    calculateNetDirectionalBias() { return 0; }
    calculateCurrencyConcentration() { return {}; }
    getHedgeSuggestions() { return []; }
    syncPositions(positions) { this.openPositions = positions; }
    calculateRebalancingActions(recentAnalyses) { return []; }
}

export const portfolioRiskService = new PortfolioRiskService();
