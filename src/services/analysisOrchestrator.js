import { normalizeDirection } from '../utils/normalization.js';

/**
 * Analysis Orchestrator (Phase 32)
 * Coordinates the entire analysis pipeline
 */
import { AssetClassAdapter } from './assetClassAdapter.js';

import { detectSwingPoints, filterSignificantSwings } from '../analysis/swingPoints.js';
import { detectMarketStructure, detectBOS, detectCHOCH, getCurrentTrend, checkFractalAlignment } from '../analysis/structureDetection.js';
import { detectMarketRegime } from '../analysis/marketRegime.js';
import { detectLiquidityPools } from '../analysis/liquidityHunter.js';
import {
    calculateRSI,
    calculateMACD,
    calculateATR,
    calculateOBV,
    calculateMFI,
    calculateCMF,
    calculateADX,
    calculateIchimoku,
    calculateAnchoredVWAP,
    calculateStochastic
} from '../analysis/indicators.js';
import { StrategySelector } from '../strategies/StrategySelector.js';
import { AMDEngine } from './AMDEngine.js';
import { WyckoffEngine } from './WyckoffEngine.js';
import { StrategyPerformanceTracker, strategyPerformanceTracker } from './StrategyPerformanceTracker.js';
import { PatternLearningEngine } from './PatternLearningEngine.js';
import { ScenarioEngine } from './scenarioEngine.js';
import { RelativeStrengthEngine } from './relativeStrengthEngine.js';
import { ExecutionHazardDetector } from '../analysis/ExecutionHazardDetector.js';
import { LiquiditySweepDetector } from '../analysis/liquiditySweepDetector.js';
import { ImbalanceDetector } from '../analysis/imbalanceDetector.js';
import { OrderFlowAnalyzer } from './OrderFlowAnalyzer.js';
import { ConsolidationDetector } from '../analysis/consolidationDetection.js';
import { RetestDetector } from '../analysis/retestDetection.js';
import { newsService } from './newsService.js';
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
import { WhaleAlert } from '../models/annotations/WhaleAlert.js';
import { ZoneMapper } from './zoneMapper.js';
import { ZoneConfidenceScorer } from './zoneConfidenceScorer.js';
import { newsShockEngine } from './newsShockEngine.js';
import { TradeManagementEngine } from './TradeManagementEngine.js'; // Phase 2
import { signalManager } from './SignalManager.js'; // Phase 13

// Phase 51: Persistent Cooldown Tracker
const _cooldowns = new Map();

// Phase 35: Predictive Intelligence Layer
import { analyzeSentiment } from './sentimentService.js';
import { getOnChainMetrics, onChainService } from './onChainService.js';
import { analyzeOptionsFlow } from './optionsFlowService.js';
import { getSeasonalityEdge } from './seasonalityService.js';
import { marketData } from './marketData.js';
import { institutionalFlow } from './institutionalFlow.js';

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
import { SessionAnalyzer } from '../analysis/SessionAnalyzer.js';
import { MarketObligationEngine } from '../analysis/MarketObligationEngine.js';
import { bayesianEngine } from './BayesianInferenceEngine.js';
import { liveOrderBookStore } from './LiveOrderBookStore.js';
import { portfolioRiskService } from './portfolioRiskService.js';
// DirectionalConfidenceGate is now dynamically imported in analyze() to break circular dependencies
// Phase 15 Fix applied below

import { macroBiasEngine } from './MacroBiasEngine.js';
import { probabilisticRiskEngine } from './ProbabilisticRiskEngine.js';
import { RegimeTransitionPredictor } from './RegimeTransitionPredictor.js';
import { backtestingEngine } from './backtestingEngine.js';
import { eventBlocker } from './eventBlocker.js';
import { analysisCacheManager } from './analysisCacheManager.js';

// Phase 6: Autonomous Alpha Integration
import { SentimentEngine } from './SentimentEngine.js';
import { TargetProjection } from '../models/annotations/TargetProjection.js';
import { DarkPoolEngine } from './DarkPoolEngine.js';
import { VolatilityEngine } from './VolatilityEngine.js';
import { OrderBookEngine } from './OrderBookEngine.js';
import { BasketArbitrageEngine } from './BasketArbitrageEngine.js';
import { ExecutionEngine } from './ExecutionEngine.js';
import { AlphaTracker, alphaTracker } from './AlphaTracker.js';
console.log('AlphaTracker singleton initialized with methods:', Object.getOwnPropertyNames(AlphaTracker.prototype));
import { AlphaLeakDetector } from './AlphaLeakDetector.js';
import { FundamentalAnalyzer } from './fundamentalAnalyzer.js';
import { CorrelationEngine } from './correlationEngine.js';
import { EdgeScoringEngine } from './EdgeScoringEngine.js';
import { ExecutionTrigger } from '../analysis/ExecutionTrigger.js';
import { COTDataService } from './COTDataService.js';
import { CommodityCorrelationEngine } from './CommodityCorrelationEngine.js';
import { tacticalNewsEngine } from './TacticalNewsEngine.js';

// Logic Integration: Advanced Analysis Engines
import { CorrelationClusterEngine } from './CorrelationClusterEngine.js';
import { correlationService } from './correlationService.js';
import { PortfolioStressService, portfolioStressService } from './PortfolioStressService.js';
import { monteCarloService } from './monteCarloService.js';

// DirectionalConfidenceGate is now dynamically imported in analyze() to break circular dependencies

// Phase 6: Predictive Intelligence Engines
import { LeadLagEngine } from './LeadLagEngine.js';
import { ParameterOptimizer } from './ParameterOptimizer.js';
import { TapeReadingEngine } from './TapeReadingEngine.js';
import { DXYCorrelationEngine } from './DXYCorrelationEngine.js';
import { gsRefiner } from './GSRefiner.js';
import { liquidityHeatmapEngine } from './LiquidityHeatmapEngine.js';

import { LiquidityVoidHeatmap } from './LiquidityVoidHeatmap.js';
import { MTFEquilibriumTracker } from './MTFEquilibriumTracker.js';
import { computePivotPoints } from './PivotPointEngine.js';

