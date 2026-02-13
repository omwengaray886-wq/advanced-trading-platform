/**
 * Enhanced AI Service
 * Integrating explainable AI system with Google Gemini
 */

import { AnalysisOrchestrator } from './analysisOrchestrator.js';
import { ExplanationEngine } from './explanationEngine.js';
import { marketData } from './marketData.js';
import { AssetClassAdapter } from './assetClassAdapter.js';


const explanationEngine = new ExplanationEngine();
const AI_CACHE = new Map();
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate comprehensive trade analysis with explainable AI
 * @param {Array} chartData - Candlestick data
 * @param {string} symbol - Trading pair
 * @param {string} timeframe - Chart timeframe
 * @param {string} manualStrategyName - Optional manual strategy override
 * @returns {Object} - Complete analysis with annotations and explanations
 */
export async function generateTradeAnalysis(chartData, symbol, timeframe = '1H', manualStrategyName = null, mode = 'ADVANCED', onPartialResult = null, accountSize = 10000) {
    try {
        console.log(`Starting analysis for ${symbol} (${timeframe}) with ${chartData.length} candles...`);

        const buildResponse = (analysisObj, exp) => {
            const primarySetup = analysisObj.setups?.[0] || { strategy: 'N/A', direction: 'NEUTRAL', suitability: 0 };
            return {
                symbol,
                timeframe,
                timestamp: analysisObj.timestamp,
                marketState: analysisObj.marketState,
                selectedStrategy: primarySetup,
                setups: analysisObj.setups,
                annotations: analysisObj.annotations || [],
                explanation: exp,
                chatMessages: explanationEngine.toChatFormat(exp),
                riskParameters: analysisObj.riskParameters,
                confidence: analysisObj.overallConfidence,
                type: primarySetup.strategy,
                bias: primarySetup.direction,
                isPartial: !exp.isAiEnhanced,

                // Predictive Intelligence (Phase 50)
                prediction: analysisObj.prediction,
                probabilities: analysisObj.probabilities,
                pathProjection: analysisObj.pathProjection,
                regimeTransition: analysisObj.regimeTransition,
                trapZones: analysisObj.trapZones,
                dominantScenario: analysisObj.dominantScenario,
                dominantBias: analysisObj.dominantBias,
                liquidityMap: analysisObj.liquidityMap || [],
                performanceWeights: analysisObj.performanceWeights
            };

        };

        const orchestrator = new AnalysisOrchestrator();

        // Stage 0: Instant Pass (Phase 51 Optimization)
        // Provides real structural markings using only local data (~200ms)
        if (onPartialResult) {
            // isLight=true and mtfData=null
            const instantAnalysis = await orchestrator.analyze(chartData, symbol, timeframe, manualStrategyName, null, true, accountSize);
            const instantExplanation = explanationEngine.generateExplanation(instantAnalysis, mode);

            onPartialResult(buildResponse(instantAnalysis, instantExplanation));
        }

        // --- Stage 1 & 2 Setup ---
        const timeframes = orchestrator.determineContextTimeframes(timeframe);
        const contextTF = timeframes.contextTF; // e.g., '1h', '4h', '1w'

        // Fetch MTF data for Quant-Institutional confluence
        const mtfData = { h4: null, d1: null }; // Initialize with legacy keys for safety

        try {
            console.log(`Fetching Context Data: ${contextTF} for ${timeframe} analysis...`);

            // Fetch MTF data in parallel for speed
            const fetchTasks = [
                marketData.fetchHistory(symbol, contextTF.toLowerCase(), 100)
            ];

            // Add supplementary TFs if they aren't already covered by contextTF
            const neededTFs = [];
            if (contextTF.toLowerCase() !== '4h') neededTFs.push('4h');
            if (contextTF.toLowerCase() !== '1d') neededTFs.push('1d');

            neededTFs.forEach(tf => {
                fetchTasks.push(marketData.fetchHistory(symbol, tf, tf === '1d' ? 50 : 100));
            });

            const results = await Promise.all(fetchTasks);

            // Map results back to mtfData
            mtfData[contextTF.toLowerCase()] = results[0];
            neededTFs.forEach((tf, i) => {
                mtfData[tf] = results[i + 1];
            });

        } catch (fetchError) {
            console.warn('MTF data fetch failed (Quant logic disabled):', fetchError);
        }

        // Stage 1: Fast Deterministic Pass (Phase 40 Optimization)
        // This pass skips heavy external fetches (Divergences, Sentiment, etc.)
        const fastAnalysis = await orchestrator.analyze(chartData, symbol, timeframe, manualStrategyName, mtfData, true, accountSize);
        const fastExplanation = explanationEngine.generateExplanation(fastAnalysis, mode);

        if (onPartialResult) {
            onPartialResult(buildResponse(fastAnalysis, fastExplanation));
        }

        // Stage 2: Full Deep-Dive Pass (Enriched)
        const fullAnalysis = await orchestrator.analyze(chartData, symbol, timeframe, manualStrategyName, mtfData, false, accountSize);
        const fullExplanation = explanationEngine.generateExplanation(fullAnalysis, mode);

        // We update the local variables so buildResponse uses the new ones
        let currentAnalysis = fullAnalysis;
        let currentExplanation = fullExplanation;

        // Step 3: Optionally enhance with AI (for natural language refinement)
        try {
            currentExplanation = await enhanceExplanationWithAI(currentAnalysis, currentExplanation, mode);
        } catch (aiError) {
            console.warn('AI enhancement step failed (non-critical):', aiError);
        }

        // Step 4: Return complete package
        return buildResponse(currentAnalysis, currentExplanation);
    } catch (error) {
        console.error('Trade analysis generation failed details:', error);
        throw error;
    }
}

