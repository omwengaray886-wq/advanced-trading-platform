/**
 * Analysis Orchestrator
 * Coordinates the entire analysis pipeline
 */

import { detectSwingPoints, filterSignificantSwings } from '../analysis/swingPoints.js';
import { detectMarketStructure, detectBOS, detectCHOCH, getCurrentTrend, checkFractalAlignment } from '../analysis/structureDetection.js';
import { detectMarketRegime } from '../analysis/marketRegime.js';
import { detectLiquidityPools } from '../analysis/liquidityHunter.js';
import { StrategySelector } from '../strategies/StrategySelector.js';
import { AssetClassAdapter } from './assetClassAdapter.js';
import { FundamentalAnalyzer } from './fundamentalAnalyzer.js';
import { CorrelationEngine } from './correlationEngine.js';
import { RelativeStrengthEngine } from './relativeStrengthEngine.js';
import { ExecutionHazardDetector } from '../analysis/ExecutionHazardDetector.js';
import { LiquiditySweepDetector } from '../analysis/liquiditySweepDetector.js';
import { ImbalanceDetector } from '../analysis/imbalanceDetector.js';
import { OrderFlowAnalyzer } from '../analysis/orderFlowAnalyzer.js';
import { ConsolidationDetector } from '../analysis/consolidationDetection.js';
import { RetestDetector } from '../analysis/retestDetection.js';
import { newsService } from './newsService.js';
import { ScenarioEngine } from './scenarioEngine.js';
import { Fibonacci } from '../models/annotations/Fibonacci.js';
import { Trendline } from '../models/annotations/Trendline.js';
import { SupplyDemandZone } from '../models/annotations/SupplyDemandZone.js';
import { StructureMarker } from '../models/annotations/StructureMarker.js';
import { LiquidityZone } from '../models/annotations/LiquidityZone.js';
import { FairValueGap } from '../models/annotations/FairValueGap.js';

import { SRDetector } from '../analysis/srDetection.js';
import { InstitutionalLevel } from '../models/annotations/InstitutionalLevel.js';

// Phase 15-20: New Institutional Zone Models
import { OrderBlock } from '../models/annotations/OrderBlock.js';
import { PremiumDiscountZone } from '../models/annotations/PremiumDiscountZone.js';
import { StructureZone } from '../models/annotations/StructureZone.js';
import { SRZone } from '../models/annotations/SRZone.js';
import { ConsolidationZone } from '../models/annotations/ConsolidationZone.js';
import { RetestZone } from '../models/annotations/RetestZone.js';
import { LiquiditySweepZone } from '../models/annotations/LiquiditySweepZone.js';
import { SessionZone } from '../models/annotations/SessionZone.js';
import { NewsImpactZone } from '../models/annotations/NewsImpactZone.js';
import { TimeBasedZone } from '../models/annotations/TimeBasedZone.js';
import { ConfluenceZone } from '../models/annotations/ConfluenceZone.js';
import { InvalidationZone } from '../models/annotations/InvalidationZone.js';
import { SmartMoneyConcepts } from '../analysis/smartMoneyConcepts.js';
import { MTFPOIProcessor } from '../analysis/MTFPOIProcessor.js';
import { VolumeProfileAnalyzer } from '../analysis/VolumeProfileAnalyzer.js';
import { VolumeProfile } from '../models/annotations/VolumeProfile.js';
import { OrderFlowHeatmap } from '../models/annotations/OrderFlowHeatmap.js';
import { NewsShock } from '../models/annotations/NewsShock.js';
import { ZoneMapper } from './zoneMapper.js';
import { ZoneConfidenceScorer } from './zoneConfidenceScorer.js';
import { newsShockEngine } from './newsShockEngine.js';

// Phase 51: Persistent Cooldown Tracker
const _cooldowns = new Map();

// Phase 35: Predictive Intelligence Layer
import { analyzeSentiment } from './sentimentService.js';
import { getOnChainMetrics } from './onChainService.js';
import { analyzeOptionsFlow } from './optionsFlowService.js';
import { getSeasonalityEdge } from './seasonalityService.js';
import { marketData } from './marketData.js';

// Phase 50/51: Upgraded Predictive & Tracking Layer
import { PredictionTracker } from './predictionTracker.js';
import { LiquidityMapService } from './LiquidityMapService.js';
import { SMTDivergenceEngine } from './SMTDivergenceEngine.js';
import { DivergenceEngine } from './DivergenceEngine.js';
import { ScalperEngine } from '../strategies/modules/ScalperEngine.js';
import { ProbabilisticEngine } from './probabilisticEngine.js';
import { PredictionCompressor } from './predictionCompressor.js';
import { PathProjector } from './pathProjector.js';
import { ScenarioWeighting } from './scenarioWeighting.js';
import { FailurePatternDetector } from './failurePatternDetector.js';
import { calculateTransitionProbability } from '../analysis/marketRegime.js';
import { MarketObligationEngine } from '../analysis/MarketObligationEngine.js';

export class AnalysisOrchestrator {
    constructor() {
        this.strategySelector = new StrategySelector();
        this.fundamentalAnalyzer = new FundamentalAnalyzer();
        this.correlationEngine = new CorrelationEngine();
        this.relativeStrengthEngine = new RelativeStrengthEngine();
    }