export class AnalysisOrchestrator {
    constructor() {
        this.strategySelector = new StrategySelector();
        this.fundamentalAnalyzer = new FundamentalAnalyzer();
        this.correlationEngine = new CorrelationEngine();
        this.relativeStrengthEngine = new RelativeStrengthEngine();
        this.learningEngine = new PatternLearningEngine();
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
        // Step 0: Initialize Live DOM Tracking (Phase 4 Perfection)
        if (!isLight) {
            liveOrderBookStore.track(symbol);
        }

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
            if (!marketState.currentPrice || marketState.currentPrice === 0) {
                throw new Error(`[ORCHESTRATOR] Invalid zero price detected for ${symbol}. Analysis aborted.`);
            }

            // --- Institutional Zone Intelligence (Initialize Early to avoid ReferenceErrors) ---
            const baseAnnotations = [];

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

            // --- PARALLEL EXECUTION BLOCK (Phase 80 Optimization) ---
            // Run independent heavy-lifting engines concurrently
            let smtResult = { divergences: [], confluenceScore: 0 };
            let techDivergences = [];
            let macroCorrelation = { status: 'NEUTRAL', bias: 0 };
            let eventRisk = { score: 0 };
            let clusters = null;
            let realNews = [], calendarEvents = [];

            if (!isLight) {
                const results = await Promise.allSettled([
                    // 1. SMT Divergence
                    SMTDivergenceEngine.detectDivergence(symbol, candles, timeframe, significantSwings),
                    // 2. Technical Divergence
                    DivergenceEngine.detectDivergence(symbol, candles, timeframe, marketState),
                    // 3. Macro Correlation
                    this.correlationEngine.getCorrelationBias(symbol, assetClass),
                    // 4. Event Risk
                    this.correlationEngine.analyzeEventRisk(newsService),
                    // 5. Correlation Clusters (Phase 2 - Real Data)
                    (async () => {
                        try {
                            const clusterSymbols = [symbol, 'BTCUSDT', 'EURUSDT', 'DXY', 'US10Y', 'NDX'];
                            const matrix = await correlationService.getMatrix(clusterSymbols, '1h');
                            return CorrelationClusterEngine.detectClusters(matrix);
                        } catch (err) {
                            console.warn('[Analysis] Cluster detection failed, using fallback:', err.message);
                            return CorrelationClusterEngine.detectClusters({ [symbol]: { [symbol]: 1.0 } });
                        }
                    })(),
                    // 6. Real News
                    newsService.fetchRealNews(symbol),
                    // 7. Calendar Shocks
                    newsService.getUpcomingShocks(72)
                ]);

                // extract results safely
                if (results[0].status === 'fulfilled') smtResult = results[0].value;
                if (results[1].status === 'fulfilled') techDivergences = results[1].value;
                if (results[2].status === 'fulfilled') macroCorrelation = results[2].value;
                if (results[3].status === 'fulfilled') eventRisk = results[3].value;
                if (results[4].status === 'fulfilled') clusters = results[4].value;
                if (results[5].status === 'fulfilled') realNews = results[5].value;
                if (results[6].status === 'fulfilled') calendarEvents = results[6].value;

                marketState.clusters = clusters;
                marketState.eventRisk = eventRisk;
                marketState.techDivergences = techDivergences;
                marketState.smtResult = smtResult;

                // Log failures for debugging
                results.forEach((res, idx) => {
                    if (res.status === 'rejected') {
                        const services = ['SMT', 'TechDiv', 'Macro', 'EventRisk', 'Clusters', 'News', 'Calendar'];
                        console.warn(`[Analysis] ${services[idx]} Engine failed:`, res.reason?.message);
                    }
                });
            }

            // Assign results to marketState
            marketState.divergences = smtResult.divergences || [];
            marketState.smtConfluence = smtResult.confluenceScore;
            marketState.smtDivergence = (marketState.divergences.length > 0) ? marketState.divergences[0] : null;
            marketState.technicalDivergences = techDivergences;
            marketState.macroCorrelation = macroCorrelation;
            marketState.eventRisk = eventRisk;
            marketState.clusters = clusters;

            // Push technical divergences to global annotations
            if (techDivergences && techDivergences.length > 0) {
                baseAnnotations.push(...techDivergences);
            }

            // Update fundamentals with fetched news
            const fundamentals = this.fundamentalAnalyzer.analyzeFundamentals(symbol, assetClass, {
                news: realNews,
                events: calendarEvents
            });

            // Step 3.6.5: Tactical News Sweep Detection (Phase 5)
            const tacticalSetup = tacticalNewsEngine.detectTacticalOpportunity(marketState, fundamentals);
            marketState.tacticalSetup = tacticalSetup;

            // Step 3.6.6b: Detect Failure Patterns (Trap Zones) - Phase 52
            // Must run after structures and gaps are detected
            const failurePatterns = FailurePatternDetector.detectAllPatterns(candles, allStructures, fvgs);
            const trapZones = FailurePatternDetector.getTrapZones(failurePatterns);
            marketState.trapZones = trapZones;

            // --- PHASE 5: DEEP INSTITUTIONAL INTELLIGENCE ---
            // Step 3.6.7: Deep Order Flow Analysis (Estimated Delta & Absorption)
            const orderFlow = OrderFlowAnalyzer.analyze(candles);
            marketState.orderFlow = orderFlow;

            // Inject Order Flow validation into Liquidity Sweep (if sweep exists)
            if (marketState.liquiditySweep && orderFlow.absorption?.detected) {
                marketState.liquiditySweep.isConfirmedByAbsorption = true;
                marketState.liquiditySweep.absorptionNote = orderFlow.absorption.note;
            }

            // Phase 2: Iceberg Detection (DarkPoolEngine Upgrade)
            const icebergs = DarkPoolEngine.detectIcebergs(candles);
            marketState.icebergs = icebergs;

            // Phase 2: Tape Reading (Tick Aggressiveness)
            const tapeAnalysis = TapeReadingEngine.analyzeTape(candles);
            marketState.tape = tapeAnalysis;

            // Step 3.7: Session Intelligence (Phase 72 Upgrade)
            const lastCandle = candles[candles.length - 1];
            if (!lastCandle) throw new Error('Latest candle data is corrupted or missing.');

            // Enhanced session analysis
            const sessionInfo = SessionAnalyzer.analyzeSession(lastCandle.time);
            const sessionVolatility = SessionAnalyzer.calculateSessionVolatility(candles, sessionInfo.session);
            const sessionProbability = SessionAnalyzer.assessSessionProbability(sessionInfo, sessionVolatility);

            marketState.session = {
                active: sessionInfo.session,
                killzone: sessionInfo.killzone,
                isOverlap: sessionInfo.isOverlap,
                isPeakLiquidity: sessionInfo.isPeakLiquidity,
                timestamp: lastCandle.time,
                volatility: sessionVolatility,
                probability: sessionProbability
            };

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

            // Step 3.6.8: Phase 6 - Autonomous Alpha Intelligence
            // Sentiment Analysis (COT Simulation)
            const macroSentiment = SentimentEngine.analyzeSentiment(symbol, candles, assetClass);
            marketState.macroSentiment = macroSentiment;

            // Dark Pool Detection
            const darkPools = DarkPoolEngine.detectDarkPools(candles, marketState.liquidityPools, marketState.currentPrice);
            marketState.darkPools = darkPools;

            // Enhance liquidity pools with Dark Pool intelligence
            if (darkPools.length > 0) {
                marketState.liquidityPools = DarkPoolEngine.enhanceLiquidityWithDarkPools(
                    marketState.liquidityPools || [],
                    darkPools
                );
            }

            // Volatility Surface Analysis
            const volatilityAnalysis = VolatilityEngine.calculateVolatilityCorridor(candles, timeframe, marketState.currentPrice);
            marketState.volatility = volatilityAnalysis;

            // Detect Vega Shocks (rapid volatility spikes)
            const vegaShock = VolatilityEngine.detectVegaShock(candles);
            marketState.vegaShock = vegaShock;

            // Phase 7: Live Order Book Intelligence (Zero Latency)
            if (!isLight) {
                try {
                    // Use instant snapshot from Live Store instead of REST polling
                    let depth = liveOrderBookStore.getSnapshot();

                    // Phase 3 Stability: Fallback to REST if WS is still connecting/warming up
                    if (!depth) {
                        console.log(`[Orchestrator] WS Depth for ${symbol} unavailable. Falling back to REST...`);
                        depth = await marketData.fetchOrderBook(symbol);
                        // Optional: Feed back to store to keep it warm
                        if (depth) liveOrderBookStore.lastSnapshot = depth;
                    }

                    if (depth) {
                        const dynamicRange = (marketState.atr * 1.5) || (marketState.currentPrice * 0.02);
                        const depthAnalysis = OrderBookEngine.analyze(depth, marketState.currentPrice, dynamicRange);
                        marketState.orderBookDepth = depthAnalysis;
                        marketState.domStats = liveOrderBookStore.getStats();

                        // Detect Micro-Pulses (Spoofing)
                        const spoofEvents = LiquidityMapService.detectMicroPulse(depth);
                        spoofEvents.forEach(e => {
                            baseAnnotations.push({
                                id: `spoof-${e.price}-${Date.now()}`,
                                type: 'INSTITUTIONAL_SPOOF',
                                price: e.price,
                                magnitude: e.magnitude,
                                label: `⚠️ Spoof: ${e.side} removal (${e.magnitude ? (e.magnitude * 100).toFixed(0) : '0'}%)`,
                                visible: true
                            });
                        });

                        // Inject depth walls into liquidity pools for visualization
                        if (depthAnalysis.walls?.length > 0) {
                            marketState.liquidityPools = [
                                ...(marketState.liquidityPools || []),
                                ...depthAnalysis.walls.map(w => ({
                                    price: w.price,
                                    type: w.side === 'BUY' ? 'BUY_SIDE' : 'SELL_SIDE',
                                    strength: 'INSTITUTIONAL',
                                    label: `Live Wall (${w.strength ? w.strength.toFixed(1) : '1.0'}x)`,
                                    isOrderBookWall: true
                                }))
                            ];
                        }
                    } else if (Date.now() % 10 === 0) {
                        // Periodic fallback to REST if stream is dead (silent background sync)
                        marketData.fetchOrderBook(symbol).then(d => {
                            if (d) liveOrderBookStore.lastSnapshot = d;
                        }).catch(() => { });
                    }
                } catch (depthError) {
                    console.warn(`Depth analysis failed for ${symbol}:`, depthError.message);
                }

                // Phase 7: Basket Arbitrage Intelligence
                try {
                    // Fetch real-time prices for the active basket to detect institutional divergence
                    const basketPrices = new Map();
                    const basketKey = BasketArbitrageEngine._findBasketForSymbol(symbol);
                    if (basketKey) {
                        const symbols = BasketArbitrageEngine.baskets[basketKey];
                        // Phase 55: Parallelize basket fetching
                        const basketData = await Promise.all(
                            symbols.map(s => marketData.fetchHistory(s, '1d', 2).catch(() => null))
                        );

                        symbols.forEach((s, idx) => {
                            const hist = basketData[idx];
                            if (hist && hist.length >= 2) {
                                basketPrices.set(s, { current: hist[hist.length - 1].close, open24h: hist[0].close });
                            }
                        });
                        const arbitrage = BasketArbitrageEngine.calculateBasketDivergence(symbol, basketPrices);
                        marketState.basketArbitrage = arbitrage;
                    }
                } catch (arbError) {
                    console.warn(`Basket Arbitrage analysis failed for ${symbol}:`, arbError.message);
                }
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

            // Step 3.8: Phase 35/55 - Predictive Intelligence Layer
            let sentiment, onChain, optionsFlow, seasonality, orderBook, alphaFlow;

            // Phase 16: Supply Dynamics & Whale Tracking
            let whaleAlerts = [], exchangeFlows = { netFlow: 0 };

            if (!isLight) {
                // Parallelize all advanced data fetching
                const results = await Promise.all([
                    analyzeSentiment(symbol).catch(() => null),
                    assetClass === 'CRYPTO' ? getOnChainMetrics(symbol).catch(() => null) : Promise.resolve(null),
                    (assetClass === 'EQUITY' || assetClass === 'FOREX') ? analyzeOptionsFlow(symbol).catch(() => null) : Promise.resolve(null),
                    getSeasonalityEdge(symbol, new Date()),
                    marketData.fetchOrderBook(symbol, 40).catch(() => null),
                    institutionalFlow.getAlphaScore(symbol).catch(() => null),
                    // New Phase 16 Data
                    assetClass === 'CRYPTO' ? onChainService.getWhaleAlerts(symbol).catch(() => []) : Promise.resolve([]),
                    assetClass === 'CRYPTO' ? onChainService.getRealExchangeFlows(symbol).catch(() => ({ netFlow: 0 })) : Promise.resolve({ netFlow: 0 })
                ]);

                [sentiment, onChain, optionsFlow, seasonality, orderBook, alphaFlow, whaleAlerts, exchangeFlows] = results;
            } else {
                // Return fast defaults for light mode
                sentiment = { score: 50, label: 'NEUTRAL' };
                seasonality = { score: 50, edge: 'NONE' };
                alphaFlow = { score: 0, components: [] };
            }

            marketState.sentiment = sentiment;
            marketState.onChain = onChain;
            marketState.optionsFlow = optionsFlow;
            marketState.seasonality = seasonality;
            marketState.orderBook = orderBook;
            marketState.institutionalFlow = alphaFlow;

            // Phase 16: Supply Pressure Analysis
            marketState.supplyDynamics = {
                whaleAlerts,
                exchangeFlows,
                score: 50 // Default Neutral
            };

            if (assetClass === 'CRYPTO') {
                // Calculate Supply Pressure Score (0-100)
                // > 70 = Bullish (Accumulation/Outflows)
                // < 30 = Bearish (Distribution/Inflows)
                let supplyScore = 50;

                // 1. Exchange Flows Impact
                if (exchangeFlows.netFlow < -1000) supplyScore += 15; // Major Outflow (Bullish)
                else if (exchangeFlows.netFlow > 1000) supplyScore -= 15; // Major Inflow (Bearish)

                // 2. Whale Alerts Impact
                const recentWhales = whaleAlerts.filter(w => (Date.now() - w.timestamp) < 3600000); // Last hour
                recentWhales.forEach(whale => {
                    if (whale.from === 'Exchange' && whale.to === 'Wallet') supplyScore += 5; // Accumulation
                    if (whale.from === 'Wallet' && whale.to === 'Exchange') supplyScore -= 5; // Dump Risk
                });

                marketState.supplyDynamics.score = Math.max(0, Math.min(100, supplyScore));

                // Log significant supply events
                if (supplyScore > 75) console.log(`[Supply] BULLISH Supply Shock detected for ${symbol}`);
                if (supplyScore < 25) console.log(`[Supply] BEARISH Supply Shock detected for ${symbol}`);
            }

            // Step 3.8.5: Phase 2 - Intermarket Macro Bias Engine
            try {
                const macroAssets = ['DXY', 'NDX', 'US10Y'];
                const macroTrends = await Promise.all(macroAssets.map(async (m) => {
                    const h = await marketData.fetchHistory(m, '1h', 10).catch(() => null);
                    if (!h || h.length < 2) return null;
                    const change = h[h.length - 1].close - h[0].close;
                    return { symbol: m, trend: change > 0 ? 'BULLISH' : 'BEARISH' };
                }));

                const macroMap = {};
                macroTrends.forEach(t => { if (t) macroMap[t.symbol] = t; });

                marketState.macroBias = macroBiasEngine.calculateMacroBias(assetClass, macroMap);
                console.log(`[MacroEngine] AssetClass: ${assetClass}, Global Bias: ${marketState.macroBias.bias}, Action: ${marketState.macroBias.action}`);
            } catch (macroErr) {
                console.warn('[Analysis] Macro Bias Engine failed:', macroErr.message);
            }

            // Step 3.9: Institutional Hazard Detection (Phase 38 & 39)
            const activeShock = await newsShockEngine.getActiveShock(symbol);
            marketState.activeShock = activeShock;
            marketState.hazards = ExecutionHazardDetector.detectHazards(candles, marketState, assetParams);


            // Step 3.8.6: Phase 6 - Intermarket Lead-Lag Analysis (The "Crystal Ball")
            try {
                // In a real env, we would fetch DXY/US10Y candles here.
                // For now, we reuse the macroTrends data if available, or fetch fresh if needed.
                // We'll try to use the 'DXY' correlation data we likely fetched in Step 3.8.5
                // Note: LeadLagEngine needs CANDLES, not just trend.

                const dxyHistory = await marketData.fetchHistory('DXY', '1h', 100).catch(() => null);
                if (dxyHistory) {
                    const leadLag = LeadLagEngine.analyze(candles, dxyHistory);
                    marketState.leadLag = leadLag;
                    if (leadLag && leadLag.detected) {
                        console.log(`[LeadLag] ${leadLag.leader} leads ${symbol} by ${leadLag.lag} periods. Implication: ${leadLag.implication}`);
                    }

                    // Phase 6: Elite Accuracy - Inter-Market Vector (IMV)
                    const imv = DXYCorrelationEngine.calculateIMV(candles, dxyHistory);
                    marketState.imv = imv;
                    if (imv.bias !== 'NEUTRAL') {
                        console.log(`[IMV Engine] Institutional Divergence Detected: ${imv.bias} (Strength: ${imv.strength})`);
                    }
                }

                // Phase 6: Genetic Signature Refinement (Compatibility Check)
                const gsrMatch = gsRefiner.analyzeCompatibility(symbol, candles);
                marketState.gsrMatch = gsrMatch;
                if (gsrMatch.rating !== 'NEUTRAL') {
                    console.log(`[GSR Engine] Genetic Match Rating for ${symbol}: ${gsrMatch.rating} (${Math.round(gsrMatch.compatibility * 100)}%)`);
                }

                // Phase 6: Liquidity Void Heatmap (LVH)
                const voids = LiquidityVoidHeatmap.generateHeatmap(candles);
                marketState.liquidityVoids = voids;

                // Phase 6: MTF Equilibrium Tracking
                const equilibrium = MTFEquilibriumTracker.analyze(marketState);
                marketState.equilibrium = equilibrium;
            } catch (err) {
                console.warn('[Analysis] Lead-Lag Engine failed:', err.message);
            }

            // Phase 71: Velocity & Last Candle for Predictive Intelligence Upgrade
            marketState.lastCandle = lastCandle;
            marketState.velocity = this._calculateVelocity(candles, marketState.atr);

            // Step 3.8.7: Phase 6 - Automated Hyperparameter Tuning
            // Optimize RSI period based on recent volatility/regime
            let optimizedParams = { rsiPeriod: 14 };
            try {
                const optRSI = ParameterOptimizer.optimizeRSI(candles);
                if (optRSI) optimizedParams.rsiPeriod = optRSI.period;
                marketState.optimizedParams = optimizedParams;
            } catch (err) {
                console.warn('[Analysis] Parameter Optimizer failed:', err.message);
            }

            // Phase 80: Professional Indicator Layer (Integrated on Request)
            marketState.indicators = {
                obv: calculateOBV(candles),
                mfi: calculateMFI(candles, 14),
                cmf: calculateCMF(candles, 20),
                adx: calculateADX(candles, 14),
                ichimoku: calculateIchimoku(candles),
                vwap: calculateAnchoredVWAP(candles, 0), // Session start anchor ideally
                // Use OPTIMIZED RSI
                rsi: calculateRSI(candles, optimizedParams.rsiPeriod)
            };

            // Phase 48: Volume Profile Analysis (VPVR)
            try {
                // Calculate Session Profiles (Day/Session based)
                const volumeProfiles = VolumeProfileAnalyzer.calculateSessionProfiles(candles);

                // Get the most recent profile (current session)
                const currentProfile = volumeProfiles.length > 0 ? volumeProfiles[volumeProfiles.length - 1] : null;

                marketState.volumeProfile = {
                    profiles: volumeProfiles,
                    current: currentProfile,
                    poc: currentProfile ? currentProfile.poc : null,
                    val: currentProfile ? currentProfile.val : null,
                    vah: currentProfile ? currentProfile.vah : null
                };

                // Create Visual Annotation (Phase 48 Visualization)
                if (currentProfile) {
                    const vpAnnotation = new VolumeProfile(currentProfile, {
                        side: 'RIGHT',
                        width: 0.15, // 15% width
                        timeframe: marketState.timeframe
                    });

                    // Add to baseAnnotations or ensure it gets picked up
                    // We'll attach it to marketState for now, and push to annotations later
                    marketState.vpAnnotation = vpAnnotation;
                    baseAnnotations.push(vpAnnotation);
                }
            } catch (vpError) {
                console.warn(`[Analysis] Volume Profile failed:`, vpError.message);
            }


            // Step 3.4.6: Classic Pivot Point Confluence (Phase 102)
            try {
                marketState.pivots = {
                    classic: computePivotPoints(candles, 'CLASSIC'),
                    woodie: computePivotPoints(candles, 'WOODIE'),
                    camarilla: computePivotPoints(candles, 'CAMARILLA')
                };
            } catch (pivotErr) {
                console.warn('[Analysis] Pivot calculation failed:', pivotErr.message);
            }


            // --- NEW PREDICTIVE FORECASTING LAYER ---

            // 1. Regime Transition Prediction
            const transitionPrediction = new RegimeTransitionPredictor().predictNextRegime(
                marketState,
                allStructures,
                consolidations
            );
            marketState.regimeTransition = transitionPrediction;

            // 2. Probabilistic Forecasting (Continuation vs Reversal)
            let probabilities = { long: 0.5, short: 0.5 };
            try {
                probabilities = await ProbabilisticEngine.generatePredictions(symbol, marketState);
            } catch (probError) {
                console.warn(`[Analysis] Probabilistic Engine failed:`, probError.message);
            }
            marketState.probabilities = probabilities;

            // 3. HTF Path Projection (Roadmap)
            // Use MTF data if available, otherwise fallback to current TF for structure (less ideal)
            const mtfForProjection = mtfData || { [timeframe]: candles };
            const roadmap = PathProjector.generateRoadmap(marketState, mtfForProjection);
            marketState.roadmap = roadmap;

            // 4. Analysis Result Construction (Pre-Scenario)
            // We inject these early so scenarios can access them if needed

            // Step 3.9.5: Prediction Accuracy Upgrade (Layer 1 & 2)
            // Detect Market Obligations (Liquidity Magnets / Unfinished Business)
            const obligationAnalysis = MarketObligationEngine.detectObligations(marketState, candles);
            marketState.obligations = obligationAnalysis;
            marketState.primaryMagnet = obligationAnalysis.primaryObligation;
            marketState.obligationState = obligationAnalysis.state;

            // Step 4.2: Institutional Cycle Intelligence (Phase 3 AMD)
            const amdCycle = AMDEngine.detectCycle(candles, marketState.session);
            marketState.amdCycle = amdCycle;

            // Step 4.2.1: Wyckoff Phases (Phase 4 - Enhanced Accumulation/Distribution)
            const wyckoffPhase = WyckoffEngine.detectPhase(candles, marketState);
            marketState.wyckoffPhase = wyckoffPhase;

            // Step 4.3: Pattern Learning (Fractal Recognition)
            // Finds similar historical patterns to boost confidence
            const fractalPatterns = this.learningEngine.findSimilarPatterns(candles);
            marketState.patterns = fractalPatterns;

            // Step 4.4: Momentum Cluster Indicators (Phase 76)
            const stochastic = calculateStochastic(candles, 14, 3);
            const rsi = calculateRSI(candles, 14);
            const macd = calculateMACD(candles, 12, 26, 9);

            marketState.stochastic = stochastic;
            marketState.indicators = { ...marketState.indicators, rsi, macd };

            // Adjust fundamental alignment based on news shock (Phase 39)
            if (activeShock && activeShock.severity === 'HIGH') {
                fundamentals.suitabilityPenalty = 0.4; // 40% reduction for AI setups
            }

            // Phase 7: Autonomous Alpha Learning (Reliability & Leaks)
            const alphaStats = (typeof alphaTracker.getReliability === 'function')
                ? alphaTracker.getReliability()
                : alphaTracker.getAllStats();
            const alphaLeaks = AlphaLeakDetector.detectLeaks(marketState.regime, alphaStats);
            marketState.alphaMetrics = alphaStats;
            marketState.alphaLeaks = alphaLeaks;

            // Phase 5: Cross-Asset & Macro Intelligence
            // COT (Commitment of Traders) positioning
            const cotData = COTDataService.getPositioning(symbol, marketState);
            marketState.cot = cotData;

            // Commodity Correlations
            const commodityCorr = await CommodityCorrelationEngine.analyze(symbol, candles, marketState);
            marketState.commodityCorr = commodityCorr;

            // Step 5: Select setup candidates (Multi-directional)
            const performanceWeights = await StrategyPerformanceTracker.getAllStrategyWeights(marketState.regime);
            const selection = this.strategySelector.selectStrategy(
                marketState,
                assetClass,
                fundamentals,
                performanceWeights
            );

            // Step 6: Generate Setup A, B, C, D
            let setups = [];
            const candidates = [...selection.long.slice(0, 2), ...selection.short.slice(0, 2)];

            // If candidates are unbalanced, fill with best 'all' options
            if (candidates.length < 4) {
                selection.all.forEach(c => {
                    if (candidates.length < 4 && !candidates.find(cand => cand.strategy.name === c.strategy.name)) {
                        candidates.push(c);
                    }
                });
            }

            // Phase 55: Parallelize Candidate Evaluation
            let Gate;
            try {
                const module = await import('../analysis/DirectionalConfidenceGate.js');
                Gate = module.DirectionalConfidenceGate;
            } catch (err) {
                console.error('[Orchestrator] Dynamic Import Failed:', err);
            }

            const candidateResults = await Promise.all(candidates.map(async (c) => {
                const direction = selection.long.includes(c) ? 'LONG' : 'SHORT';

                try {
                    // Phase 3: Alpha Leak Guard
                    // If this strategy is leaking alpha in the current regime, skip it
                    const leak = marketState.alphaLeaks?.find(l => l.engine === c.strategy.name);
                    if (leak && leak.severity === 'HIGH') {
                        // console.log(`Skipped ${c.strategy.name} due to High Severity Alpha Leak in ${marketState.regime}`);
                        return null;
                    }

                    // 1. Generate annotations & extract risk
                    const annotations = c.strategy.generateAnnotations(candles, marketState, direction);
                    let riskParams = this.extractRiskParameters(annotations);

                    // 2. Refinement & Adjustment (Phase 1: Liquidity)
                    if (marketState.orderBook) {
                        this.refineLevelsWithLiquidity(riskParams, marketState, direction);
                    }

                    // 3. Refinement & Adjustment (Phase 2: Volatility)
                    // Apply volatility adjustments BEFORE final geometry validation
                    if (marketState.volatility && riskParams.targets?.length > 0 && riskParams.entry) {
                        const entryPrice = riskParams.entry.optimal;
                        riskParams.targets.forEach(t => {
                            const baseDistance = t.price - entryPrice;
                            const adjustedDistance = VolatilityEngine.adjustTargetForVolatility(baseDistance, marketState.volatility);
                            // Corrected logic: Use addition to preserve direction from baseDistance sign
                            t.price = entryPrice + adjustedDistance;
                        });
                    }

                    // 4. Final Geometry Validation & Safety Guards
                    // Ensures SL/TP are never flipped regardless of engine adjustments
                    riskParams = AnalysisOrchestrator._verifyTargetGeometry(riskParams, direction, marketState.atr);

                    // 5. Sync back to annotations for visualization
                    if (marketState.orderBook) {
                        this.updateAnnotationsWithRefinements(annotations, riskParams, marketState);
                    }

                    // 2. Heavy Parallel Checks (Bayesian + Gate)
                    let validation = { isValid: true, confidence: 0.5 }; // Default fallback
                    let bayesianStats;

                    if (Gate) {
                        try {
                            [bayesianStats, validation] = await Promise.all([
                                bayesianEngine.getPosteriorCredibility(symbol, c.strategy.name, marketState.regime),
                                Gate.validateDirection({ ...c, direction, ...riskParams }, marketState, candles, symbol)
                            ]);
                        } catch (e) {
                            console.error('[Orchestrator] Validation Error:', e);
                            bayesianStats = await bayesianEngine.getPosteriorCredibility(symbol, c.strategy.name, marketState.regime);
                        }
                    } else {
                        // Fallback if Gate missing
                        bayesianStats = await bayesianEngine.getPosteriorCredibility(symbol, c.strategy.name, marketState.regime);
                    }

                    // Skip low confidence OR invalid direction
                    if (!validation.isValid || validation.confidence < 0.3) return null;

                    // 3. Scoring
                    const edgeAnalysis = EdgeScoringEngine.calculateScore(
                        { ...c, direction, ...riskParams },
                        marketState,
                        bayesianStats,
                        symbol
                    );

                    let quantScore = edgeAnalysis.score * 10;

                    // Phase 3: Pattern Verification Boost
                    // Phase 3: Pattern Verification Boost (Now handled in EdgeScoringEngine)
                    if (marketState.patterns && marketState.patterns.prediction === direction) {
                        c.rationale += ` + Fractal Confirmation (${marketState.patterns.confidence ? (marketState.patterns.confidence * 100).toFixed(0) : '0'}%)`;
                    }

                    // 4. Execution Trigger: Candle Confirmation
                    // Ensure the latest candle supports our entry (e.g. rejection wick)
                    const trigger = ExecutionTrigger.verifyCandleConfirmation(lastCandle, direction);
                    if (!trigger.isConfirmed) {
                        // We deduct points but don't hard block unless it's a breakout strategy
                        // Ideally we would set status = 'PENDING_CONFIRMATION'
                        quantScore -= 10;
                        c.rationale += ` [WAIT: ${trigger.reason}]`;
                    } else {
                        quantScore += 5;
                        c.rationale += ` [CONFIRMED: ${trigger.reason}]`;
                    }


                    // --- RISK & SIZING LOGIC ---
                    const capitalScore = this.calculateCapitalFriendliness(marketState, assetParams);
                    const capitalTag = capitalScore > 0.8 ? 'Institutional / Low Margin' :
                        capitalScore > 0.5 ? 'Moderate Capital Required' : 'High Margin / Advanced';

                    const hasRiskParams = riskParams && riskParams.entry && riskParams.stopLoss;
                    const stopDistance = hasRiskParams ? Math.abs(riskParams.entry.optimal - riskParams.stopLoss) : 0;

                    // --- INSTITUTIONAL POSITION SIZING (Phase 68) ---
                    // Use TradeManagementEngine for risk-adjusted, context-aware sizing
                    const winRate = (performanceWeights[c.strategy.name] || {}).winRate || 0.45;
                    const riskReward = (riskParams.targets?.length > 0) ? (Math.abs(riskParams.targets[0].price - riskParams.entry.optimal) / stopDistance) : 2.0;

                    // Context for dynamic risk calculation
                    const riskContext = {
                        confidence: quantScore / 100, // 0.0 to 1.0
                        volatility: marketState.volatility?.level === 'HIGH' ? 2.5 : marketState.volatility?.level === 'MEDIUM' ? 1.5 : 1.0,
                        eventRisk: marketState.eventRisk || null
                    };

                    const dynamicRisk = hasRiskParams ? TradeManagementEngine.calculateDynamicRisk(
                        { equity: accountSize, riskPerTrade: 0.01 }, // Base 1% risk
                        riskParams.entry.optimal,
                        riskParams.stopLoss,
                        riskContext
                    ) : { units: 0, riskPercent: 0.01, warning: null };

                    const suggestedSize = dynamicRisk.units;
                    const riskPercentage = dynamicRisk.riskPercent ? (dynamicRisk.riskPercent * 100).toFixed(2) : '1.00';
                    const sizingWarning = dynamicRisk.warning;

                    // Execution Complexity
                    const executionComplexity = this.calculateExecutionComplexity(marketState, assetParams);

                    // Precision Execution
                    const executionPrecision = AssetClassAdapter.calculateExecutionPrecision(assetClass, timeframe, marketState.atr, lastCandle.time);
                    const precisionBuffer = executionPrecision.dynamicBuffer || 0;

                    // Dynamic Order Type Selection
                    const orderType = ExecutionEngine.getOptimalOrderType(marketState.volatility);

                    const augmentedEntry = riskParams.entry ? {
                        ...riskParams.entry,
                        optimal: direction === 'LONG' ? riskParams.entry.optimal + precisionBuffer : riskParams.entry.optimal - precisionBuffer,
                        hasBuffer: true,
                        type: orderType // LIMIT or STOP_MARKET
                    } : null;

                    // Consensus & News
                    // Consensus adjustment now handled in EdgeScoringEngine
                    let newsPenalty = fundamentals.suitabilityPenalty || 0;

                    // News Directional Conflict Check (Phase 5)
                    const newsAdvice = fundamentals.impact?.newsAdvice;
                    if (newsAdvice === 'BUY' && direction === 'SHORT') newsPenalty += 0.2;
                    if (newsAdvice === 'SELL' && direction === 'LONG') newsPenalty += 0.2;

                    // News Shock Force-Veto (Phase 15 Upgrade)
                    const newsShockPenalty = await newsShockEngine.calculateSuitabilityPenalty(symbol, direction);
                    if (newsShockPenalty > 0) {
                        newsPenalty += newsShockPenalty;
                        c.rationale += ` | NEWS SHOCK: Imminent Institutional Volatility (-${(newsShockPenalty * 100).toFixed(0)}%)`;
                    }

                    const finalSuitability = Math.max(0.1, c.suitability - newsPenalty);
                    const finalQuantScore = Math.max(0, quantScore - (newsPenalty * 100));

                    // Fractal guards
                    const fractalHandshake = verifyFractalHandshake(marketState, direction);

                    return {
                        ...c,
                        direction,
                        entryZone: augmentedEntry,
                        stopLoss: riskParams.stopLoss,
                        targets: riskParams.targets,
                        rr: riskParams.targets[0]?.riskReward || 0,
                        edgeAlpha: edgeAnalysis.score,
                        directionalConfidence: validation.confidence,
                        confidenceChecks: validation.failedChecks,
                        isHighConfidence: validation.isValid,
                        bayesianStats,
                        quantScore: finalQuantScore,
                        suitability: finalSuitability,
                        timeframe: marketState.timeframe || timeframe, // Ensure timeframe is available for profile optimization
                        fractalHandshake,
                        capitalScore,
                        capitalTag,
                        suggestedSize,
                        riskPercentage,
                        sizingWarning,
                        executionPrecision,
                        annotations,
                        rationale: (() => {
                            let baseRationale = (newsAdvice && ((newsAdvice === 'BUY' && direction === 'SHORT') || (newsAdvice === 'SELL' && direction === 'LONG')))
                                ? `[NEWS CONFLICT] ${direction} opportunity detected via ${c.strategy.name} despite fundamental headwinds. Trend: ${marketState.mtf.globalBias}.`
                                : `${direction} opportunity detected via ${c.strategy.name}. Trend: ${marketState.mtf.globalBias}. Institutional Volume: ${marketState.volumeAnalysis.isInstitutional ? 'DETECTED' : 'LOW'}.`;

                            // Apply Macro Bias Veto/Boost Rationale (Phase 2)
                            if (marketState.macroBias) {
                                const setupProxy = { direction, suitability: finalSuitability, rationale: '' };
                                macroBiasEngine.applyVeto(setupProxy, marketState.macroBias);
                                if (setupProxy.rationale) {
                                    baseRationale = `${setupProxy.rationale} | ${baseRationale}`;
                                }
                            }
                            return baseRationale;
                        })(),
                        monteCarlo: !isLight ? monteCarloService.runSimulation({
                            winRate: winRate ? (winRate * 100).toFixed(0) : '0',
                            profitFactor: riskReward,
                            totalTrades: 100
                        }, 500, 30, accountSize) : null,
                        fundamentals: fundamentals, // Attach news context
                        tacticalSetup: marketState.tacticalSetup // Attach tactical context
                    };
                } catch (e) {
                    console.error(`Candidate evaluation failed for ${c.strategy.name}:`, e.message);
                    return null;
                }
            }));

            setups = candidateResults
                .filter(r => r !== null)
                .sort((a, b) => b.quantScore - a.quantScore)
                .slice(0, 4)
                .map((s, idx) => ({
                    ...s,
                    id: String.fromCharCode(65 + idx),
                    name: `Setup ${String.fromCharCode(65 + idx)}: ${s.strategy.name}`
                }));

            // Phase 2 Upgrade: Inject Trade Management & Risk Visuals
            setups.forEach(s => {
                // 1. Dynamic Risk Calculation
                const riskAdvice = TradeManagementEngine.calculateDynamicRisk(
                    { equity: accountSize, riskPerTrade: 0.01 }, // Default 1% risk
                    s.entryZone?.optimal,
                    s.stopLoss,
                    {
                        confidence: s.suitability,
                        volatility: marketState.volatility?.percentile, // Assuming percentile exists or use ATR
                        eventRisk: marketState.eventRisk
                    }
                );

                if (riskAdvice) {
                    s.riskAdvice = riskAdvice;
                    if (riskAdvice.warning) s.warnings = [...(s.warnings || []), riskAdvice.warning];
                }

                // 2. Smart Trailing Stop
                const trailing = TradeManagementEngine.getTrailingStopAdvice(candles, s.direction, s.stopLoss);
                s.trailingStop = trailing;

                // 3. Create TargetProjection Annotations for Chart
                // Stop Loss
                s.annotations.push(new TargetProjection(
                    s.stopLoss,
                    'STOP_LOSS',
                    {
                        label: `SL (${trailing ? 'Trailing' : 'Fixed'})`,
                        color: '#ef4444',
                        timeframe
                    }
                ));

                // Targets
                if (s.targets && s.targets.length > 0) {
                    s.targets.forEach((t, i) => {
                        s.annotations.push(new TargetProjection(
                            t.price,
                            `TARGET_${i + 1}`,
                            {
                                label: `TP ${i + 1} (${t.riskReward ? t.riskReward.toFixed(1) : '2.0'}R)`,
                                color: '#10b981',
                                probability: t.probability || 0.5,
                                timeframe
                            }
                        ));
                    });
                }

                // 4. Auto-Track High Confidence Signals (Phase 13)
                if (s.suitability > 0.8 && s.isHighConfidence) {
                    signalManager.trackSignal(symbol, s);
                }
            });

            // Phase 40: Optimize for Trader Profile
            this.optimizeForProfile(setups, marketState.profile);

            // Phase 3: Event Block Check - Prevent trades during high-impact events
            const eventBlock = eventBlocker.checkEventBlock(symbol, calendarEvents, 30); // 30min buffer
            if (eventBlock.isBlocked) {
                // Hard block: Remove all setups and inject warning
                setups.forEach(s => {
                    s.isBlocked = true;
                    s.blockReason = eventBlock.reason;
                });
                marketState.eventBlock = eventBlock;
            } else if (eventBlock.isWarning) {
                // Soft warning: Keep setups but add warning notice
                setups.forEach(s => {
                    s.eventWarning = eventBlock.reason;
                });
                marketState.eventWarning = eventBlock;
            }

            // Step 6.1: Generate Scenarios (Phase 5)
            const statsForScenarios = {};
            for (const setup of setups) {
                statsForScenarios[setup.strategy] = await StrategyPerformanceTracker.getStrategyPerformance(setup.strategy, marketState.regime);
            }

            // Phase 1: Get backtesting performance metrics to influence scenario generation
            const backtestMetrics = backtestingEngine.getPerformanceMetrics(symbol);
            const confidenceAdjustment = backtestingEngine.getConfidenceAdjustment(symbol, marketState.regime);

            const rawScenarios = ScenarioEngine.generateScenarios(marketState, setups, fundamentals, statsForScenarios);
            const scenarios = rawScenarios;

            // Phase 50: Scenario Weighting & Selection
            const dominantScenarioData = ScenarioWeighting.selectDominantScenario(rawScenarios.all, marketState, probabilities);

            marketState.scenarios = rawScenarios;
            marketState.dominantScenario = dominantScenarioData;
            marketState.prediction = {
                bias: dominantScenarioData.bias,
                confidence: dominantScenarioData.confidence * confidenceAdjustment, // Apply backtesting adjustment
                horizon: '24H',
                nextLikelyRegime: transitionPrediction.expectedRegime,
                transitionProbability: transitionPrediction.probability,
                backtestMetrics // Include for transparency
            };

            // Phase 1: Record prediction for future backtesting verification
            backtestingEngine.recordPrediction(symbol, Date.now(), {
                dominantScenario: dominantScenarioData.bias,
                probabilities: {
                    up: rawScenarios.upProb || scenarios.all.find(s => s.direction === 'up')?.probability || 0,
                    down: rawScenarios.downProb || scenarios.all.find(s => s.direction === 'down')?.probability || 0,
                    range: rawScenarios.rangeProb || scenarios.all.find(s => s.direction === 'neutral')?.probability || 0
                },
                currentPrice: marketState.currentPrice,
                regime: marketState.regime,
                setup: setups[0]?.strategy || 'NONE'
            });

            // --- Phase 4: News Intelligence Layer ---
            if (!isLight) this.applyNewsIntelligence(marketState, setups, fundamentals);

            // --- Institutional Zone Intelligence (15 Types) ---

            // 0. SMT Divergences (Phase 25)
            if (marketState.divergences && marketState.divergences.length > 0) {
                marketState.divergences.forEach(d => baseAnnotations.push(d));
            }


            const srLevels = SRDetector.detectLevels(candles, significantSwings);
            // Use pre-fetched calendarEvents instead of legacy empty getEvents()
            const events = calendarEvents || [];

            // 1. Supply & Demand Zones
            // Using a simplified detection or reusing fvgs as a proxy for supply/demand
            fvgs.forEach((f) => {
                baseAnnotations.push(new SupplyDemandZone(
                    f.top, f.bottom, candles[f.index].time,
                    f.type.includes('BULLISH') ? 'DEMAND' : 'SUPPLY',
                    { timeframe, strength: 'medium', note: 'FVG Imbalance' }
                ));
            });

            // 2. Order Blocks (Phase 15 Requirement)
            const obs = SmartMoneyConcepts.detectOrderBlocks(candles);

            // Phase 71: Store order blocks in marketState for predictive layer
            marketState.orderBlocks = obs;

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

            // 6. Structure Markers (Phase 15 Requirement)
            allStructures.filter(s => ['BOS', 'CHOCH', 'HH', 'LL', 'HL', 'LH'].includes(s.markerType)).forEach(s => {
                // Return to StructureMarker for line-based visuals as requested by "working logic"
                baseAnnotations.push(new StructureMarker(
                    { price: s.price, time: s.time },
                    s.markerType,
                    { timeframe, significance: s.significance }
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
            if (marketState.session && marketState.session.active) {
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
            events.filter(e => e.impact === 'HIGH').forEach(e => {
                baseAnnotations.push(new NewsImpactZone(
                    e.type || e.title, e.impact, e.timestamp || e.time,
                    marketState.currentPrice * 1.01,
                    marketState.currentPrice * 0.99,
                    {
                        timeframe,
                        tier: newsService.getTier(e.type || e.title),
                        forecast: e.forecast,
                        previous: e.previous,
                        actual: e.actual,
                        unit: e.unit
                    }
                ));
            });

            // 12.5: Market Obligation Magnets (Phase 52)
            if (marketState.obligations?.obligations) {
                marketState.obligations.obligations.forEach(mag => {
                    // Create a horizontal line annotation for the magnet
                    baseAnnotations.push({
                        id: `magnet-${mag.type}-${mag.price}`,
                        type: 'MAGNET_LINE',
                        price: mag.price,
                        urgency: mag.urgency,
                        magnetType: mag.type,
                        label: `🧲 ${mag.type.replace('_', ' ')} (${mag.urgency})`,
                        color: mag.type.includes('BULLISH') || mag.type.includes('BUY') ? '#00ff00' : '#ff0000',
                        style: 'DASHED',
                        visible: true
                    });
                });
            }

            // 13. Time-Based Zones (Phase 15 Requirement)
            if (marketState.session && marketState.session.killzone) {
                baseAnnotations.push(new TimeBasedZone(
                    `${marketState.session.killzone} Window`,
                    lastCandle.time - 7200, // 2h killzone
                    lastCandle.time,
                    { timeframe }
                ));
            }


            // 14. Liquidity Heatmap (Phase 18)
            if (marketState.orderBook && marketState.orderBook.bids && marketState.orderBook.asks) {
                // Update Engine with current snapshot
                liquidityHeatmapEngine.update(
                    marketState.orderBook,
                    marketState.currentPrice,
                    Date.now()
                );

                // Retrieve active blocks (Persistent Walls)
                const heatmapBlocks = liquidityHeatmapEngine.getHeatmapBlocks(Date.now());

                heatmapBlocks.forEach(block => {
                    baseAnnotations.push(new OrderFlowHeatmap({
                        heatmap: [], // Not used for blocks
                        walls: [],   // Not used for blocks - we map individual blocks
                        maxIntensity: 1 // Placeholder
                    }, {
                        id: `liq-block-${block.id}`,
                        type: 'LIQUIDITY_HEATMAP_BLOCK',
                        coordinates: {
                            startTime: block.startTime,
                            endTime: block.endTime,
                            price: block.price
                        },
                        volume: block.volume,
                        currentVolume: block.currentVolume,
                        side: block.side,
                        label: `🧱 ${block.side} WALL`,
                        isActive: block.isActive
                    }));
                });
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

            // 14. Phase 16: Whale Alerts
            if (marketState.supplyDynamics && marketState.supplyDynamics.whaleAlerts) {
                marketState.supplyDynamics.whaleAlerts.forEach(whale => {
                    // Determine sentiment based on flow
                    let sentiment = 'NEUTRAL';
                    if (whale.from === 'Exchange' && whale.to === 'Wallet') sentiment = 'BULLISH';
                    if (whale.from === 'Wallet' && whale.to === 'Exchange') sentiment = 'BEARISH';

                    baseAnnotations.push(new WhaleAlert(
                        whale.hash,
                        whale.symbol,
                        whale.valueUsd,
                        whale.from,
                        whale.to,
                        whale.timestamp,
                        sentiment
                    ));
                });
            }

            // Step 3.4.6: Consolidated Volume Annotations (Phase 55)
            if (!isLight && marketState.volumeProfile) {
                baseAnnotations.push(new VolumeProfile(marketState.volumeProfile, {
                    side: 'RIGHT',
                    width: 0.15,
                    timeframe
                }));
            }

            // Forex proxies for Binance Spot (as Binance Spot doesn't have direct Forex pairs)
            const forexBinanceProxies = {
                'USDJPY': 'USDTJPY',
                'USDCHF': 'USDCAD', // Use USDCAD as a general USD flow proxy for CHF if missing
                'USDCAD': 'USDTBRL', // Binance has USDTBRL, proxy for general CAD-like commodity flow
                'USDTRY': 'USDTTRY',
                'USDZAR': 'USDTZAR',
                'USDMXN': 'USDTMXN',
                'USDBRL': 'USDTBRL',
                'USDRUB': 'USDTRUB',
            };

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
                // Phase 53: Structure Validation Gate
                // Reject trade if a CHoCH against direction happened within last 5 bars
                // This prevents "catching a falling knife" right after structure breaks
                const recentCandles = candles.slice(-5);
                const opposingChoch = marketState.structuralEvents.find(c => {
                    if (!c.metadata) return false;
                    // Normalize directions
                    const chochDir = c.metadata.direction === 'BULLISH' ? 'LONG' : 'SHORT';
                    return chochDir !== s.direction && recentCandles.some(rc => rc.time === c.time);
                });

                if (opposingChoch) {
                    // console.log(`Dropped ${s.name} due to recent opposing CHoCH at ${new Date(opposingChoch.time * 1000).toISOString()}`);
                    return false;
                }

                const minScore = 48; // Relaxed from 55 for increased alpha visibility
                if (s.quantScore < minScore) {
                    // console.log(`Dropped ${s.name} due to low conviction (${s.quantScore})`);
                    return false;
                }
                return true;
            });

            // Phase 56: Directional Confidence Gate
            // Multi-factor validation for directional accuracy

            setups = await Promise.all(setups.map(async (s) => {
                // Use the dynamically imported Gate if available, otherwise skip validation
                const validation = Gate ?
                    await Gate.validateDirection(s, marketState, candles, symbol) :
                    { confidence: 0.5, isValid: true, failedChecks: [], checkDetails: {} };

                return {
                    ...s,
                    directionalConfidence: validation.confidence,
                    confidenceChecks: validation.failedChecks,
                    isHighConfidence: validation.isValid,
                    confidenceDetails: validation.checkDetails
                };
            }));

            // Filter out low-confidence setups (< 50% confidence for Phase 73)
            const preFilterCount = setups.length;
            setups = setups.filter(s => s.directionalConfidence >= 0.50);

            if (setups.length < preFilterCount) {
                console.log(`[CONFIDENCE GATE] Filtered ${preFilterCount - setups.length} low-confidence setups`);
            }

            if (heatmapData) {
                const heatmap = new OrderFlowHeatmap(heatmapData);
                baseAnnotations.push(heatmap);
                marketState.heatmap = heatmapData; // For AI explanation
            }

            // Step 14: Visual Institutional Markers (Phase 4 Integration)
            if (marketState.primaryMagnet) {
                baseAnnotations.push(new InstitutionalLevel(
                    marketState.primaryMagnet.price,
                    marketState.primaryMagnet.price > marketState.currentPrice ? 'SUPPLY' : 'DEMAND',
                    {
                        label: `Institutional Magnet (${marketState.primaryMagnet.urgency ? marketState.primaryMagnet.urgency.toFixed(0) : '50'}%)`,
                        isInstitutional: true,
                        isMagnet: true,
                        urgency: marketState.primaryMagnet.urgency
                    }
                ));
            }

            if (marketState.amdCycle && marketState.amdCycle.phase !== 'UNKNOWN') {
                const recent24 = candles.slice(-24);
                const startTime = recent24[0]?.time || (lastCandle.time - 86400 * 1000);
                baseAnnotations.push(new SessionZone(
                    marketState.amdCycle.phase,
                    startTime,
                    lastCandle.time,
                    Math.max(...recent24.map(c => c.high)),
                    Math.min(...recent24.map(c => c.low)),
                    {
                        killzone: marketState.amdCycle.phase === 'MANIPULATION',
                        note: `AMD Phase: ${marketState.amdCycle.phase}`
                    }
                ));
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
                marketState,
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
                overallConfidence: await this.calculateOverallConfidence(marketState, setups[0]?.suitability || 0, setups[0]),
                fundamentalAlignment: aligned,

                // Performance metadata
                performanceWeights,

                // Economic News Overlays (Phase 9 Integration)
                newsEvents: [...realNews, ...calendarEvents].sort((a, b) => (b.timestamp || b.time) - (a.timestamp || a.time))
            };

            // 5. Inject News Shocks (Phase 22) - Reusing pre-fetched calendarEvents (Phase 55)
            if (calendarEvents && Array.isArray(calendarEvents)) {
                calendarEvents.forEach(shock => {
                    const shockAnno = new NewsShock(
                        shock.type,
                        shock.timestamp,
                        shock.impact,
                        shock.asset,
                        { forecast: shock.forecast, previous: shock.previous }
                    );

                    // Add to global annotations for chart visibility
                    baseAnnotations.push(shockAnno);
                });
            }

            // Step 10: COMPREHENSIVE PREDICTIVE FORECASTING ENGINE (Phase 50)

            // 10.0: Check for Cooldown/Suppression (Phase 51)
            const symbolCooldown = _cooldowns.get(symbol);
            const isCooldownActive = symbolCooldown && Date.now() < symbolCooldown.expiresAt;

            // Periodically evaluate pending outcomes (receipt generation)
            // SKIPPED in Light Mode (Firebase Query)
            if (!isLight) {
                // Phase 55: Non-blocking tracking (1.5s timeout)
                try {
                    const timeoutTracker = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Tracking evaluation timed out')), 1500)
                    );
                    await Promise.race([
                        PredictionTracker.evaluatePending(symbol, lastCandle),
                        timeoutTracker
                    ]);
                } catch (e) {
                    // console.warn(`[Analysis] Tracking skipped: ${e.message}`);
                }
            }

            // 10.1: Calculate probabilities (Phase 50 Upgrade)
            // 10.1: Calculate probabilities (Phase 50 Upgrade)
            // 10.1: Probabilities already calculated in Phase 50 Upgrade above (line 445)
            // Reuse existing variable

            // 10.2: Apply confidence decay if setup is old
            const setupAge = Date.now() - analysis.timestamp;
            if (setupAge > 0) {
                probabilities.continuation = ProbabilisticEngine.applyConfidenceDecay(probabilities.continuation, setupAge);
                probabilities.reversal = ProbabilisticEngine.applyConfidenceDecay(probabilities.reversal, setupAge);
            }

            // 10.3: Project HTF liquidity paths
            const pathProjection = PathProjector.generateRoadmap(marketState, marketState.mtf);

            // Generate visual scenarios for global annotations (Phase 50)
            const globalVisualScenarios = ScenarioEngine.getVisualScenarios(scenarios, marketState, analysis.annotations, marketState.volProfile, setups, marketState.orderBook);
            analysis.annotations.push(...globalVisualScenarios);


            // 10.4: Predict regime transition
            // 10.4: Regime transition already calculated (Phase 50 Upgrade)
            // Reuse existing variable

            // 10.5: Use existing Scenarios (Already defined in Phase 5)
            // No redeclaration needed

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

            console.log(`[Analysis] Generated ${setups.length} setups after filtering. Dominant Bias: ${dominantBias}`);
            if (setups.length > 0) {
                console.log(`[Analysis] Top Setup Score: ${setups[0].quantScore}, Confidence: ${setups[0].directionalConfidence}`);
            }

            // 10.8: Compress into single prediction (Include GSR DNA)
            const diagnostic = PredictionCompressor.shouldShowPrediction(marketState, probabilities);
            const dna = gsRefiner.extractDNA(candles.slice(-5));
            const prediction = diagnostic.show ?
                PredictionCompressor.compress(analysis, probabilities, dna) :
                {
                    bias: 'NO_EDGE',
                    target: null,
                    invalidation: null,
                    confidence: 0,
                    reason: diagnostic.reason,
                    code: diagnostic.code,
                    requirements: diagnostic.requirements,
                    timestamp: Date.now(),
                    confidenceBreakdown: { positives: [], risks: [] },
                    horizons: { immediate: 'Sideways', session: 'Wait for shift', htf: 'Neutral' }
                };


            // 10.9: Apply Suppression if Cooldown active
            if (isCooldownActive) {
                prediction.bias = 'WAIT_COOLDOWN';
                prediction.reason = `Protective cooldown active: ${symbolCooldown.reason}. Analysis suspended to prevent overtrading.`;
            }

            // 10.10: Handle Track & Outcome Receipts (Phase 51)
            // SKIPPED in Light Mode (Firebase Persistence)
            if (!isLight && prediction.bias !== 'NO_EDGE' && prediction.bias !== 'WAIT_COOLDOWN') {
                try {
                    const trackTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Tracking timed out')), 1000));
                    await Promise.race([
                        PredictionTracker.track(prediction, symbol),
                        trackTimeout
                    ]);
                } catch (e) {
                    // console.warn('[Analysis] Tracking save skipped');
                }
            }

            // 10.11: Update Cooldown Stats (Internal)
            // SKIPPED in Light Mode (Firebase Query)
            if (!isLight) {
                try {
                    PredictionTracker.warmCache(symbol);
                    // timeout to avoid analysis lag
                    const statsTimeout = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Bayesian stats fetch timed out')), 5000)
                    );
                    const stats = await Promise.race([
                        PredictionTracker.getStats(symbol),
                        statsTimeout
                    ]);

                    if (stats) {
                        metrics.bayesian = {
                            accuracy: stats.accuracy,
                            total: stats.total,
                            credibility: this._calculateCredibility(stats)
                        };
                    }
                }
                catch (e) {
                    // console.warn('[Analysis] Cooldown check skipped');
                }
            }

            // 10.12: Attach all predictive outputs to analysis
            analysis.prediction = prediction;
            analysis.probabilities = probabilities;
            analysis.pathProjection = pathProjection;
            analysis.regimeTransition = marketState.regimeTransition;
            analysis.trapZones = trapZones;
            analysis.dominantScenario = dominantScenario;
            analysis.dominantBias = dominantBias;
            analysis.fundamentals = fundamentals;
            analysis.tacticalSetup = marketState.tacticalSetup;

            // Step 10.13: Monte Carlo "Ruin" Simulation (Phase 3 Expansion)
            if (setups.length > 0) {
                const atr = calculateATR(candles, 14).pop() || (marketState.currentPrice * 0.01);
                setups.forEach(setup => {
                    const result = probabilisticRiskEngine.runMonteCarlo(setup, atr, 1000);
                    setup.mcRuin = result.ruinProbability;
                    setup.mcSuccess = result.successProbability;
                    setup.mcSafety = result.safetyScore;
                    setup.rationale = `[MC RUIN: ${setup.mcRuin}%] ${setup.rationale}`;
                });

                // Penalize setups with high risk of ruin
                setups.forEach(s => {
                    if (s.mcRuin > 60) s.suitability *= 0.5;
                    else if (s.mcRuin < 25) s.suitability *= 1.2;
                });

                // Re-sort if suitability changed
                setups.sort((a, b) => b.suitability - a.suitability);
            }

            // Step 11: Portfolio Stress & Concentration Analysis (Phase 60)
            if (!isLight && setups.length > 0) {
                try {
                    analysis.stressMetrics = {
                        var: PortfolioStressService.calculateVaR(setups, accountSize),
                        clusters: PortfolioStressService.analyzeCorrelations(setups),
                        shocks: {
                            flashCrash: PortfolioStressService.simulateShock(setups, 'FLASH_CRASH'),
                            usdShock: PortfolioStressService.simulateShock(setups, 'USD_SHOCK')
                        }
                    };

                    // Check for extreme concentration risk via PortfolioRiskService
                    const primarySetup = setups[0];
                    if (primarySetup) {
                        const concentration = portfolioRiskService.checkConcentrationRisk(symbol, primarySetup.direction);
                        analysis.portfolioHealth = {
                            isConcentrated: concentration.risky,
                            reason: concentration.reason,
                            hedgeSuggestions: portfolioRiskService.getHedgeSuggestions()
                        };
                    }
                } catch (stressError) {
                    console.warn(`[Analysis] Stress analysis failed: ${stressError.message}`);
                }
            }

            // 12.6: Link visual points back to dominant scenario for legacy compatibility 
            // (The annotations are already in analysis.annotations from globalVisualScenarios)
            if (dominantScenario?.scenario) {
                const matchingAnnotation = globalVisualScenarios.find(a => a.label?.includes(dominantScenario.scenario.label));
                if (matchingAnnotation) {
                    dominantScenario.path = matchingAnnotation.points;
                }
            }


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
                        isClusterSynced: scalpSetup.isClusterSynced,
                        rationale: scalpSetup.rationale,
                        annotations: [],
                        fundamentals: fundamentals // Attach news context
                    });
                }
            }

