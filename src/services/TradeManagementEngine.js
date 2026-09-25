/**
 * Trade Management Engine (Phase 2)
 * 
 * Handles Post-Entry logic:
 * - Dynamic Position Sizing (Risk-adjusted)
 * - Trailing Stop Recommendations (Technical & Volatility based)
 * - Partial Take Profit triggers (Momentum exhaustion)
 */
export class TradeManagementEngine {

    /**
     * Calculate Risk-Adjusted Position Size
     * @param {Object} account - { equity, riskPerTrade }
     * @param {number} entryPrice 
     * @param {number} stopLoss 
     * @param {Object} context - { volatility, eventRisk, confidence }
     */
    static calculateDynamicRisk(account, entryPrice, stopLoss, context) {
        // Base Risk (e.g., 1%)
        let riskPercent = account.riskPerTrade || 0.01;

        // 1. Confidence Scaling
        if (context.confidence) {
            riskPercent *= context.confidence; // 0.8 to 1.2
        }

        // 2. Volatility Adjustment (Reduce risk in high vol)
        if (context.volatility && context.volatility > 2.0) {
            riskPercent *= 0.7; // 30% reduction for high vol
        }

        // 3. Event Risk Penalty (from CorrelationEngine)
        if (context.eventRisk && context.eventRisk.score > 50) {
            // High event risk -> Cut size significantly
            const penalty = context.eventRisk.score / 100; // 0.5 to 1.0
            riskPercent *= (1 - (penalty * 0.5)); // Max 50% reduction
        }

        const riskAmount = account.equity * riskPercent;
        const dist = Math.abs(entryPrice - stopLoss);

        if (dist === 0) return 0;

        const units = riskAmount / dist;

        // Phase 75: Lot size warning for small accounts
        let warning = context.eventRisk && context.eventRisk.score > 50
            ? `Reduced size due to High Event Risk (${context.eventRisk.closestEvent?.title})`
            : null;

        if (account.equity < 500 && units < 0.01) {
            warning = "⚠️ Position too small for standard 0.01 lot size. Consider tighter SL or higher risk %.";
        }

        return {
            units: units,
            riskAmount: riskAmount,
            riskPercent: riskPercent,
            warning: warning
        };
    }

    /**
     * Phase 75: Calculate Capital Friendliness Score
     * Determines how suitable a setup is for accounts in the $100-$1000 range.
     * @param {Object} account - { equity }
     * @param {Object} setup - { entryZone, stopLoss }
     * @returns {Object} Score (0-100) and rationale
     */
    static calculateCapitalFriendliness(account, setup) {
        const equity = account?.equity || 10000;
        const entry = setup.entryZone?.optimal || setup.entry;
        const sl = setup.stopLoss;

        if (!entry || !sl || equity > 5000) return { score: 100, label: 'Institutional' };

        const riskPerUnit = Math.abs(entry - sl);
        const riskAtMinLot = riskPerUnit * 0.01; // Cost of 0.01 microlot
        const riskPercentAtMinLot = (riskAtMinLot / equity) * 100;

        let score = 100;
        const considerations = [];

        // 1. Microlot Capability (Most important for $100 accounts)
        if (riskPercentAtMinLot > 5.0) {
            score -= 60;
            considerations.push('High margin impact for 0.01 lot');
        } else if (riskPercentAtMinLot > 2.0) {
            score -= 30;
            considerations.push('Moderate margin pressure');
        } else {
            considerations.push('Perfect microlot fit');
        }

        // 2. SL Tightness (Relativity to price)
        const slPercent = (riskPerUnit / entry) * 100;
        if (slPercent > 2.0) {
            score -= 20;
            considerations.push('Loose SL requires high capital');
        }

        return {
            score: Math.max(0, score),
            riskAtMinLot: riskAtMinLot.toFixed(2),
            label: score > 80 ? 'Small Account Friendly' : score > 50 ? 'Moderate Capital Required' : 'High Capital Required',
            considerations
        };
    }