    /**
     * Run complete analysis pipeline
     * @param {Array} candles - Candlestick data (Primary TF)
     * @param {string} symbol - Trading pair symbol
     * @param {string} timeframe - Chart timeframe
     * @param {string} manualStrategyName - Optional manual strategy override
     * @param {Object} mtfData - Optional higher timeframe data { h4: [], d1: [] }
     * @param {boolean} isLight - If true, skips heavy calculations (Phase 23)
     * @returns {Object} - Complete analysis result
     */
    async analyze(candles, symbol, timeframe = '1H', manualStrategyName = null, mtfData = null, isLight = false, accountSize = 10000) {
        if (!candles || candles.length < 50) {
            throw new Error('Insufficient market data for deep institutional analysis.');
        }
        try {
            // --- PHASE 40: TIMEFRAME STACKING ENGINE (Step 1) ---
            const timeframes = this.determineContextTimeframes(timeframe);

            // Step 0: Detect asset class and get parameters
            const assetClass = AssetClassAdapter.detectAssetClass(symbol);
            const assetParams = AssetClassAdapter.getAssetParameters(assetClass, timeframe);

            // Step 1: Detect swing points (using asset-specific parameters)
            const swingData = detectSwingPoints(candles, assetParams.swingLookback);
            const significantSwings = filterSignificantSwings(swingData.all, assetParams.minStructureMove);

            // Step 2: Detect market structure
            const structures = detectMarketStructure(significantSwings);
            const bosMarkers = detectBOS(candles, structures);
            const chochMarkers = detectCHOCH(structures, candles);

            const allStructures = [...structures, ...bosMarkers, ...chochMarkers];

            // Step 3: Analyze market regime
            const marketState = detectMarketRegime(candles, allStructures);
            marketState.currentTrend = getCurrentTrend(allStructures);
            marketState.structuralEvents = chochMarkers; // Phase 49: Expose CHoCH for scoring
            marketState.assetClass = assetClass;
            marketState.currentPrice = (candles && candles.length > 0) ? candles[candles.length - 1].close : 0;
            if (marketState.currentPrice === 0) throw new Error('Cannot determine current price from market data.');

            // Step 3.5: Multi-Timeframe (MTF) Confluence (Phase 40 Upgrade)
            marketState.mtf = { context: null, higherContext: null, globalBias: 'NEUTRAL' };
            marketState.profile = timeframes.profile; // Store Scalper/Day/Swing profile
            const contextKey = timeframes.contextTF.toLowerCase(); // e.g. '1h' or '1w'

            if (mtfData) {
                // 1. Analyze Context Timeframe (The 'Truth' for this profile)
                if (mtfData[contextKey]) {
                    marketState.mtf.context = this.analyzeTimeframe(mtfData[contextKey], assetParams);
                } else if (mtfData.h4 && contextKey === '4h') {
                    // Fallback for H4 if passed explicitly as 'h4' key
                    marketState.mtf.context = this.analyzeTimeframe(mtfData.h4, assetParams);
                } else if (mtfData.d1 && contextKey === '1d') {
                    // Fallback for D1
                    marketState.mtf.context = this.analyzeTimeframe(mtfData.d1, assetParams);
                }

                // 2. Analyze Higher Context (if available) - e.g. Daily for Scalpers (who use 1H context)
                // For now we map H4->D1, 1H->4H? Or just stick to Primary Context.
                // Keeping it simple: Context is what matters for Bias.

                // Determine Global Bias from Context
                if (marketState.mtf.context && marketState.mtf.context.trend) {
                    marketState.mtf.globalBias = marketState.mtf.context.trend.direction;
                }

                // Fractal Alignment (Phase 37)
                if (marketState.mtf.context) {
                    marketState.fractalAlignment = checkFractalAlignment(
                        { trend: marketState.currentTrend, breaks: bosMarkers },
                        { trend: marketState.mtf.globalBias, breaks: marketState.mtf.context.structures?.filter(s => s.markerType === 'BOS') || [] }
                    );
                }
            }

            // Step 3.6: Liquidity Hunting (Stop Pool Mapping)
            const liquidityPools = detectLiquidityPools(candles, allStructures);
            marketState.liquidityPools = liquidityPools;

            // Step 3.6.1: Detect Institutional Liquidity Sweeps (Phase 15)
            const liquiditySweep = LiquiditySweepDetector.detectSweeps(candles, liquidityPools);
            marketState.liquiditySweep = liquiditySweep;

            // Step 3.6.2: Detect Institutional Imbalances / FVG (Phase 16)
            const fvgs = ImbalanceDetector.detectFVGs(candles);
            marketState.fvgs = fvgs;
            marketState.relevantGap = ImbalanceDetector.getMostRelevantFVG(fvgs, marketState.currentPrice);

            // Step 3.6.3: Detect Consolidations (Phase 5)
            const consolidations = ConsolidationDetector.detectConsolidations(candles);
            marketState.consolidations = consolidations;

            // Step 3.6.4: Detect Retests (Phase 5)
            const retests = RetestDetector.detectRetests(candles, [...fvgs, ...(marketState.liquidityPools || [])]);
            marketState.retests = retests;

            let divergences = [];
            let smtResult = { divergences: [], confluenceScore: 0 };
            if (!isLight) {
                smtResult = await SMTDivergenceEngine.detectDivergence(symbol, candles, timeframe, significantSwings);
                divergences = smtResult.divergences;
            }
            marketState.divergences = divergences;
            marketState.smtConfluence = smtResult.confluenceScore;
            marketState.smtDivergence = (divergences && divergences.length > 0) ? divergences[0] : null;

            // Step 3.6.6: Detect Technical Divergence (RSI/MACD) - Phase 56
            const techDivergences = await DivergenceEngine.detectDivergence(symbol, candles, timeframe, marketState);
            marketState.technicalDivergences = techDivergences;

            // Push to global annotations for visualization
            if (techDivergences && techDivergences.length > 0) {
                // Add to baseAnnotations so they appear on chart
                baseAnnotations.push(...techDivergences);
            }


            // Step 3.7: Session Intelligence (Timing & Killzones)
            const lastCandle = candles[candles.length - 1];
            if (!lastCandle) throw new Error('Latest candle data is corrupted or missing.');
            const currentSession = AssetClassAdapter.getCurrentSession(lastCandle.time);

            // Detect Killzones (2h windows from session start)
            let killzone = null;
            const hour = new Date(lastCandle.time * 1000).getUTCHours();

            if (hour >= 8 && hour < 10) killzone = 'LONDON_OPEN';
            else if (hour >= 13 && hour < 15) killzone = 'NY_OPEN';
            else if (hour >= 13 && hour < 16) killzone = 'LONDON_NY_OVERLAP';

            marketState.session = {
                active: currentSession,
                killzone: killzone,
                timestamp: lastCandle.time
            };

            // Step 4: Analyze fundamentals
            const fundamentals = this.fundamentalAnalyzer.analyzeFundamentals(symbol, assetClass);

            // Step 3.2: Analyze Correlations (Macro Bias)
            let correlation = { status: 'NEUTRAL', bias: 0 };
            if (!isLight) {
                correlation = await this.correlationEngine.getCorrelationBias(symbol, assetClass);
            }
            marketState.correlation = correlation;

            // Step 3.3: Detect SMT Divergence (Institutional Alpha)
            // Deprecated: Now handled in Step 7 by DivergenceEngine directly with Multi-Asset logic
            // const smtDivergence = await this.correlationEngine.detectSMTDivergence(symbol, candles);
            // marketState.smtDivergence = smtDivergence;

            // Step 3.4: Order Flow & Relative Volume (Phase 13)
            const volumeAnalysis = OrderFlowAnalyzer.detectInstitutionalVolume(candles);
            marketState.volumeAnalysis = volumeAnalysis;
            marketState.institutionalVolume = volumeAnalysis.isInstitutional;

            // Step 3.4.5: Volume Profile Intelligence (Phase 55)
            // SKIPPED in Light Mode (Heavy Volumetrics)
            if (!isLight) {
                const volumeProfile = VolumeProfileAnalyzer.calculateProfile(candles);
                const sessionProfiles = VolumeProfileAnalyzer.calculateSessionProfiles(candles);
                const nPOCs = VolumeProfileAnalyzer.findNakedPOCs(sessionProfiles);

                marketState.volumeProfile = volumeProfile;
                marketState.sessionProfiles = sessionProfiles;
                marketState.nPOCs = nPOCs;
                marketState.hvns = volumeProfile?.hvns || [];
                marketState.lvns = volumeProfile?.lvns || [];
            }

            // Step 3.5: Multi-Timeframe Relative Strength (Phase 20)
            let relativeStrength = { status: 'NEUTRAL', score: 50 };
            if (!isLight) {
                if (mtfData && mtfData.h4 && mtfData.d1) {
                    relativeStrength = await this.relativeStrengthEngine.calculateMTFRelativeStrength(
                        symbol,
                        assetClass,
                        { '1h': candles, '4h': mtfData.h4, '1d': mtfData.d1 }
                    );
                } else {
                    relativeStrength = await this.relativeStrengthEngine.calculateRelativeStrength(symbol, assetClass, candles);
                }
            }
            marketState.relativeStrength = relativeStrength;

            // Step 3.8: Phase 35 - Predictive Intelligence Layer
            let sentiment, onChain, optionsFlow, seasonality, orderBook;
            if (!isLight) {
                [sentiment, onChain, optionsFlow, seasonality, orderBook] = await Promise.all([
                    analyzeSentiment(symbol).catch(() => null),
                    assetClass === 'CRYPTO' ? getOnChainMetrics(symbol).catch(() => null) : Promise.resolve(null),
                    assetClass === 'EQUITY' ? analyzeOptionsFlow(symbol).catch(() => null) : Promise.resolve(null),
                    getSeasonalityEdge(symbol, new Date()),
                    marketData.fetchOrderBook(symbol, 40).catch(() => null)
                ]);
            } else {
                // Return fast defaults for light mode
                sentiment = { score: 50, label: 'NEUTRAL' };
                seasonality = { score: 50, edge: 'NONE' };
            }

            marketState.sentiment = sentiment;
            marketState.onChain = onChain;
            marketState.optionsFlow = optionsFlow;
            marketState.seasonality = seasonality;
            marketState.orderBook = orderBook;

            // Step 3.9: Institutional Hazard Detection (Phase 38 & 39)
            const activeShock = newsShockEngine.getActiveShock(symbol);
            marketState.activeShock = activeShock;
            marketState.hazards = ExecutionHazardDetector.detectHazards(candles, marketState, assetParams);

            // Step 3.9.5: Prediction Accuracy Upgrade (Layer 1 & 2)
            // Detect Market Obligations (Liquidity Magnets / Unfinished Business)
            const obligationAnalysis = MarketObligationEngine.detectObligations(marketState, candles);
            marketState.obligations = obligationAnalysis;

            // Adjust fundamental alignment based on news shock (Phase 39)
            if (activeShock && activeShock.severity === 'HIGH') {
                fundamentals.suitabilityPenalty = 0.4; // 40% reduction for AI setups
            }

            // Step 5: Select setup candidates (Multi-directional)
            const selection = this.strategySelector.selectStrategy(
                marketState,
                assetClass,
                fundamentals
            );

            // Step 6: Generate Setup A, B, C, D
            let setups = [];
            const candidates = [...selection.long.slice(0, 2), ...selection.short.slice(0, 2)];

            // If candidates are unbalanced, fill with best 'all' options
            if (candidates.length < 4) {
                selection.all.forEach(c => {
                    if (setups.length < 4 && !candidates.find(cand => cand.strategy.name === c.strategy.name)) {
                        candidates.push(c);
                    }
                });
            }

            // CRITICAL: Filter candidates that fail to produce valid trade parameters
            const validSetups = [];

            for (let i = 0; i < candidates.length; i++) {
                if (validSetups.length >= 4) break;

                const c = candidates[i];
                const direction = selection.long.includes(c) ? 'LONG' : 'SHORT';

                // Generates annotations (Entry, SL, TP)
                const annotations = c.strategy.generateAnnotations(candles, marketState, direction);
                const riskParams = this.extractRiskParameters(annotations);

                // Phase 48: Institutional Liquidity Refinement
                if (marketState.orderBook) {
                    this.refineLevelsWithLiquidity(riskParams, marketState, direction);
                }

                // STRICT ALIGNMENT ENFORCEMENT
                // Ensure Entry/SL/TP logic is geometrically valid before proceeding
                if (riskParams.entry && riskParams.stopLoss && riskParams.targets?.length > 0) {
                    const entryPrice = riskParams.entry.optimal;
                    // 1. Correct Directionality
                    if (direction === 'LONG' && riskParams.stopLoss >= entryPrice) {
                        riskParams.stopLoss = entryPrice * 0.99; // Force 1% SL if invalid
                    } else if (direction === 'SHORT' && riskParams.stopLoss <= entryPrice) {
                        riskParams.stopLoss = entryPrice * 1.01; // Force 1% SL if invalid
                    }

                    // 2. Enforce Minimum R:R of 1.5
                    const risk = Math.abs(entryPrice - riskParams.stopLoss);
                    const minReward = risk * 1.5;

                    if (direction === 'LONG') {
                        if (riskParams.targets[0].price <= entryPrice + minReward) {
                            riskParams.targets[0].price = entryPrice + minReward;
                        }
                    } else {
                        if (riskParams.targets[0].price >= entryPrice - minReward) {
                            riskParams.targets[0].price = entryPrice - minReward;
                        }
                    }
                }
                if (!riskParams.entry || !riskParams.stopLoss) {
                    // Optional: You could add a console warning or default values here if needed
                    // console.warn(`Setup ${c.strategy.name} incomplete but kept per user request.`);
                }

                // Calculate Global Quant Confluence Score
                const quantScore = this.calculateQuantScore(marketState, { ...c, direction });

                // Calculate Capital Friendliness
                const capitalScore = this.calculateCapitalFriendliness(riskParams, assetParams);
                const capitalTag = capitalScore > 0.8 ? 'Small Account Friendly' :
                    capitalScore > 0.5 ? 'Moderate Capital Required' : 'High Margin / Advanced';

                // --- Institutional Risk Logic ---
                const hasRiskParams = riskParams && riskParams.entry && riskParams.stopLoss;
                const stopDistance = hasRiskParams ? Math.abs(riskParams.entry.optimal - riskParams.stopLoss) : 0;

                const suggestedSize = hasRiskParams ? this.calculateInstitutionalSize(
                    accountSize, // Tailored account size
                    0.01,  // 1% Base Risk
                    stopDistance,
                    quantScore,
                    assetClass
                ) : 0;

                // Determine Execution Complexity
                const executionComplexity = this.calculateExecutionComplexity(marketState, assetParams);

                // --- Precision Execution Logic (Phase 12) ---
                const executionPrecision = AssetClassAdapter.calculateExecutionPrecision(assetClass, timeframe, marketState.atr);

                // Detect Execution Hazards
                const executionHazards = ExecutionHazardDetector.detectHazards(candles, marketState, assetParams);

                const precisionBuffer = executionPrecision.dynamicBuffer || 0;
                const augmentedEntry = riskParams.entry ? {
                    ...riskParams.entry,
                    optimal: direction === 'LONG' ?
                        riskParams.entry.optimal + precisionBuffer :
                        riskParams.entry.optimal - precisionBuffer,
                    hasBuffer: true
                } : null;

                // Calculate final suitability with News and Consensus penalties (Phase 66)
                const correlation = marketState.correlation;
                let consensusAdjustment = 0;
                if (correlation && correlation.bias !== 'NEUTRAL' && correlation.bias !== 'SELF' && correlation.bias !== direction) {
                    consensusAdjustment = 0.2; // 20% penalty for correlation conflict
                }

                const newsPenalty = fundamentals.suitabilityPenalty || 0;
                const finalSuitability = Math.max(0.1, c.suitability - newsPenalty - consensusAdjustment);
                const finalQuantScore = Math.max(0, quantScore - (newsPenalty * 100) - (consensusAdjustment * 100));

                validSetups.push({
                    id: String.fromCharCode(65 + validSetups.length), // A, B, C, D dynamically
                    name: `Setup ${String.fromCharCode(65 + validSetups.length)}: ${c.strategy.name}`,
                    direction,
                    timeframe: timeframe,
                    entryZone: augmentedEntry, // Use buffered entry
                    stopLoss: riskParams.stopLoss,
                    targets: riskParams.targets,
                    rr: riskParams.targets[0]?.riskReward || 0,
                    strategy: c.strategy.name,
                    suitability: finalSuitability,
                    quantScore: finalQuantScore,
                    capitalScore,
                    capitalTag,
                    suggestedSize,
                    executionComplexity,
                    executionPrecision, // Use refined precision
                    executionHazards: executionHazards.map(h => ({
                        ...h,
                        isNewsRelated: h.type === 'NEWS_SHOCK_RISK'
                    })),
                    rationale: `${direction} opportunity detected via ${c.strategy.name}. Trend: ${marketState.mtf.globalBias}. Institutional Volume: ${marketState.volumeAnalysis.isInstitutional ? 'DETECTED' : 'LOW'}. ${activeShock ? 'Warning: High volatility news pending.' : ''}`,
                    detailedRationale: `This ${direction} setup is triggered by ${c.strategy.name} confluence on the ${timeframe} timeframe. Technical basis includes: 1) Significant ${marketState.volumeAnalysis.isInstitutional ? 'Institutional' : 'Retail'} participation. 2) Structure alignment with ${marketState.mtf.globalBias} bias. 3) Proximity to ${marketState.relevantGap ? 'Fair Value Gap' : 'Liquidity Pool'}.${marketState.mtfBiasAligned ? ' 4) FULL MTF BIAS ALIGNMENT (4H/1D).' : ''} ${newsPenalty > 0 ? 'Note: Suitability reduced due to upcoming news shock.' : ''}`,
                    institutionalTheme: c.strategy.getInstitutionalTheme(),
                    smtDivergence: marketState.smtDivergence,
                    liquidityPools: marketState.liquidityPools?.slice(0, 5),
                    scenarios: marketState.scenarios,
                    annotations
                });
            }

            // Assign filtered setups to the main setups array
            validSetups.forEach(s => setups.push(s));

            // Phase 40: Optimize for Trader Profile
            this.optimizeForProfile(setups, marketState.profile);

            // Step 6.1: Generate Scenarios (Phase 5)
            const scenarios = ScenarioEngine.generateScenarios(marketState, setups, fundamentals);
            marketState.scenarios = scenarios;

            // --- Phase 4: News Intelligence Layer ---
            if (!isLight) this.applyNewsIntelligence(marketState, setups, fundamentals);

            // --- Institutional Zone Intelligence (15 Types) ---
            const baseAnnotations = [];

            // 0. SMT Divergences (Phase 25)
            if (marketState.divergences && marketState.divergences.length > 0) {
                marketState.divergences.forEach(d => baseAnnotations.push(d));
            }


            const srLevels = SRDetector.detectLevels(candles, significantSwings);
            const startTime = (candles && candles.length > 0) ? candles[0].time : Date.now() / 1000 - 86400;
            const endTime = lastCandle ? lastCandle.time + 86400 : Date.now() / 1000 + 86400;
            const events = newsService.getEvents(symbol, startTime, endTime);

            // 1. Supply & Demand Zones
            // Using a simplified detection or reusing fvgs as a proxy for supply/demand
            fvgs.forEach((f, idx) => {
                baseAnnotations.push(new SupplyDemandZone(
                    f.top, f.bottom, candles[f.index].time,
                    f.type.includes('BULLISH') ? 'DEMAND' : 'SUPPLY',
                    { timeframe, strength: 'medium', note: 'FVG Imbalance' }
                ));
            });

            // 2. Order Blocks (Phase 15 Requirement)
            const obs = SmartMoneyConcepts.detectOrderBlocks(candles);
            obs.forEach(ob => {
                baseAnnotations.push(new OrderBlock(
                    ob.high, ob.low, ob.timestamp,
                    ob.type === 'DEMAND' ? 'BULLISH' : 'BEARISH',
                    { timeframe, strength: ob.strength }
                ));
            });

            // 3. Fair Value Gaps (Phase 15 Requirement)
            fvgs.forEach(f => {
                baseAnnotations.push(new FairValueGap(
                    { top: f.top, bottom: f.bottom, startTime: candles[f.index].time, endTime: lastCandle.time },
                    f.type.includes('BULLISH') ? 'BULLISH' : 'BEARISH',
                    { timeframe }
                ));
            });

            // 4. Liquidity Zones (Phase 15 Requirement)
            liquidityPools.forEach(pool => {
                baseAnnotations.push(new LiquidityZone(
                    pool.price,
                    pool.type === 'STOP_POOL' ? (pool.side === 'BUY_SIDE' ? 'EQUAL_HIGHS' : 'EQUAL_LOWS') : 'INDUCEMENT',
                    { timeframe, liquidity: pool.strength.toLowerCase(), label: pool.label }
                ));
            });

            // 5. Premium/Discount Zones (Phase 15 Requirement)
            const impulse = SmartMoneyConcepts.detectImpulsiveSwing(candles);
            if (impulse) {
                baseAnnotations.push(new PremiumDiscountZone(
                    impulse.high, impulse.low, candles[candles.length - 40].time,
                    { timeframe }
                ));
            }

            // 6. Structure Zones (Phase 15 Requirement)
            allStructures.filter(s => ['BOS', 'CHOCH'].includes(s.markerType)).forEach(s => {
                baseAnnotations.push(new StructureZone(
                    s.price, s.time, s.markerType, s.direction,
                    { timeframe, strength: s.significance }
                ));
            });

            // 7. Support & Resistance Zones (Phase 15 Requirement)
            srLevels.forEach(l => {
                baseAnnotations.push(new SRZone(
                    l.price, l.type,
                    { timeframe, strength: l.strength.toLowerCase(), isMajor: l.isMajor, touches: l.touches }
                ));
            });

            // 8. Consolidation/Range Zones (Phase 15 Requirement)
            consolidations.forEach(c => {
                baseAnnotations.push(new ConsolidationZone(
                    c.high, c.low, c.startTime, c.endTime,
                    { timeframe, strength: c.strength, isAccumulation: c.classification.type === 'ACCUMULATION' }
                ));
            });

            // 9. Retest Zones (Phase 15 Requirement)
            retests.forEach(r => {
                baseAnnotations.push(new RetestZone(
                    r.price, r.time, r.zoneType, r.direction,
                    { timeframe }
                ));
            });

            // 10. Liquidity Sweep Zones (Phase 15 Requirement)
            if (marketState.liquiditySweep) {
                const ls = marketState.liquiditySweep;
                baseAnnotations.push(new LiquiditySweepZone(
                    ls.sweptPrice + (ls.relativeDepth / 100 * ls.sweptPrice),
                    ls.sweptPrice - (ls.relativeDepth / 100 * ls.sweptPrice),
                    lastCandle.time,
                    ls.type,
                    { timeframe, rationale: ls.rationale }
                ));
            }

            // 11. Session-Based Zones (Phase 15 Requirement)
            if (marketState.session.active) {
                // Approximate session bounds for visualization
                const sessionHigh = Math.max(...candles.slice(-8).map(c => c.high));
                const sessionLow = Math.min(...candles.slice(-8).map(c => c.low));
                baseAnnotations.push(new SessionZone(
                    marketState.session.active,
                    marketState.session.timestamp - 3600, // 1h lookback
                    marketState.session.timestamp,
                    sessionHigh,
                    sessionLow,
                    { timeframe, killzone: !!marketState.session.killzone }
                ));
            }

            // 11.5: Smart Drawings (Phase 6 - Institutional Confluence)
            // 1. Auto-Fibonacci (OTE Mapping)
            if (significantSwings.length >= 2) {
                const latestSwings = significantSwings.slice(-10).sort((a, b) => a.time - b.time);
                const highPoint = latestSwings.reduce((prev, curr) => (curr.type === 'HIGH' && curr.price > prev.price) ? curr : prev, latestSwings[0]);
                const lowPoint = latestSwings.reduce((prev, curr) => (curr.type === 'LOW' && curr.price < prev.price) ? curr : prev, latestSwings[0]);

                if (highPoint && lowPoint && Math.abs(highPoint.index - lowPoint.index) > 5) {
                    const fib = new Fibonacci(lowPoint, highPoint, { timeframe });
                    baseAnnotations.push({
                        id: `fib-${timeframe}`,
                        type: 'FIBONACCI',
                        coordinates: { start: fib.coordinates.start, end: fib.coordinates.end },
                        levels: fib.levels,
                        oteRange: fib.oteRange,
                        visible: true
                    });
                }
            }

            // 2. Smart Trendlines (Liquidity Traps)
            if (significantSwings.length >= 3) {
                ['HIGH', 'LOW'].forEach(type => {
                    const typedSwings = significantSwings.filter(s => s.type === type).slice(-5);
                    if (typedSwings.length >= 3) {
                        const tl = new Trendline(typedSwings[0], typedSwings[typedSwings.length - 1], {
                            touches: typedSwings.length,
                            timeframe,
                            note: typedSwings.length >= 3 ? 'Institutional Liquidity Trap' : 'Structural Trendline'
                        });

                        baseAnnotations.push({
                            id: `tl-${type}-${timeframe}`,
                            type: 'TRENDLINE',
                            coordinates: tl.coordinates,
                            metadata: {
                                touches: tl.touches,
                                isLiquidityTrap: tl.isLiquidityTrap,
                                note: tl.metadata.note
                            },
                            visible: true
                        });
                    }
                });
            }

            // 12. News-Impact Zones (Phase 15 Requirement)
            events.filter(e => e.impact === 'high').forEach(e => {
                baseAnnotations.push(new NewsImpactZone(
                    e.title, e.impact, e.time,
                    marketState.currentPrice * 1.01,
                    marketState.currentPrice * 0.99,
                    { timeframe }
                ));
            });

            // 13. Time-Based Zones (Phase 15 Requirement)
            if (killzone) {
                baseAnnotations.push(new TimeBasedZone(
                    `${killzone} Window`,
                    lastCandle.time - 7200, // 2h killzone
                    lastCandle.time,
                    { timeframe }
                ));
            }

            // 13.5: Multi-Timeframe POI Synchronization (Phase 16)
            if (mtfData) {
                const mtfAnalysis = {};
                if (marketState.mtf.h4) mtfAnalysis['4H'] = { marketState: marketState.mtf.h4, setups: [{ annotations: marketState.mtf.h4.pois }] };
                if (marketState.mtf.d1) mtfAnalysis['1D'] = { marketState: marketState.mtf.d1, setups: [{ annotations: marketState.mtf.d1.pois }] };

                const mtfResults = MTFPOIProcessor.processMTF({ marketState, setups: [{ annotations: baseAnnotations }] }, mtfAnalysis);
                if (mtfResults && mtfResults.setups && mtfResults.setups[0]) {
                    // Add projected HTF zones to base annotations
                    mtfResults.htfZones.forEach(z => baseAnnotations.push(z));

                    // Save alignment data to marketState for UI and rationale
                    marketState.mtfAlignments = mtfResults.alignments;
                    marketState.mtfBiasAligned = mtfResults.biasAlignment;
                }
            }

            // Step 3.4.6: Consolidated Volume Annotations (Phase 55)
            if (!isLight && marketState.volumeProfile) {
                baseAnnotations.push(new VolumeProfile(marketState.volumeProfile, {
                    side: 'RIGHT',
                    width: 0.15,
                    timeframe
                }));
            }

            if (marketState.nPOCs) {
                marketState.nPOCs.forEach(npoc => {
                    baseAnnotations.push(new InstitutionalLevel(
                        npoc.price,
                        'nPOC',
                        {
                            label: npoc.label,
                            timeframe,
                            strength: 'high',
                            note: 'Un-retested Institutional Magnet'
                        }
                    ));
                });
            }

            // 13.7: Order Flow Heatmap (Phase 19)
            const heatmapData = OrderFlowAnalyzer.calculateHeatmap(candles, 60);

            // FILTER: Institutional Quality Control (Phase 24 Upgrade)
            // Remove any setups with low technical confluence BEFORE AI analysis
            setups = setups.filter(s => {
                const minScore = 30; // Relaxed threshold for broader visibility
                if (s.quantScore < minScore) {
                    // console.log(`Dropped ${s.name} due to low conviction (${s.quantScore})`);
                    return false;
                }
                return true;
            });
            if (heatmapData) {
                const heatmap = new OrderFlowHeatmap(heatmapData);
                baseAnnotations.push(heatmap);
                marketState.heatmap = heatmapData; // For AI explanation
            }

            // 15. Zone Mapping & Confidence Scoring (Phase 20)
            baseAnnotations.forEach(annotation => {
                const mapping = ZoneMapper.mapZone(annotation, marketState);
                Object.assign(annotation, mapping);
                annotation.confidence = ZoneConfidenceScorer.calculateScore(annotation, marketState, baseAnnotations);
            });

            // 15. Invalidation Zones (Phase 15 Requirement)
            setups.forEach(setup => {
                baseAnnotations.push(new InvalidationZone(
                    setup.stopLoss,
                    lastCandle.time,
                    setup.direction,
                    { timeframe, note: `Invalidation for ${setup.name}` }
                ));
            });

            // Link visual scenarios and base formations to all setups (Market-wide context)
            const visualScenarios = ScenarioEngine.getVisualScenarios(
                scenarios,
                marketState.currentPrice,
                baseAnnotations,
                marketState.volProfile,
                setups, // Pass setups so paths point to entry zones
                marketState.orderBook
            );

            setups.forEach(s => {
                s.annotations = [
                    ...(s.annotations || []),
                    ...visualScenarios,
                    ...baseAnnotations
                ];
            });

            // Step 6.5: Portfolio Correlation Risk Mapping
            const riskClusters = this.detectRiskClusters(setups, symbol);
            marketState.riskClusters = riskClusters;

            // Step 7: Final check on fundamental-technical alignment
            const technicalBias = marketState.trend.direction;
            const fundamentalBias = fundamentals.impact.direction;
            const aligned = (technicalBias === fundamentalBias) || (fundamentalBias === 'NEUTRAL');

            fundamentals.alignment.aligned = aligned;
            fundamentals.alignment.conflictLevel = aligned ? 'NONE' :
                fundamentals.impact.strength > 0.7 ? 'HIGH' : 'MEDIUM';

            // Step 8: Calculate Directional Validity Explanations
            const longValidity = selection.long.length > 0 ?
                `Valid due to ${selection.long[0].strategy.name} confluence.` :
                `Invalid: Primary trend ${technicalBias} and fundamental pressure ${fundamentalBias} oppose long interest.`;

            const shortValidity = selection.short.length > 0 ?
                `Valid due to ${selection.short[0].strategy.name} confluence.` :
                `Invalid: Market structure and momentum favor continued bullishness. Use caution on counters.`;

            // Step 9: Build complete analysis object
            const analysis = {
                symbol,
                timeframe,
                timestamp: Date.now(),
                assetClass,

                // Market analysis
                marketState,
                swingPoints: significantSwings,
                structures: allStructures,
                liquidityPools: marketState.liquidityPools || [],
                fundamentals,

                // Multi-Setup Output
                setups,
                directionalReasoning: {
                    long: longValidity,
                    short: shortValidity
                },

                // Legacy compatibility (Prevents crashes in consumers not yet updated)
                selectedStrategy: setups[0] ? {
                    name: setups[0].strategy,
                    suitability: setups[0].suitability,
                    rationale: setups[0].rationale
                } : null,
                alternativeStrategies: setups.slice(1).map(s => ({
                    name: s.strategy,
                    suitability: s.suitability
                })),
                annotations: baseAnnotations, // Always include global institutional drawings
                globalAnnotations: baseAnnotations,

                // Confidence
                overallConfidence: this.calculateOverallConfidence(marketState, setups[0]?.suitability || 0),
                fundamentalAlignment: aligned,

                // Economic News Overlays (Phase 4)
                newsEvents: newsService.getEvents(symbol, candles[0].time, lastCandle.time + 86400)
            };

            // 5. Inject News Shocks (Phase 22)
            const upcomingShocks = newsService.getUpcomingShocks(24);
            upcomingShocks.forEach(shock => {
                const shockAnno = new NewsShock(
                    shock.event,
                    shock.time,
                    shock.impact,
                    shock.currency,
                    { forecast: shock.forecast, previous: shock.previous }
                );

                // Attach to primary setup for visibility in ExplanationPanel
                if (setups[0]) {
                    setups[0].annotations = [...(setups[0].annotations || []), shockAnno];
                }
            });

            // Step 10: COMPREHENSIVE PREDICTIVE FORECASTING ENGINE (Phase 50)

            // 10.0: Check for Cooldown/Suppression (Phase 51)
            const symbolCooldown = _cooldowns.get(symbol);
            const isCooldownActive = symbolCooldown && Date.now() < symbolCooldown.expiresAt;

            // Periodically evaluate pending outcomes (receipt generation)
            // SKIPPED in Light Mode (Firebase Query)
            if (!isLight) {
                await PredictionTracker.evaluatePending(symbol, lastCandle);
            }

            // 10.1: Calculate probabilities (Phase 50 Upgrade)
            const probabilities = ProbabilisticEngine.generatePredictions(symbol, marketState);

            // 10.2: Apply confidence decay if setup is old
            const setupAge = Date.now() - analysis.timestamp;
            if (setupAge > 0) {
                probabilities.continuation = ProbabilisticEngine.applyConfidenceDecay(probabilities.continuation, setupAge);
                probabilities.reversal = ProbabilisticEngine.applyConfidenceDecay(probabilities.reversal, setupAge);
            }

            // 10.3: Project HTF liquidity paths
            const pathProjection = PathProjector.generateRoadmap(marketState, marketState.mtf);

            // Generate visual scenarios for global annotations (Phase 50)
            const globalVisualScenarios = ScenarioEngine.getVisualScenarios(scenarios, marketState.currentPrice, analysis.annotations, marketState.volProfile, setups, marketState.orderBook);
            analysis.annotations.push(...globalVisualScenarios);

            // 10.4: Predict regime transition
            const regimeTransition = calculateTransitionProbability(
                { ...marketState, candles },
                allStructures,
                marketState.consolidations || []
            );

            // 10.5: Detect failure patterns (trap zones)
            const failurePatterns = FailurePatternDetector.detectAllPatterns(
                candles,
                allStructures,
                marketState.fvgs || []
            );
            const trapZones = FailurePatternDetector.getTrapZones(failurePatterns);


            // 10.6: Weighted scenario selection
            const dominantScenario = ScenarioWeighting.selectDominantScenario(
                scenarios?.all || [],
                marketState,
                probabilities
            );

            // 10.7: Force single dominant bias
            const dominantBias = ScenarioWeighting.forceDominantBias({
                marketState,
                setups,
                scenarios,
                probabilities
            });

            // 10.8: Compress into single prediction
            const shouldShow = PredictionCompressor.shouldShowPrediction(marketState, probabilities);
            const prediction = shouldShow ?
                PredictionCompressor.compress(analysis, probabilities) :
                {
                    bias: 'NO_EDGE',
                    target: null,
                    invalidation: null,
                    confidence: 0,
                    reason: 'No clear trading edge detected. Awaiting clearer market structure.',
                    timestamp: Date.now(),
                    confidenceBreakdown: { positives: [], risks: [] },
                    horizons: { immediate: 'Sideways', session: 'Neutral', htf: 'Neutral' }
                };


            // 10.9: Apply Suppression if Cooldown active
            if (isCooldownActive) {
                prediction.bias = 'WAIT_COOLDOWN';
                prediction.reason = `Protective cooldown active: ${symbolCooldown.reason}. Analysis suspended to prevent overtrading.`;
            }

            // 10.10: Handle Track & Outcome Receipts (Phase 51)
            // SKIPPED in Light Mode (Firebase Persistence)
            if (!isLight && prediction.bias !== 'NO_EDGE' && prediction.bias !== 'WAIT_COOLDOWN') {
                await PredictionTracker.track(prediction, symbol);
            }

            // 10.11: Update Cooldown Stats (Internal)
            // SKIPPED in Light Mode (Firebase Query)
            if (!isLight) {
                const stats = await PredictionTracker.getStats(symbol);
                if (stats && stats.last10?.[0] === 'FAIL' && stats.last10?.[1] === 'FAIL') {
                    _cooldowns.set(symbol, {
                        expiresAt: Date.now() + 4 * 60 * 60 * 1000, // 4h cooldown
                        reason: 'Recent double invalidation'
                    });
                }
            }

            // 10.12: Attach all predictive outputs to analysis
            analysis.prediction = prediction;
            analysis.probabilities = probabilities;
            analysis.pathProjection = pathProjection;
            analysis.regimeTransition = regimeTransition;
            analysis.trapZones = trapZones;
            analysis.dominantScenario = dominantScenario;
            analysis.dominantBias = dominantBias;

            // 6. Generate Liquidity Map (Phase 24)
            // Note: In Phase 27, LiquidityMapService.generateMap expects raw depth data, but here we might be 
            // relying on the Orchestrator's internal map or re-fetching.
            // For now, we assume analysis.liquidityMap is populated via LiquidityMapService or empty.
            // If running on simulation, we generate based on structures.
            // 6. Generate Liquidity Map (Phase 24)
            // Note: In Phase 27, LiquidityMapService.generateMap expects raw depth data, but here we might be 
            // relying on the Orchestrator's internal map or re-fetching.
            // For now, we assume analysis.liquidityMap is populated via LiquidityMapService or empty.
            // If running on simulation, we generate based on structures.
            analysis.liquidityMap = LiquidityMapService.generateMap(marketState.orderBook || { bids: [], asks: [] }); // REAL DATA FOR SCALPER

            // 8. Automated Scalping Logic (Phase 28 & 40)
            if (timeframe === '5m' || timeframe === '15m' || timeframe === '1m') {
                // Pass marketState to enable Liquidity Sweep logic
                const scalpSetup = ScalperEngine.analyze(analysis.liquidityMap, marketState.currentPrice, marketState);
                if (scalpSetup) {
                    setups.unshift({
                        id: 'SCALP',
                        name: `Scalp: ${scalpSetup.direction} (${scalpSetup.type === 'SCALP_SWEEP' ? 'Sweep' : 'OB'})`,
                        direction: scalpSetup.direction,
                        timeframe: timeframe,
                        entryZone: { optimal: scalpSetup.entry, top: scalpSetup.entry * 1.0005, bottom: scalpSetup.entry * 0.9995 },
                        stopLoss: scalpSetup.stopLoss,
                        targets: [{ price: scalpSetup.target, riskReward: 2.0 }],
                        strategy: 'SCALPER_ENGINE',
                        suitability: scalpSetup.confidence * 100,
                        quantScore: scalpSetup.confidence * 100,
                        capitalTag: 'High Frequency',
                        rationale: scalpSetup.rationale,
                        annotations: []
                    });
                }
            }

            // Note: analysis.divergences is already populated from marketState.divergences earlier
            analysis.divergences = marketState.divergences || [];

            return analysis;
        } catch (error) {
            console.error('Analysis orchestration failed:', error);
            throw new Error('Failed to complete market analysis: ' + error.message);
        }
    }

