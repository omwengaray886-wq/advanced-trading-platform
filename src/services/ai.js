/**
 * Enhanced AI Service
 * Integrating explainable AI system with Google Gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisOrchestrator } from './analysisOrchestrator.js';
import { ExplanationEngine } from './explanationEngine.js';
import { marketData } from './marketData.js';

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
export async function generateTradeAnalysis(chartData, symbol, timeframe = '1H', manualStrategyName = null, mode = 'ADVANCED', onPartialResult = null) {
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
                liquidityMap: analysisObj.liquidityMap || []
            };

        };

        const orchestrator = new AnalysisOrchestrator();

        // Stage 0: Instant Pass (Phase 51 Optimization)
        // Provides real structural markings using only local data (~200ms)
        if (onPartialResult) {
            // isLight=true and mtfData=null
            const instantAnalysis = await orchestrator.analyze(chartData, symbol, timeframe, manualStrategyName, null, true);
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
        const fastAnalysis = await orchestrator.analyze(chartData, symbol, timeframe, manualStrategyName, mtfData, true);
        const fastExplanation = explanationEngine.generateExplanation(fastAnalysis, mode);

        if (onPartialResult) {
            onPartialResult(buildResponse(fastAnalysis, fastExplanation));
        }

        // Stage 2: Full Deep-Dive Pass (Enriched)
        const fullAnalysis = await orchestrator.analyze(chartData, symbol, timeframe, manualStrategyName, mtfData, false);
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
        console.log('Returning cached AI enhancement');
        return AI_CACHE.get(cacheKey);
    }

    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            console.log('VITE_GEMINI_API_KEY not found. Skipping AI enhancement.');
            return explanation;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `
You are an **Elite Institutional Algo-Trader & Risk Architect** (ex-Citadel/Bridgewater).
Your output determines the deployment of significant capital. **Precision is non-negotiable.**
Your objective is to generate a **High-Fidelity Execution Narrative** for ${analysis.symbol} (${analysis.timeframe}).

### STRICT VALIDATION PROTOCOL:
1.  **NO FLUFF**: Do not generic phrases like "market is volatile." Be specific: "Volatility expanded 2.0x vs 20-period avg."
2.  **EVIDENCE REQUIRED**: Every claim must be backed by the provided data points (FVG, Order Blocks, Liquidity Sweeps).
3.  **INVALIDATION IS KEY**: A trade without a clear invalidation point is gambling. You MUST define exactly where the thesis fails.

### INTELLIGENCE INPUTS:
- **Market State**: ${analysis.marketState.regime} / ${analysis.marketState.phase} (${analysis.marketState.condition}).
- **Quant Conviction**: ${analysis.selectedStrategy?.quantScore || 0}/100.
- **Liquidity Profile**: ${analysis.marketState.liquiditySweep ? `Recent ${analysis.marketState.liquiditySweep.type} sweep detected.` : 'No recent sweeps.'}
- **Imbalance**: ${analysis.marketState.relevantGap ? `FVG Quality: ${analysis.marketState.relevantGap.quality.score.toFixed(2)} (${analysis.marketState.relevantGap.cause})` : 'Stable equilibrium.'}
- **Scenario Probabilities**: UP: ${(analysis.marketState.scenarios?.all?.find(s => s.direction === 'up')?.probability * 100).toFixed(0)}%, DOWN: ${(analysis.marketState.scenarios?.all?.find(s => s.direction === 'down')?.probability * 100).toFixed(0)}%.
- **News Hazard**: ${analysis.marketState.news_risk || 'LOW'}. Technical Validity: ${analysis.marketState.technical_validity || 'NORMAL'}.
- **Drawing Confluence**: ${analysis.marketState.relevantGap ? 'FVG Alignment detected.' : ''} ${analysis.annotations.find(a => a.type === 'FIBONACCI') ? 'Institutional Fibonacci OTE anchored.' : ''} ${analysis.annotations.find(a => a.type === 'TRENDLINE' && a.metadata.isLiquidityTrap) ? 'Retail Trendline Trap identified.' : ''}

### MANDATORY NARRATIVE REQUIREMENTS (WHY, NOT WHAT):
1.  **Institutional Theme**: Explain the *Institutional Intent*. Are they accumulating, distributing, or trapping retail? link this to ${analysis.marketState.phase}.
2.  **The "Magnet"**: Identify the *Draw on Liquidity*. SPECIFICALLY, where are the resting orders? (e.g., "Scanning for stops below ${analysis.marketState.scenarios?.all?.find(s => s.direction === 'down')?.target || 'previous low'}").
3.  **Execution Logic**: Why THIS specific entry? specificy confluence (e.g., "Entry at ${analysis.selectedStrategy?.entry || 'price'} aligns with 0.618 Fib + 1H Order Block").
4.  **Hard Invalidation**: The exact price/condition where the setup is dead. "If price closes below [Level], market structure shifts bearish."
5.  **Multi-Scenario Analysis**: Briefly address the Bear/Bull alternative if the primary bias fails.

### RETURN FORMAT (JSON ONLY):
{
  "htfBias": "Deep institutional context (Weekly/Daily order flow)",
  "strategySelected": "Why this specific strategy (e.g. ${analysis.selectedStrategy?.name}) is deployed",
  "whyLongExists": "Bullish Confluences (Liquidity Sweep + BOS + OTE). Leave empty if bearish.",
  "whyShortExists": "Bearish Confluences (Liquidity Sweep + BOS + OTE). Leave empty if bullish.",
  "entryLogic": "Technical breakdown of Entry/Target/Stop levels & R:R justification",
  "riskManagement": "Position sizing & Portfolio Risk Warnings",
  "invalidationConditions": "Hard Invalidation Point: The exact price/condition where the setup fails.",
  "alternativeScenarios": "The logical pivot if primary fails (Hedging view)",
  "fundamentals": "Impact of news/macro on technical validity"
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
                    body: JSON.stringify({ prompt, model: 'gemini-flash-latest' })
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
