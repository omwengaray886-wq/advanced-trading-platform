/**
 * Enhanced Risk Management System
 * Kelly Criterion, Portfolio Risk, Drawdown Tracking
 */

export class EnhancedRiskManager {
    constructor() {
        this.positions = new Map(); // Active positions tracker
        this.tradeHistory = []; // Historical trades for drawdown calculation
        this.maxHistoricalEquity = 0;
    }

    /**
     * Calculate optimal position size using Kelly Criterion
     * @param {Object} params - Risk parameters
     * @returns {Object} Position sizing recommendation
     */
    calculateKellyPosition(params) {
        const {
            equity,
            winRate, // 0.0 to 1.0
            avgWin, // Average win amount
            avgLoss, // Average loss amount (positive number)
            maxRiskPercent = 0.02, // Cap at 2% per trade
            kellyFraction = 0.25 // Use quarter-Kelly for safety
        } = params;

        // Kelly Formula: f* = (p*b - q) / b
        // where: p = win rate, q = 1-p, b = avg_win/avg_loss
        const p = winRate;
        const q = 1 - p;
        const b = avgWin / avgLoss;

        const kellyPercent = (p * b - q) / b;

        // Apply fraction and cap
        let optimalRiskPercent = Math.max(0, kellyPercent * kellyFraction);
        optimalRiskPercent = Math.min(optimalRiskPercent, maxRiskPercent);

        const riskAmount = equity * optimalRiskPercent;

        return {
            kellyPercent: kellyPercent * 100,
            fractionalKelly: optimalRiskPercent * 100,
            riskAmount,
            isOverLeveraged: kellyPercent < 0,
            recommendation: this.getKellyRecommendation(kellyPercent, optimalRiskPercent)
        };
    }

    /**
     * Get human-readable Kelly recommendation
     */
    getKellyRecommendation(kelly, fractional) {
        if (kelly < 0) return '❌ NEGATIVE EDGE - Do not trade this setup';
        if (fractional > 0.015) return '✅ Strong Edge - Full position';
        if (fractional > 0.008) return '⚠️ Moderate Edge - Reduced size';
        return '⚠️ Weak Edge - Minimal size or skip';
    }