    /**
     * Optimize setups based on Trader Profile (Phase 40)
     */
    optimizeForProfile(setups, profile) {
        if (!setups || setups.length === 0) return;

        setups.forEach(s => {
            // Swing Logic: Boost HTF alignments, Penalize Scalps
            if (profile === 'SWING') {
                if (s.strategy === 'SCALPER_ENGINE') s.suitability *= 0.5;
                if (['Order Block', 'Supply/Demand', 'Smart Money Concepts'].some(n => s.strategy.includes(n))) {
                    s.suitability *= 1.2;
                }
            }
            // Scalper Logic: Boost Scalps, Penalize Slow setups
            else if (profile === 'SCALPER') {
                if (s.strategy === 'SCALPER_ENGINE') s.suitability *= 1.5;
                if (['4h', '1d', '1w'].includes(s.timeframe.toLowerCase())) s.suitability *= 0.6;
            }
        });

        // Re-sort based on new suitability
        setups.sort((a, b) => b.suitability - a.suitability);
    }

    /**
     * Calculate capital friendliness score for small accounts
     * @param {Object} riskParams - Entry, SL, Targets
     * @param {Object} assetParams - Asset properties (swing size etc)
     * @returns {number} - Score (0-1)
     */
    calculateCapitalFriendliness(riskParams, assetParams) {
        if (!riskParams || !riskParams.stopLoss || !riskParams.entry) return 0;

        const stopDistance = Math.abs(riskParams.entry.optimal - riskParams.stopLoss);
        const price = riskParams.entry.optimal;
        const stopPercent = (stopDistance / price) * 100;

        // Small Account Logic:
        // 1. Tighter stops (percentage wise) are better because they allow for larger position sizes with fixed risk
        // 2. High RR (>3) allows for compounding even with small wins

        let score = 0.5;

        // Tighter stops = Higher Score
        if (stopPercent < 0.5) score += 0.3;      // Very tight stop (<0.5%)
        else if (stopPercent < 1.0) score += 0.15; // Tight stop (<1.0%)
        else if (stopPercent > 3.0) score -= 0.2;  // Wide stop (>3.0%) - requires more margin / smaller size

        // High RR Bonus
        const rr = riskParams.targets[0]?.riskReward || 0;
        if (rr > 3.5) score += 0.2; // Excellent R:R
        else if (rr > 2.0) score += 0.1;

        return Math.min(1.0, Math.max(0, score));
    }