            // Note: analysis.divergences is already populated from marketState.divergences earlier
            analysis.divergences = marketState.divergences || [];

            return analysis;
        } catch (error) {
            console.error('Analysis orchestration failed:', error);
            if (error.stack) console.error('Stack trace:', error.stack);
            throw new Error('Failed to complete market analysis: ' + error.message + (error.stack ? '\nStack: ' + error.stack : ''));
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
                if (typeof s.strategy === 'string' && ['Order Block', 'Supply/Demand', 'Smart Money Concepts'].some(n => s.strategy.includes(n))) {
                    s.suitability *= 1.2;
                }
            }
            // Scalper Logic: Boost Scalps, Penalize Slow setups
            else if (profile === 'SCALPER') {
                if (s.strategy === 'SCALPER_ENGINE') s.suitability *= 1.5;
                if (typeof s.timeframe === 'string' && ['4h', '1d', '1w'].includes(s.timeframe.toLowerCase())) s.suitability *= 0.6;
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

        // ENTRY Refinement: Front-Run a Wall
        // If we are longing, and there is a massive Buy Wall at 100, we want to enter at 100.01
        // If we are shorting, and there is a massive Sell Wall at 100, we want to enter at 99.99
        if (riskParams.entry) {
            const protectiveWalls = direction === 'LONG' ? clusters.buyClusters : clusters.sellClusters;

            // Find a wall very close to our optimal entry
            const nearestWall = protectiveWalls
                .filter(w => Math.abs(w.price - riskParams.entry.optimal) / riskParams.entry.optimal < 0.002) // Within 0.2%
                .sort((a, b) => b.quantity - a.quantity)[0]; // Largest wall

            if (nearestWall) {
                const tickSize = 0.05; // Ideally fetch from asset adapter per symbol
                // LONG: Wall @ 100 -> Entry @ 100 + tick
                // SHORT: Wall @ 100 -> Entry @ 100 - tick
                const adjustedEntry = direction === 'LONG'
                    ? nearestWall.price + tickSize
                    : nearestWall.price - tickSize;

                // Only adjust if it improves our position or safety significantly
                riskParams.entry.optimal = adjustedEntry;
                riskParams.entry.reason = `Front-running ${nearestWall.quantity ? nearestWall.quantity.toFixed(0) : '0'} lot wall @ ${nearestWall.price}`;
            }
        }

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
    calculateInstitutionalSize(balance, baseRiskPercent, stopDistance, quantScore, assetClass, strategyWeight = 1.0) {
        if (!stopDistance || stopDistance === 0) return 0;

        // Scale risk based on Quant Score (Confidence)
        // 90% score = 100% of base risk
        // 60% score = 50% of base risk (Caution)
        const confidenceMultiplier = Math.max(0, (quantScore - 50) / 40);
        const actualRisk = balance * baseRiskPercent * confidenceMultiplier * strategyWeight;

        if (actualRisk <= 0) return 0.01;
        if (assetClass === 'FOREX') {
            // Standard Lot = 100,000 units. 1 pip movement = $10 for 1 lot.
            // Simplified pip-based estimation
            return parseFloat((actualRisk / (stopDistance * 100000)).toFixed(2)) || 0;
        } else if (assetClass === 'CRYPTO' || assetClass === 'COMMODITIES') {
            return parseFloat((actualRisk / stopDistance).toFixed(4)) || 0;
        }

        return parseFloat((actualRisk / stopDistance).toFixed(2)) || 0;
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
        if (!tf) return '#808080';
        return colors[tf.toLowerCase()] || '#808080';
    }

    /**
     * Apply News Intelligence (Phase 4)
     * Suspends/Degrades technical validity during high-impact news hazards.
     */
    applyNewsIntelligence(marketState, setups, fundamentals) {
        const proximity = fundamentals.proximityAnalysis;
        if (!proximity?.isImminent) return;

        const isHighImpact = proximity.event.impact === 'HIGH';
        const minutesToEvent = proximity.minutesToEvent || 60;

        if (isHighImpact && minutesToEvent < 15) {
            marketState.news_risk = 'EXTREME';
            marketState.technical_validity = 'SUSPENDED';
            marketState.confidence *= 0.3; // Deep degradation

            // Mark all setups as high risk
            setups.forEach(s => {
                s.quantScore *= 0.4;
                s.rationale = `⚠️ [EXTREME NEWS HAZARD] Technical validity suspended due to ${proximity.event.type || proximity.event.title} in ${Math.round(minutesToEvent)}m. ${s.rationale}`;
                s.isBlocked = true;
                s.blockReason = 'Imminent High-Impact Economic Event';
            });
        } else if (isHighImpact || minutesToEvent < 45) {
            marketState.news_risk = 'HIGH';
            marketState.technical_validity = 'DEGRADED';
            marketState.confidence *= 0.6;

            setups.forEach(s => {
                s.quantScore *= 0.7;
                s.rationale = `⚡ [HIGH VOLATILITY WARNING] ${proximity.event.type || proximity.event.title} in ${Math.round(minutesToEvent)}m. Expect slippage. ${s.rationale}`;
            });
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
    async calculateOverallConfidence(marketState, strategySuitability, setup = null) {
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

        // Phase 17: Portfolio Risk Validation
        if (setup && setup.entry && setup.stopLoss) {
            try {
                const validation = await portfolioRiskService.validateTrade({
                    symbol: symbol,
                    entry: setup.entry,
                    stopLoss: setup.stopLoss
                });

                setup.riskValidation = validation;

                if (!validation.approved) {
                    console.log(`[Risk] Trade Rejected for ${symbol}: ${validation.reason}`);
                    // Downgrade confidence or invalidate
                    score = 0;
                    marketState.signal = 'NEUTRAL'; // Force clear signal

                    // Add annotation explaining rejection
                    baseAnnotations.push({
                        type: 'RISK_REJECTION',
                        id: `risk-reject-${Date.now()}`,
                        coordinates: { time: candles[candles.length - 1].time, price: setup.entry },
                        metadata: { reason: validation.reason, code: validation.code },
                        getLabel: () => `⛔ RISK REJECT: ${validation.reason}`
                    });
                } else if (validation.sizing) {
                    setup.suggestedPositionSize = validation.sizing;
                }
            } catch (err) {
                console.warn('[Orchestrator] Correlation check failed:', err);
            }
        }

        return score;
    }

    /**
     * Phase 40: Timeframe Stacking Logic
     * Maps the current 'Entry' timeframe to its 'Context' (Truth) timeframe.
     * Enhanced to support all timeframes: 1m, 5m, 15m, 30m, 1H, 2H, 4H, D, W
     
     */
    determineContextTimeframes(currentTF) {
        if (!currentTF) return { profile: 'DAY_TRADER', contextTF: '4h', entryTF: '1h' };
        const tf = currentTF.toLowerCase();

        let profile = 'DAY_TRADER'; // Default
        let contextTF = '4h';
        let entryTF = tf;

        // SCALPER Profile: Ultra-fast execution (1m-15m)
        if (['1m', '5m', '15m'].includes(tf)) {
            profile = 'SCALPER';
            contextTF = '1h'; // Scalpers use 1H for trend confirmation
        }
        // DAY_TRADER Profile: Intraday institutional moves (30m-2H)
        else if (['30m', '1h', '2h'].includes(tf)) {

            profile = 'DAY_TRADER';
            // Use 4H for 30m/1H, use 1D for 2H

            contextTF = tf === '2h' ? '1d' : '4h';
        }
        // SWING Profile: Multi-day positions (4H-W)
        else if (['4h', '1d', 'w', '1w'].includes(tf)) {
            profile = 'SWING';
            // Use 1D for 4H, use 1W for daily, use 1M (or 1W fallback) for weekly
            if (tf === '4h') contextTF = '1d';
            else if (tf === '1d') contextTF = '1w';
            else contextTF = '1w'; // Weekly uses weekly as context (no monthly data available)
        }

        return { profile, contextTF, entryTF };
    }

    /**
     * Calculate Price Velocity (Momentum)
     * Phase 71: Higher velocity = faster price movement toward targets
     * @private
     */
    _calculateVelocity(candles, atr) {
        if (!candles || candles.length < 10) return 0;

        const recent = candles.slice(-10);
        const priceChange = Math.abs(recent[recent.length - 1].close - recent[0].close);
        const avgPrice = (recent[recent.length - 1].close + recent[0].close) / 2;
        const percentChange = (priceChange / avgPrice) * 100;

        // Normalize by ATR (volatility-adjusted momentum)
        const normalizedVelocity = atr > 0 ? percentChange / (atr / avgPrice) : 0;

        return normalizedVelocity; // >1.2 = High, <0.5 = Low
    }

    /**
     * Sync refined risk parameters back to annotations for visualization
     * Also injects "Liquidity Wall" markers if front-running occurred.
     */
    updateAnnotationsWithRefinements(annotations, riskParams, marketState) {
        // 1. Update Entry Zone
        const entryAnnotation = annotations.find(a => a.type === 'ENTRY_ZONE');
        if (entryAnnotation && riskParams.entry) {
            // Update the zone to center around the refined optimal price
            const currentOptimal = entryAnnotation.coordinates.price;
            const diff = riskParams.entry.optimal - currentOptimal;

            if (Math.abs(diff) > 0.000001) {
                entryAnnotation.coordinates.price = riskParams.entry.optimal;
                // Move zone boundaries too
                if (entryAnnotation.coordinates.top) entryAnnotation.coordinates.top += diff;
                if (entryAnnotation.coordinates.bottom) entryAnnotation.coordinates.bottom += diff;

                // Add note about front-running
                if (riskParams.entry.note && riskParams.entry.note.includes('Front-running')) {
                    entryAnnotation.note = riskParams.entry.note;

                    // Extract Wall Price from note "Front-running Liquidity Wall at X"
                    const match = riskParams.entry.note.match(/at\s([\d.]+)/);
                    if (match) {
                        const wallPrice = parseFloat(match[1]);
                        // Add a visual marker for the wall - Using correct LiquidityZone(price, type, meta) signature
                        annotations.push(new LiquidityZone(
                            wallPrice,
                            'ORDER_BOOK_WALL',
                            {
                                label: '🐳 WHALE WALL',
                                width: wallPrice * 0.001, // 0.1% width visual
                                liquidity: 'HIGH',
                                type: 'ORDER_BOOK_WALL' // Override for mapper
                            }
                        ));
                    }
                }
            }
        }

        // 2. Update Targets
        if (riskParams.targets && riskParams.targets.length > 0) {
            riskParams.targets.forEach((refinedTarget, index) => {
                // Find corresponding target annotation
                // Assuming order is preserved or matching by proximity
                const targets = annotations.filter(a => a.type === 'TARGET_PROJECTION' && a.projectionType.startsWith('TARGET_'));
                if (targets[index]) {
                    const t = targets[index];
                    if (Math.abs(t.coordinates.price - refinedTarget.price) > 0.000001) {
                        t.coordinates.price = refinedTarget.price;
                        if (refinedTarget.note) t.note = refinedTarget.note;
                    }
                }
            });
        }
    }

    /**
     * Perform deep geometry verification on trade levels
     * @private
     */
    static _verifyTargetGeometry(riskParams, direction, atr) {
        if (!riskParams || !riskParams.entry || !riskParams.stopLoss) return riskParams;

        const entry = riskParams.entry.optimal;
        const safeAtr = atr || (entry * 0.005); // Fallback to 0.5% if ATR missing

        // 1. Correct Stop Loss direction
        if (direction === 'LONG') {
            if (riskParams.stopLoss >= entry) {
                riskParams.stopLoss = entry - (safeAtr * 0.5); // Set SL below entry
            }
        } else {
            if (riskParams.stopLoss <= entry) {
                riskParams.stopLoss = entry + (safeAtr * 0.5); // Set SL above entry
            }
        }

        // 2. Correct Take Profit direction
        const risk = Math.abs(entry - riskParams.stopLoss);
        const minRR = 1.2;

        if (riskParams.targets && riskParams.targets.length > 0) {
            riskParams.targets.forEach((t, i) => {
                const minTargetDistance = (risk || safeAtr) * (minRR + (i * 0.5));

                if (direction === 'LONG') {
                    // TP must be above entry
                    if (t.price <= entry) {
                        t.price = entry + minTargetDistance;
                    }
                    // Ensure minimum RR
                    t.price = Math.max(t.price, entry + minTargetDistance);
                } else {
                    // TP must be below entry
                    if (t.price >= entry) {
                        t.price = entry - minTargetDistance;
                    }
                    // Ensure minimum RR
                    t.price = Math.min(t.price, entry - minTargetDistance);
                }

                // Final safety: RiskReward property
                t.riskReward = Math.abs(t.price - entry) / Math.max(risk, 0.000001);
            });
        }

        return riskParams;
    }
}

/**
 * Verify Fractal Handshake (Phase 5)
 * Ensures strict alignment between timeframe and market structure
 */
function verifyFractalHandshake(marketState, direction) {
    if (!marketState.trend) return false;

    const normDir = normalizeDirection(direction);
    const normTrend = normalizeDirection(marketState.trend.direction);
    const normGlobalBias = normalizeDirection(marketState.mtf?.globalBias);

    // 1. Base alignment
    if (normDir === normTrend && normDir !== 'NEUTRAL') return true;

    // 2. Counter-trend allowance (if supported by HTF or Cycle)
    if (normGlobalBias && normGlobalBias === normDir) return true;

    // 3. Cycle Exception (Catching tops/bottoms in exhaustion)
    const cycle = marketState.cycle;
    if (cycle === 'BEAR' && normDir === 'BEARISH' && normTrend === 'NEUTRAL') return true;
    if (cycle === 'BULL' && normDir === 'BULLISH' && normTrend === 'NEUTRAL') return true;

    return false;
}