/**
 * Enhance explanation with AI-generated natural language
 * @param {Object} analysis - Analysis output
 * @param {Explanation} explanation - Structured explanation
 * @returns {Explanation} - AI-enhanced explanation
 */
async function enhanceExplanationWithAI(analysis, explanation, mode = 'ADVANCED') {
    const cacheKey = `${analysis.symbol}_${analysis.timeframe}_${analysis.timestamp}_${mode}`;
    if (AI_CACHE.has(cacheKey)) {
        if (AI_CACHE.has(cacheKey)) {
            // console.log('Returning cached AI enhancement'); // Silent
            return AI_CACHE.get(cacheKey);
        }
    }

    try {
        // No local VITE_GEMINI_API_KEY check - always use the secure server proxy.


        const assetClass = analysis.marketState.assetClass || 'CRYPTO';
        const contextPrefix = AssetClassAdapter.getExplanationContext(assetClass);
        const activeSetup = analysis.setups?.[0];

        let riskMetrics = "N/A";
        if (activeSetup && activeSetup.entryZone && activeSetup.stopLoss) {
            const riskRaw = Math.abs(activeSetup.entryZone.optimal - activeSetup.stopLoss);
            // For crypto, we likely want % risk
            if (assetClass === 'CRYPTO') {
                riskMetrics = ((riskRaw / activeSetup.entryZone.optimal) * 100).toFixed(2) + "% range";
            } else {
                riskMetrics = formatPriceDelta(riskRaw, assetClass);
            }
        }

        const prompt = `
You are a **Senior Institutional Risk Manager & Algo-Quant** at a top-tier firm (e.g., Citadel, Bridgewater).
Your job is to validate a potential trade setup for capital allocation. **Your verification must be rigorous and evidence-based.**
We do not trade on "feelings"; we trade on **verified data**.

### ASSET CONTEXT:
${contextPrefix}

### STRICT VERIFICATION PROTOCOL (The "Chain of Verification"):
1.  **Claim**: "Trend is bullish." -> **Verification**: "Price is above the 200 EMA (2340.5) and forming higher highs."
2.  **Claim**: "RSI is oversold." -> **Verification**: "RSI(14) is currently 28.4, below the 30 threshold."
3.  **Claim**: "Support is holding." -> **Verification**: "Price tested 1.0500 three times in the last 4 hours and rejected."

**BANNED PHRASES** (Do NOT use):
- "The market looks good." (Vague)
- "There is a possibility." (We deal in probabilities, not possibilities)
- "It might go up." (State the condition: "IF price breaks X, THEN probability of Y increases")

### INTELLIGENCE SYNOPSIS:
- **Asset**: ${assetClass} ${analysis.selectedStrategy?.isReference ? '(REFERENCE only)' : ''}
- **Regime**: ${analysis.marketState.regime} | Phase: ${analysis.marketState.phase}
- **Quant Score**: ${analysis.selectedStrategy?.quantScore || 0}/100
- **Risk**: ${riskMetrics} distance to invalidation.
- **Liquidity**: ${analysis.marketState.liquiditySweep ? `Sweep of ${analysis.marketState.liquiditySweep.type} level` : 'No recent sweeps'}
- **Imbalance**: ${analysis.marketState.relevantGap ? `Gap/FVG at ${analysis.marketState.relevantGap.priceLevel}` : 'Balanced'}
- **Institutional Data**:
    - Sentiment: ${analysis.marketState.macroSentiment?.bias || 'N/A'}
    - Dark Pools: ${analysis.marketState.darkPools?.length || 0} levels detected.
    - Volatility: ${analysis.marketState.volatility?.regime || 'Normal'}

### RETURN FORMAT (JSON ONLY - NO MARKDOWN):
{
  "htfBias": "Institutional bias (e.g., 'Accumulating in discount array').",
  "verificationProof": "List 3 specific data points (Price, Indicator, or Level) that PROVE the bias.",
  "strategyRationale": "Why this strategy fits the current regime specifically.",
  "entryContext": "Precise Entry/Invalidation logic with HARD price levels.",
  "riskAssessment": "Calculated risk factors (Volatility, News, Spread) and position sizing recommendation.",
  "confidenceJustification": "Why is the confidence score ${analysis.overallConfidence}%? Cite converging factors.",
  "institutionalAction": "What is the 'Smart Money' doing right now? (Trapping, Hedging, or driving trend?)",
  "macroThesis": "How does the broader market (DXY, Yields) support this trade?"
}
`;

        // Implementation of retry with exponential backoff
        let resultText;
        let retries = 0;
        const maxRetries = 5;

        while (retries <= maxRetries) {
            try {
                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, model: 'gemini-1.5-flash' })
                });

                if (response.status === 429 && retries < maxRetries) {
                    const delay = Math.pow(2, retries) * 2000;
                    console.warn(`Gemini API Throttled (429). Retrying in ${delay / 1000}s... (Attempt ${retries + 1}/${maxRetries})`);
                    await wait(delay);
                    retries++;
                    continue;
                }

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'AI Proxy Error');
                }

                const data = await response.json();
                resultText = data.text;
                break; // Success
            } catch (err) {
                if (retries < maxRetries && (err.message.includes('Throttled') || err.message.includes('429'))) {
                    // handled above but just in case
                } else {
                    throw err;
                }
            }
        }

        const text = resultText;

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const aiSections = JSON.parse(jsonMatch[0]);

                // Sanitize: React will crash if we pass objects as children.
                // AI models sometimes decided to return structured objects despite instructions.
                const sanitizedSections = {};
                Object.keys(aiSections).forEach(key => {
                    const val = aiSections[key];
                    if (typeof val === 'object' && val !== null) {
                        // Stringify nested objects (e.g., entryLogic { entryType: '...', ... })
                        sanitizedSections[key] = Object.entries(val)
                            .map(([k, v]) => `**${k.replace(/([A-Z])/g, ' $1').toUpperCase()}**: ${v}`)
                            .join('\n');
                    } else {
                        sanitizedSections[key] = val;
                    }
                });

                explanation.sections = { ...explanation.sections, ...sanitizedSections };
                explanation.isAiEnhanced = true;
                AI_CACHE.set(cacheKey, JSON.parse(JSON.stringify(explanation))); // Cache a deep copy
            } catch (parseError) {
                console.error('Failed to parse AI JSON:', parseError);
            }
        }

        return explanation;
    } catch (error) {
        console.warn('AI enhancement failed, returning original:', error.message);
        return explanation;
    }
}