    /**
     * Extract risk parameters from annotations
     * @param {Array} annotations - Generated annotations
     * @returns {Object} - Risk parameters
     */
    extractRiskParameters(annotations) {
        const stopLoss = annotations.find(a => a.type === 'TARGET_PROJECTION' && a.projectionType === 'STOP_LOSS');
        const targets = annotations.filter(a => a.type === 'TARGET_PROJECTION' && a.projectionType.startsWith('TARGET_'));
        const entryZone = annotations.find(a => a.type === 'ENTRY_ZONE');

        return {
            entry: entryZone ? {
                top: entryZone.coordinates.top,
                bottom: entryZone.coordinates.bottom,
                optimal: entryZone.getOptimalEntry()
            } : null,
            stopLoss: stopLoss ? stopLoss.coordinates.price : null,
            targets: targets.map(t => ({
                level: t.getTargetNumber(),
                price: t.coordinates.price,
                riskReward: t.riskReward,
                probability: t.probability
            }))
        };
    }

    /**
     * Refine TP/SL levels based on Order Book Liquidity Clusters
     * @param {Object} riskParams
     * @param {Object} marketState
     * @param {string} direction
     */
    refineLevelsWithLiquidity(riskParams, marketState, direction) {
        const orderBook = marketState.orderBook;
        if (!orderBook || !riskParams) return;

        const clusters = LiquidityMapService.findClusters(orderBook);

        // TP Refinement: AIM for just BEFORE a wall
        if (riskParams.targets && riskParams.targets.length > 0) {
            riskParams.targets.forEach(t => {
                const opposingWalls = direction === 'LONG' ? clusters.sellClusters : clusters.buyClusters;
                // Find nearest wall in the direction of TP
                // For LONG, wall price > entry, find sell walls < TP price but > entry
                const wallBeforeTarget = opposingWalls
                    .filter(w => direction === 'LONG' ? (w.price < t.price && w.price > riskParams.entry?.optimal) : (w.price > t.price && w.price < riskParams.entry?.optimal))
                    .sort((a, b) => direction === 'LONG' ? b.price - a.price : a.price - b.price)[0];

                if (wallBeforeTarget) {
                    // Pull TP back to be 0.1% before the wall
                    const adjustment = wallBeforeTarget.price * 0.001;
                    t.price = direction === 'LONG' ? wallBeforeTarget.price - adjustment : wallBeforeTarget.price + adjustment;
                    t.note = "Liquidity Aligned Target";
                }

                // Phase 66: Market Obligation Alignment
                // If there's a primary obligation (magnet) in the same direction, stretch TP to hit it
                const primaryMagnet = marketState.obligations?.primaryObligation;
                if (primaryMagnet && primaryMagnet.urgency > 80) {
                    const isMagnetDirection = (direction === 'LONG' && primaryMagnet.price > riskParams.entry?.optimal) ||
                        (direction === 'SHORT' && primaryMagnet.price < riskParams.entry?.optimal);

                    if (isMagnetDirection) {
                        // If magnet is further than current target, potentially extend
                        if (direction === 'LONG' ? primaryMagnet.price > t.price : primaryMagnet.price < t.price) {
                            t.price = primaryMagnet.price;
                            t.note = "Obligation Reaching Target";
                        }
                    }
                }
            });
        }

        // SL Refinement: HIDE behind a wall
        if (riskParams.stopLoss) {
            const protectiveWalls = direction === 'LONG' ? clusters.buyClusters : clusters.sellClusters;
            // Find nearest wall BEHIND SL
            const wallBehindSL = protectiveWalls
                .filter(w => direction === 'LONG' ? (w.price < riskParams.entry?.optimal) : (w.price > riskParams.entry?.optimal))
                .sort((a, b) => direction === 'LONG' ? b.price - a.price : a.price - b.price)
                .find(w => direction === 'LONG' ? w.price < riskParams.stopLoss : w.price > riskParams.stopLoss);

            if (wallBehindSL) {
                // Push SL to be 0.1% BEHIND the protective wall
                const adjustment = wallBehindSL.price * 0.001;
                riskParams.stopLoss = direction === 'LONG' ? wallBehindSL.price - adjustment : wallBehindSL.price + adjustment;
            }
        }
    }

