/**
 * Monte Carlo Risk Simulator
 * Runs thousands of simulations to model range of probable outcomes
 */

export class MonteCarloService {
    /**
     * Run simulation based on strategy stats
     * @param {Object} stats - { winRate, avgWin, avgLoss, totalTrades }
     * @param {number} iterations - Number of simulations paths (default 1000)
     * @param {number} horizon - Number of trades in the future (default 50)
     * @param {number} startingBalance - Initial account balance
     */
    runSimulation(stats, iterations = 1000, horizon = 50, startingBalance = 10000) {
        const paths = [];
        let ruinCount = 0;
        const finalBalances = [];
        const winPercent = stats.winRate / 100;

        for (let i = 0; i < iterations; i++) {
            const path = [startingBalance];
            let currentBalance = startingBalance;
            let ruined = false;

            for (let j = 0; j < horizon; j++) {
                const isWin = Math.random() < winPercent;
                // We use 1% risk-per-trade model as baseline
                const riskAmount = currentBalance * 0.01;

                if (isWin) {
                    // Winning trade: apply win multiplier (using Profit Factor / WinRate logic or fixed RR)
                    // For simulation, we simplify using the provided average win/loss or Profit Factor
                    currentBalance += riskAmount * (stats.profitFactor || 2);
                } else {
                    currentBalance -= riskAmount;
                }

                path.push(currentBalance);

                // Margin Call / Ruin condition: balance drops below 50% of starting
                if (currentBalance < startingBalance * 0.5) {
                    ruined = true;
                }
            }

            paths.push(path);
            finalBalances.push(currentBalance);
            if (ruined) ruinCount++;
        }

        // Statistical Analysis
        finalBalances.sort((a, b) => a - b);

        return {
            paths: paths.slice(0, 50), // Return only first 50 paths for visualization performance
            riskOfRuin: (ruinCount / iterations * 100).toFixed(2),
            percentiles: {
                p10: finalBalances[Math.floor(iterations * 0.1)],
                p50: finalBalances[Math.floor(iterations * 0.5)],
                p90: finalBalances[Math.floor(iterations * 0.9)],
                max: finalBalances[iterations - 1],
                min: finalBalances[0]
            },
            averageFinalBalance: finalBalances.reduce((a, b) => a + b, 0) / iterations
        };
    }
}

export const monteCarloService = new MonteCarloService();
