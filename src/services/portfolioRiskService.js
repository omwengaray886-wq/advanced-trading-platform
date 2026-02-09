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
     * Calculate exposure per currency (USD, EUR, GBP, etc.)
     */
    calculateCurrencyConcentration() {
        const concentrations = {};
        const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'BTC', 'ETH'];

        this.openPositions.forEach(pos => {
            currencies.forEach(cur => {
                if (pos.symbol.includes(cur)) {
                    if (!concentrations[cur]) concentrations[cur] = { long: 0, short: 0, total: 0 };

                    // Logic: EUR/USD Long = EUR Long, USD Short
                    const [base, quote] = pos.symbol.split('/');
                    if (base === cur) {
                        if (pos.direction === 'LONG') concentrations[cur].long++;
                        else concentrations[cur].short++;
                    } else if (quote === cur) {
                        if (pos.direction === 'LONG') concentrations[cur].short++; // Long EUR/USD = Short USD
                        else concentrations[cur].long++;
                    }
                    concentrations[cur].total++;
                }
            });
        });

        return concentrations;
    }

    /**
     * Suggest hedges based on high concentration
     */
    getHedgeSuggestions() {
        const concentrations = this.calculateCurrencyConcentration();
        const suggestions = [];

        Object.entries(concentrations).forEach(([cur, stats]) => {
            const net = stats.long - stats.short;
            if (Math.abs(net) >= 3) {
                suggestions.push({
                    currency: cur,
                    type: net > 0 ? 'SHORT_CONCENTRATION' : 'LONG_CONCENTRATION',
                    severity: Math.abs(net) >= 5 ? 'CRITICAL' : 'WARNING',
                    recommendation: net > 0 ? `Consider hedging ${cur} exposure with a Short setup.` : `Consider hedging ${cur} exposure with a Long setup.`
                });
            }
        });

        return suggestions;
    }

    /**
     * Sync open positions from exchange/wallet
     */
    syncPositions(positions) {
        this.openPositions = positions;
    }

    /**
     * Phase 7: Automatic Portfolio Rebalancing Logic
     * Evaluates open positions and suggests actions based on alpha decay or growth.
     * @param {Map} recentAnalyses - Map of symbol -> analysis object
     */
    calculateRebalancingActions(recentAnalyses) {
        const actions = [];

        this.openPositions.forEach(pos => {
            const analysis = recentAnalyses.get(pos.symbol);
            if (!analysis) return;

            const currentScore = analysis.quantScore || 50;
            const entryScore = pos.entryQuantScore || 60; // Assume 60 if missing

            // 1. Alpha Decay (Trim/Exit)
            if (currentScore < entryScore * 0.7) {
                actions.push({
                    symbol: pos.symbol,
                    action: currentScore < 30 ? 'EXIT' : 'TRIM',
                    reason: `Alpha decay detected. QuantScore dropped from ${entryScore} to ${currentScore}.`,
                    strength: (entryScore - currentScore) / entryScore
                });
            }

            // 2. Alpha Growth (Scale In)
            // If new institutional confirmation (Dark Pool or Wall) appears
            const hasNewWall = analysis.marketState?.orderBookDepth?.pressure === (pos.direction === 'LONG' ? 'BULLISH' : 'BEARISH');
            const hasDarkPool = (analysis.marketState?.darkPools || []).some(p =>
                (pos.direction === 'LONG' && p.price <= analysis.marketState.currentPrice) ||
                (pos.direction === 'SHORT' && p.price >= analysis.marketState.currentPrice)
            );

            if (currentScore > entryScore * 1.2 && (hasNewWall || hasDarkPool)) {
                actions.push({
                    symbol: pos.symbol,
                    action: 'SCALE_IN',
                    reason: 'Alpha growth: New institutional walls/sentiment supporting the trend.',
                    strength: (currentScore - entryScore) / entryScore
                });
            }
        });

        return actions.sort((a, b) => b.strength - a.strength);
    }
}

export const portfolioRiskService = new PortfolioRiskService();