    /**
     * Analyze a single timeframe for structure and regime
     */
    analyzeTimeframe(candles, assetParams) {
        if (!candles || candles.length < 50) return null;
        const swingData = detectSwingPoints(candles, assetParams.swingLookback);
        const significantSwings = filterSignificantSwings(swingData.all, assetParams.minStructureMove);
        const structures = detectMarketStructure(significantSwings);
        const bosMarkers = detectBOS(candles, structures);
        const chochMarkers = detectCHOCH(structures);
        const allStructures = [...structures, ...bosMarkers, ...chochMarkers];

        const state = detectMarketRegime(candles, allStructures);
        state.currentTrend = getCurrentTrend(allStructures);

        // Phase 16: Extract POIs for MTF Synchronization
        state.pois = [];

        // 1. Order Blocks
        const obs = SmartMoneyConcepts.detectOrderBlocks(candles);
        obs.forEach(ob => state.pois.push(new OrderBlock(
            ob.high, ob.low, ob.timestamp,
            ob.type === 'DEMAND' ? 'BULLISH' : 'BEARISH',
            { strength: ob.strength, isHTF: true }
        )));

        // 2. Liquidity Pools
        const pools = detectLiquidityPools(candles, allStructures);
        pools.filter(p => p.strength === 'HIGH').forEach(p => state.pois.push(new LiquidityZone(
            p.price,
            p.type === 'STOP_POOL' ? (p.side === 'BUY_SIDE' ? 'EQUAL_HIGHS' : 'EQUAL_LOWS') : 'INDUCEMENT',
            { liquidity: 'institutional', isHTF: true }
        )));

        // 3. Significant S/R
        const sr = SRDetector.detectLevels(candles, significantSwings);
        sr.filter(l => l.isMajor).forEach(l => state.pois.push(new SRZone(
            l.price, l.type, { isMajor: true, isHTF: true }
        )));

        return state;
    }