    /**
     * Calculate portfolio-wide risk exposure
     * @param {Array} positions - Current open positions
     * @param {Object} correlationMatrix - Symbol correlation data
     * @returns {Object} Portfolio risk metrics
     */
    calculatePortfolioRisk(positions, correlationMatrix) {
        if (!positions || positions.length === 0) {
            return {
                totalExposure: 0,
                correlationRisk: 0,
                diversificationScore: 100,
                warnings: []
            };
        }

        let totalExposure = 0;
        let correlationRisk = 0;
        const warnings = [];

        // Calculate total exposure
        positions.forEach(pos => {
            totalExposure += Math.abs(pos.riskAmount || 0);
        });

        // Calculate correlation risk
        for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
                const sym1 = positions[i].symbol;
                const sym2 = positions[j].symbol;

                const correlation = correlationMatrix?.[sym1]?.[sym2] || 0;

                // High correlation (>0.7) on same-direction trades = compounded risk
                if (Math.abs(correlation) > 0.7 && positions[i].direction === positions[j].direction) {
                    correlationRisk += Math.abs(correlation) *
                        Math.min(positions[i].riskAmount, positions[j].riskAmount);

                    warnings.push({
                        type: 'HIGH_CORRELATION',
                        message: `${sym1} and ${sym2} are highly correlated (${(correlation * 100).toFixed(0)}%)`,
                        severity: 'HIGH'
                    });
                }
            }
        }

        // Diversification score (0-100, higher = more diversified)
        const uniqueAssetClasses = new Set(positions.map(p => this.getAssetClass(p.symbol))).size;
        const diversificationScore = Math.min(100, (uniqueAssetClasses / 5) * 100);

        if (diversificationScore < 40) {
            warnings.push({
                type: 'LOW_DIVERSIFICATION',
                message: `Portfolio concentrated in ${uniqueAssetClasses} asset class(es)`,
                severity: 'MEDIUM'
            });
        }

        return {
            totalExposure,
            correlationRisk,
            effectiveRisk: totalExposure + correlationRisk,
            diversificationScore,
            warnings
        };
    }

    /**
     * Track drawdown and generate warnings
     * @param {number} currentEquity - Current account equity
     * @returns {Object} Drawdown metrics
     */
    trackDrawdown(currentEquity) {
        // Update max historical equity
        if (currentEquity > this.maxHistoricalEquity) {
            this.maxHistoricalEquity = currentEquity;
        }

        const drawdown = this.maxHistoricalEquity > 0
            ? ((this.maxHistoricalEquity - currentEquity) / this.maxHistoricalEquity) * 100
            : 0;

        const warnings = [];

        if (drawdown > 15) {
            warnings.push({
                type: 'CRITICAL_DRAWDOWN',
                message: `STOP TRADING: Drawdown at ${drawdown.toFixed(1)}% (Max: 15%)`,
                severity: 'CRITICAL'
            });
        } else if (drawdown > 10) {
            warnings.push({
                type: 'HIGH_DRAWDOWN',
                message: `Reduce position sizes: Drawdown at ${drawdown.toFixed(1)}%`,
                severity: 'HIGH'
            });
        } else if (drawdown > 5) {
            warnings.push({
                type: 'MODERATE_DRAWDOWN',
                message: `Monitor closely: Drawdown at ${drawdown.toFixed(1)}%`,
                severity: 'MEDIUM'
            });
        }

        return {
            currentEquity,
            maxEquity: this.maxHistoricalEquity,
            drawdownPercent: drawdown,
            drawdownAmount: this.maxHistoricalEquity - currentEquity,
            warnings
        };
    }

    /**
     * Calculate risk-adjusted R:R ratio
     * @param {Object} setup - Trade setup
     * @param {Object} marketState - Current market conditions
     * @returns {Object} Adjusted R:R metrics
     */
    calculateAdjustedRR(setup, marketState) {
        const {
            entry,
            stopLoss,
            takeProfit,
            direction
        } = setup;

        // Base R:R
        const risk = Math.abs(entry - stopLoss);
        const reward = Math.abs(takeProfit - entry);
        const baseRR = reward / risk;

        // Volatility adjustment
        const volatilityMultiplier = this.getVolatilityMultiplier(marketState.volatility?.level);

        // Regime adjustment
        const regimeMultiplier = this.getRegimeMultiplier(marketState.regime);

        // Adjusted R:R
        const adjustedRR = baseRR * volatilityMultiplier * regimeMultiplier;

        return {
            baseRR: baseRR.toFixed(2),
            adjustedRR: adjustedRR.toFixed(2),
            volatilityAdjustment: volatilityMultiplier,
            regimeAdjustment: regimeMultiplier,
            isAcceptable: adjustedRR >= 2.0,
            recommendation: adjustedRR >= 3.0 ? 'Excellent R:R' :
                adjustedRR >= 2.0 ? 'Acceptable R:R' :
                    '⚠️ Poor R:R - Consider skipping'
        };
    }

    /**
     * Get volatility multiplier for R:R adjustment
     */
    getVolatilityMultiplier(volatilityLevel) {
        const multipliers = {
            'LOW': 1.1,      // Low vol = higher certainty
            'MEDIUM': 1.0,   // Normal
            'HIGH': 0.85,    // High vol = reduce expected R:R
            'EXTREME': 0.7   // Extreme vol = significantly reduce
        };
        return multipliers[volatilityLevel] || 1.0;
    }

    /**
     * Get regime multiplier for R:R adjustment
     */
    getRegimeMultiplier(regime) {
        const multipliers = {
            'TRENDING': 1.15,    // Trends follow through better
            'RANGING': 0.9,      // Ranges chop around
            'VOLATILE': 0.85,    // Volatile = unpredictable
            'BREAKOUT': 1.1      // Breakouts can run
        };
        return multipliers[regime] || 1.0;
    }

    /**
     * Get asset class from symbol
     */
    getAssetClass(symbol) {
        if (symbol.includes('BTC') || symbol.includes('ETH')) return 'CRYPTO';
        if (symbol.includes('USD') && symbol.length === 6) return 'FOREX';
        if (symbol.includes('XAU') || symbol.includes('XAG')) return 'METALS';
        if (symbol === 'SPX' || symbol === 'NDX') return 'INDICES';
        return 'OTHER';
    }
}

// Singleton instance
export const enhancedRiskManager = new EnhancedRiskManager();
