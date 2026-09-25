/**
 * Macro Bias Engine (Alpha Expansion Phase 2)
 * 
 * Provides "Veto" or "Boost" logic for trade setups based on intermarket
 * correlations (DXY, Yields, Indices).
 */
export class MacroBiasEngine {
    constructor() {
        // Assets that act as leading indicators for different classes
        this.leaders = {
            'CRYPTO': ['DXY', 'US10Y', 'NDX'],
            'FOREX': ['DXY', 'US10Y'],
            'METALS': ['DXY', 'US10Y', 'GLD']
        };
    }

    /**
     * Calculate a Macro Health score for a given asset class
     * @param {string} assetClass - CRYPTO, FOREX, METALS, etc.
     * @param {Object} macroData - Current state of DXY, Yields, etc.
     */
    calculateMacroBias(assetClass, macroData) {
        if (!macroData) return { score: 0.5, bias: 'NEUTRAL', action: 'NONE' };

        let totalScore = 0;
        let weightSum = 0;

        const dxy = macroData.DXY; // US Dollar Index
        const yields = macroData.US10Y; // 10-Year Treasury Yields
        const equity = macroData.NDX || macroData.SPX; // Tech Index / Equity

        if (assetClass === 'CRYPTO') {
            // Crypto is INVERSELY correlated to DXY and Yields, POSITIVELY to NDX
            if (dxy) {
                totalScore += (dxy.trend === 'BULLISH' ? -0.4 : 0.4);
                weightSum += 0.4;
            }
            if (yields) {
                totalScore += (yields.trend === 'BULLISH' ? -0.3 : 0.3);
                weightSum += 0.3;
            }
            if (equity) {
                totalScore += (equity.trend === 'BULLISH' ? 0.3 : -0.3);
                weightSum += 0.3;
            }
        } else if (assetClass === 'FOREX') {
            // Forex logic is more complex, but generally USD strength is lead by DXY
            if (dxy) {
                totalScore += (dxy.trend === 'BULLISH' ? 0.6 : -0.6);
                weightSum += 0.6;
            }
            if (yields) {
                totalScore += (yields.trend === 'BULLISH' ? 0.4 : -0.4);
                weightSum += 0.4;
            }
        }

        const score = weightSum > 0 ? totalScore / weightSum : 0;
        let bias = 'NEUTRAL';
        if (score >= 0.3) bias = 'BULLISH';
        else if (score <= -0.3) bias = 'BEARISH';

        return {
            score: parseFloat(score.toFixed(2)),
            bias: bias,
            action: this._determineAction(score),
            reason: this._generateReason(assetClass, macroData)
        };
    }

    /**
     * Determine if a setup should be Vetoed or Boosted
     * @param {Object} setup - Trade setup
     * @param {Object} macroBias - Result from calculateMacroBias
     */
    applyVeto(setup, macroBias) {
        if (macroBias.action === 'VETO') {
            if (setup.direction === 'LONG' && macroBias.bias === 'BEARISH') {
                setup.suitability *= 0.2; // Dramatic reduction
                setup.rationale = `[MACRO VETO] DXY/Yields are Bullish. Longs are high-risk. ${setup.rationale}`;
            } else if (setup.direction === 'SHORT' && macroBias.bias === 'BULLISH') {
                setup.suitability *= 0.2;
                setup.rationale = `[MACRO VETO] Macro conditions favor strength. Shorts are high-risk. ${setup.rationale}`;
            }
        } else if (macroBias.action === 'BOOST') {
            if (setup.direction === macroBias.bias) {
                setup.suitability *= 1.3; // Boost conviction
                setup.rationale = `[MACRO BOOST] Aligned with ${macroBias.bias} intermarket bias. ${setup.rationale}`;
            }
        }
    }

    _determineAction(score) {
        if (Math.abs(score) >= 0.6) return 'VETO';
        if (Math.abs(score) >= 0.25) return 'BOOST';
        return 'NONE';
    }

    _generateReason(assetClass, macroData) {
        const triggers = [];
        if (macroData.DXY?.trend === 'BULLISH') triggers.push('DXY Strength');
        if (macroData.US10Y?.trend === 'BULLISH') triggers.push('Yield Surge');
        return triggers.length > 0 ? `Macro headwinds: ${triggers.join(', ')}` : 'Stable Macro Environment';
    }
}

export const macroBiasEngine = new MacroBiasEngine();
