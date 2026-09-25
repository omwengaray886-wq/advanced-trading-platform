/**
 * Probabilistic Risk Engine (Alpha Expansion Phase 3)
 * 
 * Runs Monte Carlo simulations to calculate the "Risk of Ruin"
 * (probability of hitting Stop Loss before Take Profit) based on 
 * historical volatility (ATR) and statistical price paths.
 */
export class ProbabilisticRiskEngine {
    /**
     * Run Monte Carlo Simulation for a trade setup
     * @param {Object} setup - Trade setup (direction, entry, stopLoss, targets)
     * @param {number} atr - Average True Range (Volatility)
     * @param {number} iterations - Number of simulated paths
     */
    runMonteCarlo(setup, atr, iterations = 1000) {
        if (!setup || !setup.entryZone || !setup.stopLoss || !setup.targets || setup.targets.length === 0) {
            return { ruinProbability: 0, safetyScore: 100, medianPnl: 0 };
        }

        const entry = setup.entryZone.optimal;
        const sl = setup.stopLoss;
        const tp = setup.targets[0].price;
        const direction = setup.direction === 'LONG' ? 1 : -1;

        const risk = Math.abs(entry - sl);
        const reward = Math.abs(tp - entry);

        // Simulating Geometric Brownian Motion (simplified for speed)
        // Price change per "step" is based on ATR / 4 (assume 4 steps per candle-equivalent)
        const stepVol = atr / 4;
        const maxSteps = 48; // Max "time" to hold before cutting simulation

        let hitTP = 0;
        let hitSL = 0;
        let neutral = 0;
        const finalPrices = [];

        for (let i = 0; i < iterations; i++) {
            let currentPrice = entry;
            let outcome = 'NEUTRAL';

            for (let step = 0; step < maxSteps; step++) {
                // Random walk step: Normal distribution approximation
                const rand = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / 1.5;
                const change = rand * stepVol;
                currentPrice += change;

                // Check outcomes
                if (direction === 1) { // LONG
                    if (currentPrice >= tp) { outcome = 'TP'; break; }
                    if (currentPrice <= sl) { outcome = 'SL'; break; }
                } else { // SHORT
                    if (currentPrice <= tp) { outcome = 'TP'; break; }
                    if (currentPrice >= sl) { outcome = 'SL'; break; }
                }
            }

            if (outcome === 'TP') hitTP++;
            else if (outcome === 'SL') hitSL++;
            else neutral++;

            finalPrices.push(currentPrice);
        }

        const ruinProbability = (hitSL / iterations) * 100;
        const successProbability = (hitTP / iterations) * 100;

        // Safety score: High success, low ruin
        const safetyScore = Math.max(0, Math.min(100, (successProbability * 1.5) - (ruinProbability * 0.5)));

        return {
            ruinProbability: parseFloat(ruinProbability.toFixed(2)),
            successProbability: parseFloat(successProbability.toFixed(2)),
            neutralProbability: parseFloat(((neutral / iterations) * 100).toFixed(2)),
            safetyScore: Math.round(safetyScore),
            iterations
        };
    }

    /**
     * Calculate Value at Risk (VaR) for a specific setup
     */
    calculateSetupVaR(setup, accountSize = 10000) {
        if (!setup || !setup.entryZone || !setup.stopLoss) return 0;
        const riskPerUnit = Math.abs(setup.entryZone.optimal - setup.stopLoss);
        const size = setup.sizeInUnits || 0;
        return (riskPerUnit * size); // Direct dollar risk
    }
}

export const probabilisticRiskEngine = new ProbabilisticRiskEngine();