    /**
     * Calculate institutional position size based on balance and quant score
     */
    calculateInstitutionalSize(balance, baseRiskPercent, stopDistance, quantScore, assetClass) {
        if (!stopDistance || stopDistance === 0) return 0;

        // Scale risk based on Quant Score (Confidence)
        // 90% score = 100% of base risk
        // 60% score = 50% of base risk (Caution)
        const confidenceMultiplier = Math.max(0, (quantScore - 50) / 40);
        const actualRisk = balance * baseRiskPercent * confidenceMultiplier;

        if (assetClass === 'FOREX') {
            // Standard Lot = 100,000 units. 1 pip movement = $10 for 1 lot.
            // Simplified pip-based estimation
            return parseFloat((actualRisk / (stopDistance * 100000)).toFixed(2));
        } else if (assetClass === 'CRYPTO') {
            return parseFloat((actualRisk / stopDistance).toFixed(4));
        }

        return parseFloat((actualRisk / stopDistance).toFixed(2));
    }

    /**
     * Detect risk clusters (Currency concentration)
     */
    detectRiskClusters(setups, symbol) {
        const clusters = {};
        const pairs = [symbol]; // In a real portfolio, this would include all active trades

        pairs.forEach(p => {
            const parts = p.split('/');
            parts.forEach(part => {
                clusters[part] = (clusters[part] || 0) + 1;
            });
        });

        return Object.entries(clusters)
            .filter(([_, count]) => count >= 2)
            .map(([asset, count]) => ({ asset, count, threatLevel: 'MODERATE' }));
    }