    /**
     * Get Smart Trailing Stop Advice
     * @param {Array} candles - Price history
     * @param {string} direction - LONG or SHORT
     * @param {number} currentStop - Current SL level
     */
    static getTrailingStopAdvice(candles, direction, currentStop) {
        if (!candles || candles.length < 20) return null;

        const lastPrice = candles[candles.length - 1].close;
        const atr = this._calculateATR(candles, 14);

        // Strategy 1: ATR Trailing (Chandelier Exit)
        const atrMultiple = 2.5;
        const atrStop = direction === 'LONG'
            ? lastPrice - (atr * atrMultiple)
            : lastPrice + (atr * atrMultiple);

        // Strategy 2: Structure Trailing (Recent Swing Low/High)
        const swings = this._findSwings(candles, 10);
        let structureStop = currentStop;

        if (direction === 'LONG') {
            // Find recent higher low
            const relevantSwings = swings.filter(s => s.type === 'LOW' && s.price > currentStop);
            if (relevantSwings.length > 0) structureStop = relevantSwings[relevantSwings.length - 1].price - (atr * 0.2);
        } else {
            // Find recent lower high
            const relevantSwings = swings.filter(s => s.type === 'HIGH' && s.price < currentStop);
            if (relevantSwings.length > 0) structureStop = relevantSwings[relevantSwings.length - 1].price + (atr * 0.2);
        }

        // Use the tighter of the two (locking in more profit), but never loosen the stop
        let newStop = direction === 'LONG' ? Math.max(atrStop, structureStop) : Math.min(atrStop, structureStop);

        // Validation: Never move stop AGAINST the trade (down for long, up for short)
        if (direction === 'LONG' && newStop < currentStop) newStop = currentStop;
        if (direction === 'SHORT' && newStop > currentStop) newStop = currentStop;

        return {
            price: newStop,
            type: newStop === structureStop ? 'STRUCTURE' : 'VOLATILITY',
            shouldUpdate: Math.abs(newStop - currentStop) > (atr * 0.1) // Only update if meaningful change
        };
    }

    /**
     * Check for Partial Take Profit conditions
     * Detects momentum exhaustion or resistance testing
     */
    static checkPartialTP(candles, direction, entryPrice) {
        const last = candles[candles.length - 1];
        const dist = Math.abs(last.close - entryPrice);

        // Min threshold: 1R (assuming 1R ~ 2 * ATR)
        const atr = this._calculateATR(candles, 14);
        if (dist < atr * 2) return null;

        // Check for Climax / Exhaustion (High vol, big wick against trend)
        const isClimax = last.volume > this._calculateAvgVol(candles) * 2.5;

        let wickRejection = false;
        if (direction === 'LONG') {
            const upperWick = last.high - Math.max(last.open, last.close);
            const body = Math.abs(last.close - last.open);
            if (upperWick > body * 1.5) wickRejection = true;
        } else {
            const lowerWick = Math.min(last.open, last.close) - last.low;
            const body = Math.abs(last.close - last.open);
            if (lowerWick > body * 1.5) wickRejection = true;
        }

        if (isClimax || wickRejection) {
            return {
                trigger: true,
                reason: isClimax ? 'Volume Climax' : 'Wick Rejection',
                recommendation: 'Take 30-50% off table'
            };
        }

        return null;
    }

    static _calculateATR(candles, period) {
        let sum = 0;
        for (let i = 1; i < Math.min(candles.length, period + 1); i++) {
            const c = candles[candles.length - i];
            const p = candles[candles.length - i - 1];
            sum += Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
        }
        return sum / period;
    }

    static _calculateAvgVol(candles) {
        const recent = candles.slice(-20);
        return recent.reduce((s, c) => s + c.volume, 0) / recent.length;
    }

    static _findSwings(candles, period) {
        const swings = [];
        for (let i = period; i < candles.length - period; i++) {
            const current = candles[i];
            const left = candles.slice(i - period, i);
            const right = candles.slice(i + 1, i + period + 1);

            const isHigh = left.every(c => c.high <= current.high) && right.every(c => c.high <= current.high);
            const isLow = left.every(c => c.low >= current.low) && right.every(c => c.low >= current.low);

            if (isHigh) swings.push({ type: 'HIGH', price: current.high, index: i });
            if (isLow) swings.push({ type: 'LOW', price: current.low, index: i });
        }
        return swings;
    }
}
