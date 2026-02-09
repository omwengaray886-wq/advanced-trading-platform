import { portfolioRiskService } from './portfolioRiskService';

/**
 * Risk Management Service (Phase 38)
 * Handles account-wide risk parameters and position sizing.
 */
class RiskManagementService {
    constructor() {
        this.maxDailyLoss = 1000; // $1,000 max daily loss
        this.riskPerTrade = 0.01; // 1% default
        this.maxOpenRisk = 0.05; // 5% total account risk
        this.maxDrawdown = 0.00; // Tracked MDD
    }

    /**
     * Calculate position size based on equity and stop distance
     * @param {number} equity - Current account balance
     * @param {number} entryPrice - Entry level
     * @param {number} stopPrice - Stop loss level
     * @param {string} symbol - Trading pair
     * @param {number} strategyWeight - Optional multiplier from performance tracking (0.6 to 1.4)
     */
    calculatePositionSize(equity, entryPrice, stopPrice, symbol, strategyWeight = 1.0) {
        if (!entryPrice || !stopPrice || entryPrice === stopPrice) return 0;

        // 1. Portfolio Multiplier (Phase 40)
        const portfolioMultiplier = portfolioRiskService.getRiskMultiplier();

        // 2. Strategy Weight (Phase 2 Accuracy)
        // Scale risk based on historical win rate of this strategy
        const finalRiskMultiplier = portfolioMultiplier * strategyWeight;
        const adjustedRisk = this.riskPerTrade * finalRiskMultiplier;

        const riskAmount = equity * adjustedRisk;
        const stopDistance = Math.abs(entryPrice - stopPrice);

        if (stopDistance === 0) return 0;

        // 1. Crypto / Stablecoin Logic (Units)
        if (symbol.includes('USDT') || symbol.includes('USD')) {
            const units = riskAmount / stopDistance;
            return parseFloat(units.toFixed(4));
        }

        // 2. Forex Logic (Pips & Lots)
        const isJpy = symbol.includes('JPY');
        const pipValue = isJpy ? 0.01 : 0.0001;
        const pipsAtRisk = stopDistance / pipValue;

        // $10 per lot for 1 pip move on 100k standard lot (Standardized)
        // riskAmount = Lots * Pips * PipValue_Cash
        // Lots = riskAmount / (Pips * 10)
        const lots = riskAmount / (pipsAtRisk * 10);
        return parseFloat(lots.toFixed(2));
    }

    /**
     * Advanced: Kelly Criterion Sizing
     * @param {number} winRate - 0.0 to 1.0
     * @param {number} rrRatio - Reward to Risk Ratio
     */
    calculateKellySize(winRate, rrRatio) {
        if (rrRatio <= 0) return 0;
        const kelly = winRate - ((1 - winRate) / rrRatio);
        return Math.max(0, kelly * 0.5); // Half-Kelly for institutional safety
    }

    /**
     * Check if a trade violates safety limits
     * @param {number} currentLoss - Today's realized loss
     * @param {number} pendingRisk - Potential risk of this trade
     * @param {number} currentOpenRisk - Current total open risk
     */
    validateTradeGuard(currentLoss, pendingRisk, currentOpenRisk) {
        if (currentLoss >= this.maxDailyLoss) {
            return { valid: false, reason: `Daily Loss Limit ($${this.maxDailyLoss}) reach.` };
        }

        if (currentOpenRisk + pendingRisk > this.maxOpenRisk) {
            return { valid: false, reason: 'Max Open Risk (5%) exceeded.' };
        }

        return { valid: true };
    }

    /**
     * Get updated risk settings
     */
    getSettings() {
        return {
            maxDailyLoss: this.maxDailyLoss,
            riskPerTrade: this.riskPerTrade,
            maxOpenRisk: this.maxOpenRisk,
            maxDrawdown: this.maxDrawdown
        };
    }
}

export const riskManagementService = new RiskManagementService();