    /**
     * Calculate Execution Difficulty
     */
    calculateExecutionComplexity(marketState, assetParams) {
        let complexity = 'LOW';
        const isKillzone = marketState.session?.killzone;
        const isScalp = marketState.timeframe === '5m';

        if (isKillzone && isScalp) complexity = 'HIGH';
        else if (isKillzone || isScalp) complexity = 'MEDIUM';

        return complexity;
    }

    /**
     * Calculate global Quant Confluence Score (0-100)
     */
    calculateQuantScore(marketState, setup) {
        let score = 0;

        // 1. Technical Suitability (20 points)
        score += (setup.suitability * 20);

        // 2. MTF Alignment (20 points)
        if (marketState.mtf?.globalBias === setup.direction) score += 20;

        // 3. Correlation Consensus (10 points) (Phase 66)
        if (marketState.correlation?.bias === setup.direction) score += 10;

        // 4. Timing & Killzone (10 points) (Phase 66)
        if (marketState.session?.killzone) score += 10;

        // 5. Liquidity Targeting (15 points)
        const institutionalLiq = marketState.liquidityPools?.some(p =>
            p.type === 'INSTITUTIONAL_POOL' &&
            ((setup.direction === 'LONG' && p.side === 'SELL_SIDE') ||
                (setup.direction === 'SHORT' && p.side === 'BUY_SIDE'))
        );
        if (institutionalLiq) score += 15;

        // 6. Market Obligations (10 points) (Phase 66)
        if (marketState.obligations?.primaryObligation?.urgency > 75) score += 10;

        // 7. Structure & CHoCH (15 points)
        const hasCHoCH = (marketState.structuralEvents || []).some(e =>
            e.markerType === 'CHOCH' && e.direction === setup.direction
        );
        if (hasCHoCH) score += 15;

        return Math.round(Math.min(score, 100));
    }

