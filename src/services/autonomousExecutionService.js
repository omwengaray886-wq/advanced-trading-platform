import { exchangeService } from './exchangeService';
import { riskManagementService } from './riskManagementService';
import { portfolioRiskService } from './portfolioRiskService';
import { ExecutionHazardDetector } from '../analysis/ExecutionHazardDetector';

/**
 * Autonomous Execution Service (Phase 38)
 * Bridges analysis and exchange execution with atomic OCO flows.
 */
class AutonomousExecutionService {
    /**
     * Execute One-Click OCO Trade
     * @param {Object} setup - Analysis setup object
     * @param {Object} account - Account equity/balance
     * @param {Array} candles - Recent market data for hazard check
     */
    async executeOneClickTrade(setup, account, candles, prediction = null) {
        const { entryPrice, stopLoss, targets, symbol } = setup;
        const { PredictionTracker } = await import('./predictionTracker');

        // 1. Institutional Hazard Guard
        const hazards = ExecutionHazardDetector.detectHazards(candles, {}, { sessionBased: true, volatilityThreshold: 0.02 });
        const criticalHazards = hazards.filter(h => h.severity === 'HIGH' || h.type === 'SLIPPAGE_HAZARD');

        if (criticalHazards.length > 0) {
            throw new Error(`SAFETY LOCK: Execution blocked due to ${criticalHazards[0].message}`);
        }

        // 2. Portfolio Risk Concentration (Phase 40)
        const concentration = portfolioRiskService.checkConcentrationRisk(symbol, setup.direction);
        if (concentration.risky) {
            throw new Error(`PORTFOLIO GUARD: ${concentration.reason}`);
        }

        // 3. Prediction Edge Guard (Phase 52)
        if (prediction) {
            if (prediction.bias.startsWith('WAIT') || prediction.bias === 'NO_EDGE') {
                throw new Error(`SYSTEM HALT: Execution blocked by v2 logic (${prediction.bias})`);
            }
            if (prediction.edgeScore < 7.0) {
                throw new Error(`EDGE GUARD: Edge Score (${prediction.edgeScore}) is below trust-grade threshold (7.0)`);
            }
        }

        // 2. Automated Sizing
        const quantity = riskManagementService.calculatePositionSize(
            account.equity,
            entryPrice,
            stopLoss,
            symbol
        );

        if (quantity <= 0) throw new Error('QUANTITY CALC_ERR: Check stop-loss distance.');

        // 3. Placing Atomic OCO Order
        // Note: Real OCO depends on exchange API. Here we sequentialize or batch.
        console.log(`[EXECUTION] Initiating OCO for ${symbol} | Size: ${quantity}`);

        try {
            // Main Entry
            const entryOrder = await exchangeService.placeOrder({
                symbol,
                side: setup.direction === 'LONG' ? 'BUY' : 'SELL',
                type: 'LIMIT',
                quantity,
                price: entryPrice
            });

            // Linked Protective SL
            await exchangeService.placeOrder({
                symbol,
                side: setup.direction === 'LONG' ? 'SELL' : 'BUY',
                type: 'STOP_LOSS_LIMIT',
                quantity,
                stopPrice: stopLoss,
                price: stopLoss * 0.99 // Slight offset for fill
            });

            // Linked Take Profit (Target 1)
            if (targets && targets.length > 0) {
                await exchangeService.placeOrder({
                    symbol,
                    side: setup.direction === 'LONG' ? 'SELL' : 'BUY',
                    type: 'LIMIT',
                    quantity: quantity * 0.5, // partial exit
                    price: targets[0].price
                });
            }

            // 6. Log Execution back to Tracker (Phase 51 Audit)
            if (prediction && prediction.id) {
                console.log(`[EXECUTION] Linking trade to Prediction Receipt: ${prediction.id}`);
                // In a real system, we'd update the Firestore doc with entryOrder.id
            }

            return { success: true, entryId: entryOrder.id };
        } catch (err) {
            console.error('[EXECUTION FAILURE]', err);
            throw err;
        }
    }

    /**
     * Trailing Stop Manager
     * Monitoring loop to move SL to breakeven
     */
    monitorTrade(currentPrice, entryPrice, targetPrice, currentSL) {
        // Simple logic: if price reached Target 1, move SL to Entry
        const isBullish = targetPrice > entryPrice;

        if (isBullish && currentPrice >= targetPrice) {
            return entryPrice; // New SL
        } else if (!isBullish && currentPrice <= targetPrice) {
            return entryPrice; // New SL
        }

        return currentSL;
    }
}

export const autonomousExecutionService = new AutonomousExecutionService();