/**
 * Format price difference based on asset class (Pips, Points, %)
 */
function formatPriceDelta(amount, assetClass) {
    if (!amount) return '0.00';
    const val = parseFloat(amount);

    if (assetClass === 'FOREX') {
        // Standard Lot: 0.0001, JPY: 0.01
        // We act heuristically since we don't have symbol here easily without passing it down
        // But for generic delta, we usually treat 0.0001 as 1 pip
        return (val / 0.0001).toFixed(1) + ' pips';
    }

    if (assetClass === 'INDICES' || assetClass === 'METALS') {
        return val.toFixed(2) + ' points';
    }

    if (assetClass === 'CRYPTO') {
        return val.toFixed(2) + '%'; // Usually we pass percent diffs for crypto, or raw price
    }

    return val.toFixed(4);
}

/**
 * Real-time market update (placeholder)
 * @param {string} symbol - Trading pair
 * @returns {Object} - Real-time price data
 */
export async function getRealTimePrice(symbol) {
    try {
        const history = await marketData.fetchHistory(symbol, '1m', 1);
        if (history && history.length > 0) {
            const candle = history[0];
            return {
                symbol,
                price: candle.close,
                change: '0.00%', // Detailed change calc could be added if needed
                timestamp: candle.time
            };
        }
    } catch (e) {
        console.warn('Real-time price fetch failed:', e);
    }

    // Fallback if fetch fails
    return {
        symbol,
        price: 1.0850,
        change: '+0.24%',
        timestamp: Date.now()
    };
}