    /**
     * Get timeframe specific color (Phase 6 Requirement)
     */
    getTFColor(tf) {
        const colors = {
            '1m': '#FFFFFF',
            '5m': '#FFFF00', // Yellow
            '15m': '#00FF00', // Green
            '30m': '#00FFFF', // Cyan
            '1h': '#ADD8E6', // Light Blue
            '4h': '#00008B', // Dark Blue
            '1d': '#FFA500', // Orange
            '1w': '#FF0000'  // Red
        };
        return colors[tf.toLowerCase()] || '#808080';
    }

    /**
     * Apply News Intelligence (Phase 4)
     * Suspends/Degrades technical validity during high-impact news hazards.
     */
    applyNewsIntelligence(marketState, setups, fundamentals) {
        const proximity = fundamentals.proximityAnalysis;
        if (!proximity?.isImminent) return;

        const isHighImpact = proximity.event.impact === 'high';
        const minutesToEvent = proximity.minutesToEvent;

        if (isHighImpact && minutesToEvent < 15) {
            marketState.news_risk = 'EXTREME';
            marketState.technical_validity = 'SUSPENDED';
            marketState.confidence *= 0.3; // Deep degradation

            // Mark all setups as high risk
            setups.forEach(s => {
                s.quantScore *= 0.4;
                s.rationale = `[NEWS HAZARD] Technical validity suspended due to ${proximity.event.type} in ${Math.round(minutesToEvent)}m. ${s.rationale}`;
            });
        } else if (isHighImpact || minutesToEvent < 30) {
            marketState.news_risk = 'HIGH';
            marketState.technical_validity = 'DEGRADED';
            marketState.confidence *= 0.6;
        }
    }

    /**
     * Detect Confluence Zones (Overlapping Institutional Factors)
     */
    detectConfluenceZones(annotations) {
        if (annotations.length < 3) return null;

        // Simplified overlap detection: look for clusters of price levels
        const points = [];
        annotations.forEach(a => {
            if (a.coordinates && a.coordinates.price) points.push({ price: a.coordinates.price, type: a.type });
            if (a.coordinates && a.coordinates.top) points.push({ price: a.coordinates.top, type: a.type });
            if (a.coordinates && a.coordinates.bottom) points.push({ price: a.coordinates.bottom, type: a.type });
        });

        if (points.length < 3) return null;

        // Group by 1% proximity
        const sorted = points.sort((a, b) => a.price - b.price);
        let bestCluster = [];
        let currentCluster = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            const gap = (sorted[i].price - sorted[i - 1].price) / sorted[i - 1].price;
            if (gap < 0.005) { // 0.5% overlap
                currentCluster.push(sorted[i]);
            } else {
                if (currentCluster.length > bestCluster.length) bestCluster = [...currentCluster];
                currentCluster = [sorted[i]];
            }
        }
        if (currentCluster.length > bestCluster.length) bestCluster = currentCluster;

        if (bestCluster.length >= 3) {
            const avgTop = Math.max(...bestCluster.map(p => p.price));
            const avgBottom = Math.min(...bestCluster.map(p => p.price));
            const factors = [...new Set(bestCluster.map(p => p.type))];

            return new ConfluenceZone(
                avgTop, avgBottom,
                Date.now() / 1000,
                factors,
                { note: `High Confluence Area (${factors.length} factors)` }
            );
        }

        return null;
    }

    /**
     * Calculate overall confidence score
     * @param {Object} marketState - Market analysis
     * @param {number} strategySuitability - Strategy suitability score
     * @returns {number} - Overall confidence (0-1)
     */
    calculateOverallConfidence(marketState, strategySuitability) {
        const regimeConfidence = marketState.confidence || 0.5;
        const trendStrength = marketState.trend.strength || 0.5;

        let score = (regimeConfidence * 0.3 + strategySuitability * 0.5 + trendStrength * 0.2);

        // Technical Divergence Boost (Phase 56)
        if (marketState.technicalDivergences && marketState.technicalDivergences.length > 0) {
            // Boost up to 10% based on strongest divergence strength
            const maxStrength = Math.max(...marketState.technicalDivergences.map(d => d.strength || 0));
            // Cap boost at 10% (0.1)
            const boost = Math.min(0.1, maxStrength * 0.1);
            score = Math.min(1.0, score + boost);
        }

        return score;
    }

    /**
     * Phase 40: Timeframe Stacking Logic
     * Maps the current 'Entry' timeframe to its 'Context' (Truth) timeframe.
     */
    determineContextTimeframes(currentTF) {
        const tf = currentTF.toLowerCase();

        let profile = 'DAY'; // Default
        let contextTF = '4h';
        let entryTF = tf;

        // Scalper Profile
        if (['1m', '5m', '15m'].includes(tf)) {
            profile = 'SCALPER';
            contextTF = '1h'; // Scalpers use 1H for trend, 5m/1m for entry
        }
        // Swing Profile
        else if (['4h', '1d', '1w'].includes(tf)) {
            profile = 'SWING';
            contextTF = '1w'; // Swing traders use Weekly for context
        }

        return { profile, contextTF, entryTF };
    }
}
