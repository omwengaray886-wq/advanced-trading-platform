import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Chart from '../components/ui/Chart';
import FullAnalysisReport from '../components/features/FullAnalysisReport';
import { marketData, getSymbolMetadata } from '../services/marketData.js';
import { TrendingUp, AlertTriangle, ShieldCheck, Activity, BarChart3, HelpCircle, LayoutGrid, Square, Sparkles, Layout, Target, BookOpen, PanelRightOpen, PanelLeftOpen, Search, History } from 'lucide-react';
import { generateTradeAnalysis } from '../services/ai.js';
import { saveTradeSetups, getMarketAnalysis, subscribeToGlobalSignals } from '../services/db.js';
import { useToast } from '../context/ToastContext';
import { backtestService } from '../services/backtestService.js';
import ChartGrid from '../components/features/ChartGrid';
import Footer from '../components/layout/Footer';
import PortfolioRiskDashboard from '../components/features/PortfolioRiskDashboard';
import SMTCorrelationHeatmap from '../components/features/SMTCorrelationHeatmap';
import TradeExecution from '../components/features/TradeExecution';
import PortfolioWidget from '../components/features/PortfolioWidget';
import DOMWidget from '../components/features/DOMWidget';
import BacktestPanel from '../components/features/BacktestPanel';
import { AnnotationMapper } from '../services/annotationMapper.js';
import { realtimeDiagnosticService } from '../services/RealtimeDiagnosticService.js';
import FullscreenControls from '../components/features/FullscreenControls';
import FullscreenDOMPanel from '../components/features/FullscreenDOMPanel';
import NewsContextPanel from '../components/features/NewsContextPanel';
import MacroCalendar from '../components/features/MacroCalendar';
import GlobalRiskHUD from '../components/features/GlobalRiskHUD';
import { proactiveMonitor } from '../services/ProactiveMonitor';
import { alertOrchestrator } from '../services/AlertOrchestrator';
import ExplanationPanel from '../components/features/ExplanationPanel';
import SentimentGauge from '../components/features/SentimentGauge';
import InstitutionalScanner from '../components/features/InstitutionalScanner';
import GlobalSignalsPanel from '../components/features/GlobalSignalsPanel';
import { signalManager } from '../services/SignalManager.js';

export default function Markets() {
    const assetRegistry = {
        'Crypto': ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT', 'DOT/USDT', 'MATIC/USDT', 'AVAX/USDT', 'LINK/USDT', 'OP/USDT', 'ARB/USDT'],
        'Forex': ['EUR/USD', 'GBP/USD', 'GBP/JPY', 'AUD/USD', 'NZD/USD', 'USD/TRY', 'USD/ZAR', 'USD/MXN', 'USD/BRL', 'USD/RUB'],
        'Metals': ['XAU/USD']
    };

    const resolveSymbol = (displayTicker) => {
        return marketData.mapSymbol(displayTicker);
    };

    // --- Advanced Visual Helpers ---
    const getSessionZones = (data) => {
        if (!data || data.length < 2) return [];

        const sessions = [
            { name: 'ASIAN', start: 0, end: 8, color: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' },
            { name: 'LONDON', start: 8, end: 16, color: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' },
            { name: 'NY', start: 13, end: 21, color: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }
        ];

        const zones = [];
        const processedDays = new Set();

        data.forEach(candle => {
            const date = new Date(candle.time * 1000);
            const dayKey = date.toISOString().split('T')[0];
            const hour = date.getUTCHours();

            sessions.forEach(session => {
                const sessionKey = `${dayKey}-${session.name}`;
                if (hour === session.start && !processedDays.has(sessionKey)) {
                    processedDays.add(sessionKey);

                    const startTime = candle.time;
                    const endTime = startTime + (session.end - session.start) * 3600;

                    const sessionData = data.filter(d => d.time >= startTime && d.time <= endTime);
                    const high = sessionData.length > 0 ? Math.max(...sessionData.map(d => d.high)) : candle.high * 1.01;
                    const low = sessionData.length > 0 ? Math.min(...sessionData.map(d => d.low)) : candle.low * 0.99;

                    zones.push({
                        id: `session-${sessionKey}`,
                        x1: startTime,
                        x2: endTime,
                        y1: high,
                        y2: low,
                        color: session.color,
                        borderColor: session.borderColor,
                        label: session.name,
                        isHTF: false,
                        role: 'NEUTRAL'
                    });
                }
            });
        });

        return zones;
    };

    const getLiquidityHeatmap = (data) => {
        if (!data || data.length < 10) return [];

        const strips = [];
        const lastCandle = data[data.length - 1];
        const currentPrice = lastCandle.close;

        const levels = [
            { price: currentPrice * 1.005, intensity: 0.9, side: 'ASK', color: 'rgba(239, 68, 68, 0.4)' },
            { price: currentPrice * 1.012, intensity: 0.8, side: 'ASK', color: 'rgba(239, 68, 68, 0.2)' },
            { price: currentPrice * 0.995, intensity: 0.9, side: 'BID', color: 'rgba(16, 185, 129, 0.4)' },
            { price: currentPrice * 0.988, intensity: 0.7, side: 'BID', color: 'rgba(16, 185, 129, 0.2)' }
        ];

        levels.forEach((l, i) => {
            strips.push({
                id: `liq-${i}`,
                price: l.price,
                intensity: l.intensity,
                side: l.side,
                color: l.color
            });
        });

        return strips;
    };

    const [selectedPair, setSelectedPair] = useState('BTC/USDT');
    const [searchQuery, setSearchQuery] = useState('');
    const [recentPairs, setRecentPairs] = useState(['BTC/USDT', 'ETH/USDT', 'XAU/USD', 'GBP/JPY']);
    const [isSearching, setIsSearching] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Crypto');
    const [timeframe, setTimeframe] = useState('15m');
    const [viewMode, setViewMode] = useState('SINGLE');
    const [showReport, setShowReport] = useState(true);
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [complexityMode, setComplexityMode] = useState('ADVANCED');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [accountSize, setAccountSize] = useState(10000);
    const [isCleanView, setIsCleanView] = useState(false);
    const [globalSignals, setGlobalSignals] = useState([]);
    const [realtimeDiag, setRealtimeDiag] = useState(null);
    const [showLeftPanel, setShowLeftPanel] = useState(true);
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [isMonitoring, setIsMonitoring] = useState(proactiveMonitor.isRunning);
    const [tickers, setTickers] = useState([]);
    const [activeDrawTool, setActiveDrawTool] = useState(null);
    const [indicators, setIndicators] = useState({
        volumeProfile: true,
        sessionZones: false,
        liquidityHeatmap: false,
        institutionalLevels: true
    });
    const [chartData, setChartData] = useState([]);
    const [manualStrategy, setManualStrategy] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [activeSetupId, setActiveSetupId] = useState('A');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [activeShock, setActiveShock] = useState(null);

    const analysisRef = useRef(false);
    const location = useLocation();

    // Initialize Real-time Diagnostics (Phase 75)
    useEffect(() => {
        const symbol = resolveSymbol(selectedPair);
        realtimeDiagnosticService.init(symbol);
        const unsubscribe = realtimeDiagnosticService.subscribe(diag => {
            setRealtimeDiag(diag);
        });

        // Phase 15: News Shock Monitoring
        const checkShock = async () => {
            const shock = await newsShockEngine.getActiveShock(selectedPair);
            setActiveShock(shock);
        };

        checkShock();
        const interval = setInterval(checkShock, 60000); // Check every minute

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, [selectedPair]);

    const handleScreenshot = () => {
        setIsCleanView(true);
        addToast('Clean view enabled for snapshot. Hiding UI for 5 seconds...', 'info');
        setTimeout(() => {
            setIsCleanView(false);
        }, 5000);
    };



    // Monitoring listener for cross-asset alerts (Phase 4)
    useEffect(() => {


        const unsubscribe = alertOrchestrator.onUpdate((alerts) => {
            if (alerts.length > 0) {
                const latest = alerts[0];
                // Only toast if it's NOT the current symbol and it's fresh (within last 5s)
                if (latest.symbol !== selectedPair && (Date.now() - latest.timestamp < 5000)) {
                    addToast({
                        type: latest.severity === 'HIGH' ? 'warning' : 'info',
                        title: `INSTITUTIONAL SIGNAL: ${latest.symbol}`,
                        message: latest.message,
                        duration: 8000
                    });
                }
            }
        });
        return unsubscribe;
    }, [selectedPair, addToast]);

    // Live Ticker Polling (only when searching)
    useEffect(() => {
        if (!isSearching) return;

        const fetchTickers = async () => {
            try {
                const res = await fetch('/api/binance/ticker/24hr');
                const data = await res.json();
                // Filter and normalize if needed, but Binance returns a massive array
                setTickers(Array.isArray(data) ? data : []);
            } catch (e) {
                console.warn('Ticker fetch failed:', e);
            }
        };

        fetchTickers();
        const interval = setInterval(fetchTickers, 30000); // 30s refresh while searching
        return () => clearInterval(interval);
    }, [isSearching]);

    // Derived Search Results
    const searchResults = React.useMemo(() => {
        if (!searchQuery || searchQuery.length < 1) return [];

        const normalizedQuery = searchQuery.toUpperCase().replace('/', '');

        // Filter from all Binance tickers
        const results = tickers
            .filter(t => t.symbol.includes(normalizedQuery))
            .slice(0, 8)
            .map(t => ({
                symbol: t.symbol,
                display: t.symbol.includes('USDT') ? `${t.symbol.replace('USDT', '')}/USDT` : t.symbol,
                price: parseFloat(t.lastPrice),
                change: parseFloat(t.priceChangePercent)
            }));

        // Inject proxies if they match query
        const proxies = ['XAU/USD', 'GBP/JPY', 'EUR/USD', 'DXY', 'SPX', 'NDX'];
        proxies.forEach(p => {
            const cleanP = p.replace('/', '').toUpperCase();
            if (cleanP.includes(normalizedQuery) && !results.find(r => r.symbol === cleanP)) {
                results.push({
                    symbol: cleanP,
                    display: p,
                    price: 0,
                    change: 0,
                    isProxy: true
                });
            }
        });

        return results.slice(0, 10);
    }, [searchQuery, tickers]);

    // Derived Top Movers
    const topMovers = React.useMemo(() => {
        return [...tickers]
            .filter(t => t.symbol.endsWith('USDT'))
            .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
            .slice(0, 5)
            .map(t => ({
                symbol: t.symbol,
                display: t.symbol.includes('USDT') ? `${t.symbol.replace('USDT', '')}/USDT` : t.symbol,
                price: parseFloat(t.lastPrice),
                change: parseFloat(t.priceChangePercent)
            }));
    }, [tickers]);

    // Global Signals Subscription
    useEffect(() => {
        const unsubscribeDB = subscribeToGlobalSignals((dbSignals) => {
            const liveSignals = signalManager.getActiveSignals();
            setGlobalSignals([...liveSignals, ...dbSignals]);
        });

        const unsubscribeLive = signalManager.subscribe((liveSignals) => {
            // Re-fetch from DB state? Or just merge current state
            setGlobalSignals(prev => {
                const dbOnes = prev.filter(s => !s.id.startsWith('sig-'));
                return [...liveSignals, ...dbOnes];
            });
        });

        return () => {
            unsubscribeDB();
            unsubscribeLive();
        };
    }, []);

    const handleToggleMonitoring = () => {

        if (isMonitoring) {
            proactiveMonitor.stop();
        } else {
            proactiveMonitor.start();
        }
        setIsMonitoring(!isMonitoring);
        addToast({
            type: 'info',
            title: isMonitoring ? 'Monitoring Paused' : 'Fleet Scanning Active',
            message: isMonitoring ? 'Background institutional scan stopped.' : 'Now scanning watchlist for footprints...',
            duration: 3000
        });
    };



    // Handle incoming state from Command Center
    useEffect(() => {
        if (location.state?.pair) {
            setSelectedPair(location.state.pair);
            addToast(`Loaded ${location.state.pair} from Command Center`, 'success');
        }
    }, [location.state]);

    const strategyCategories = {
        'Market Structure': [
            'Trend Continuation',
            'Structure Break & Retest',
            'Change of Character (CHoCH)',
            'Fractal Structure Alignment',
            'Head & Shoulders'
        ],
        'SMC & ICT': [
            'Order Block',
            'Fair Value Gap (FVG)',
            'Breaker Block',
            'Mitigation Block',
            'Optimal Trade Entry (OTE)',
            'Quasimodo (Over-Under)',
            'Supply/Demand Flip',
            'Liquidity Sweep'
        ],
        'Session Based': [
            'Asian Range Breakout',
            'London Fakeout (Judas)'
        ],
        'Indicators & PA': [
            'RSI Divergence',
            'Price Action Confirmation',
            'EMA Alignment (50/200)',
            'Volume Spike Exhaustion'
        ],
        'Range & Harmonics': [
            'Range Trading',
            'Double Top / Bottom',
            'Three-Drive Pattern',
            'Gartley (XABCD)'
        ]
    };


    // Fetch Data & Subscribe
    useEffect(() => {
        setLoading(true);
        // Do NOT reset analysis immediately; wait to see if we have a saved snapshot
        // setAnalysis(null); 
        setActiveSetupId('A');
        const symbol = resolveSymbol(selectedPair);
        const interval = timeframe.toLowerCase();
        let unsubscribe = () => { };

        const connectWebSocket = () => {
            try {
                marketData.connect(symbol, interval);
                unsubscribe = marketData.subscribe((candle) => {
                    // Update Signal Manager for real-time lifecycle tracking
                    signalManager.updateMarketPrice(symbol, candle.close);

                    setChartData(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.time === candle.time) {
                            const newData = [...prev];
                            newData[prev.length - 1] = candle;
                            return newData;
                        }
                        return [...prev, candle];
                    });
                });
            } catch (error) {
                console.error('WebSocket connection failed:', error);
            }
        };

        const fetchHistoryAndAnalysis = async () => {
            setLoading(true);
            try {
                // 1. Fetch Price History
                const formatted = await marketData.fetchHistory(symbol, interval, 300);
                if (!formatted || formatted.length === 0) {
                    throw new Error(`No data found for ${symbol} on interval ${interval}`);
                }
                setChartData(formatted);

                // 2. Try to Load Persisted Analysis (Persistence Fix)
                try {
                    const savedAnalysis = await getMarketAnalysis(symbol, interval);
                    // CRITICAL: Verify the loaded analysis actually belongs to this symbol
                    if (savedAnalysis && savedAnalysis.timestamp && savedAnalysis.symbol === symbol) {
                        // Additional freshness check: only load if less than 30 minutes old (Phase 14)
                        const ageMinutes = (Date.now() - savedAnalysis.timestamp) / 60000;
                        if (ageMinutes < 30) {
                            console.log(`[Markets] Loaded persisted analysis for ${symbol}:`, savedAnalysis.timestamp);
                            setAnalysis(savedAnalysis);
                            analysisRef.current = true; // Mark as analyzed
                        } else {
                            console.log(`[Markets] Cached analysis for ${symbol} is stale (${ageMinutes.toFixed(0)}m old), clearing for regenerate...`);
                            setAnalysis(null);
                            analysisRef.current = false;
                        }
                    } else {
                        setAnalysis(null);
                        analysisRef.current = false;
                    }
                } catch (dbError) {
                    console.warn('[Markets] Failed to load saved analysis:', dbError);
                    setAnalysis(null);
                    analysisRef.current = false;
                }

                setLoading(false);
                connectWebSocket();
            } catch (error) {
                console.error('Failed to fetch history:', error);
                setChartData([]);
                setLoading(false);
                addToast(`Live data unavailable for ${selectedPair}`, 'error');
            }
        };

        fetchHistoryAndAnalysis();

        return () => {
            unsubscribe();
            marketData.disconnect();
        };
    }, [selectedPair, timeframe]);



    const handleGenerateAnalysis = async (force = false) => {
        if (!chartData || chartData.length < 50) return;
        if (analysisRef.current && !force) return;

        console.log('[Markets] Starting Analysis for', selectedPair);
        analysisRef.current = true;
        setIsAnalyzing(true);

        // Only show the primary loading screen if we don't have ANY analysis yet
        // This prevents the "Developing..." screen from blinking during background updates
        if (!analysis) {
            setLoading(true);
        }
        try {
            const newAnalysis = await generateTradeAnalysis(
                chartData,
                selectedPair,
                timeframe,
                manualStrategy,
                complexityMode,
                (partial) => {
                    console.log('[Markets] Partial analysis received for', selectedPair);
                    setAnalysis(partial);
                    // Do NOT setLoading(false) here if we already have a previous analysis
                    // This lets the old UI stay visible while the new one loads in the background
                    setLoading(false);
                },
                accountSize
            );

            console.log('[Markets] Full analysis complete for', selectedPair);
            setAnalysis(newAnalysis);
            setActiveSetupId('A');

            if (newAnalysis.setups && newAnalysis.setups.length > 0) {
                saveTradeSetups(newAnalysis.setups);
                addToast(`Published ${newAnalysis.setups.length} signals.`, 'success');
            }
        } catch (error) {
            console.error('[Markets] Analysis Error:', error);
            addToast(`Analysis Error: ${error.message}`, 'error');
        } finally {
            setIsAnalyzing(false);
            setLoading(false);
            // DO NOT reset analysisRef.current = false here, otherwise the useEffect will loop
        }
    };

    useEffect(() => {
        // Trigger analysis if we have data and NO active analysis
        // We use a timestamp check to avoid infinite loops and unnecessary updates
        if (chartData.length > 50 && !isAnalyzing) {
            const lastCandleTime = chartData[chartData.length - 1]?.time;
            const hasNewData = !analysisRef.current || analysisRef.current !== lastCandleTime;

            if (hasNewData) {
                console.log('[Markets] Triggering update for new candle at', lastCandleTime);
                handleGenerateAnalysis();
                analysisRef.current = lastCandleTime; // Store the time of the last analyzed candle
            }
        }
    }, [chartData.length, isAnalyzing]);

    const TF_COLORS = {
        'w': '#7c3aed', // Violet
        'd': '#db2777', // Pink
        '4h': '#1e3a8a', // Dark Blue
        '2h': '#2563eb', // Blue
        '1h': '#3b82f6', // Light Blue
        '30m': '#06b6d4', // Cyan
        '15m': '#10b981', // Green

        '5m': '#facc15', // Yellow
        '1m': '#f97316', // Orange
        'default': '#3b82f6'
    };

    const getPrecision = (symbol) => {
        if (!symbol) return 5;
        if (symbol.includes('JPY')) return 3;
        if (symbol.includes('XAU') || symbol.includes('GOLD')) return 2;
        if (symbol.includes('XAG') || symbol.includes('SILVER')) return 3;
        if (symbol.includes('USDT') && !symbol.includes('BTC') && !symbol.includes('ETH')) return 4;
        return 5;
    };

    const chartVisuals = React.useMemo(() => {
        if (!analysis) {
            return { markers: [], lines: [], overlays: {} };
        }

        const activeSetup = analysis.setups?.find(s => s.id === activeSetupId) || (analysis.setups && analysis.setups[0]);
        const markers = [];
        const lines = [];

        // 1. News Events Visualization (Lightweight Markers)
        if (analysis.newsEvents) {
            analysis.newsEvents.forEach(event => {
                markers.push({
                    time: event.time,
                    position: 'aboveBar',
                    color: event.impact === 'HIGH' ? '#ef4444' : '#f59e0b',
                    shape: 'circle',
                    text: `📢 ${event.event.split(' ')[0]}`,
                    size: 1
                });
            });
        }

        // 2. Active Setup Price Lines
        if (activeSetup) {
            if (activeSetup.stopLoss) {
                lines.push({
                    price: activeSetup.stopLoss,
                    color: 'rgba(239, 68, 68, 0.8)',
                    lineWidth: 2,
                    title: `SL`,
                });
            }
            if (activeSetup.entryZone?.optimal) {
                lines.push({
                    price: activeSetup.entryZone.optimal,
                    color: 'rgba(234, 179, 8, 0.9)', // Warning Gold
                    lineWidth: 2,
                    lineStyle: 0, // Solid
                    title: `ENTRY`,
                    label: `ENTRY @ ${activeSetup.entryZone.optimal.toFixed(getPrecision(selectedPair))}`
                });
            }
            if (activeSetup.targets) {
                activeSetup.targets.forEach((t, i) => {
                    lines.push({
                        price: t.price,
                        color: 'rgba(16, 185, 129, 0.8)',
                        lineWidth: 2,
                        lineStyle: 2,
                        title: `TP${i + 1}`,
                    });
                });
            }
        }

        // 3. Institutional Overlays (SMC, Scenarios, etc)
        const lastTime = chartData && chartData.length > 0 ? chartData[chartData.length - 1].time : Math.floor(Date.now() / 1000);

        // Merge global annotations with active setup specific ones (e.g. SL/TP targets)
        const uniqueAnnotationsMap = new Map();

        // Add global annotations first
        (analysis.annotations || []).forEach(a => uniqueAnnotationsMap.set(a.id, a));

        // Add active setup annotations (will override if IDs match, though unique setup annotations like Entry/SL are usually new IDs)
        (activeSetup?.annotations || []).forEach(a => uniqueAnnotationsMap.set(a.id, a));

        const sourceAnnotations = Array.from(uniqueAnnotationsMap.values());

        // 4. Inject Trap Zones (Phase 50)
        if (analysis.trapZones && analysis.trapZones.count > 0) {
            const allTraps = [...(analysis.trapZones.bullTraps || []), ...(analysis.trapZones.bearTraps || [])];
            allTraps.forEach((trap, idx) => {
                sourceAnnotations.push({
                    id: `trap-${idx}-${trap.timestamp}`,
                    type: 'TRAP_ZONE',
                    trapType: trap.implication,
                    coordinates: {
                        top: trap.location * 1.002,
                        bottom: trap.location * 0.998,
                        time: trap.timestamp,
                        endTime: lastTime + 3600 // 1h projection
                    }
                });
            });
        }

        // 4.5 Inject Phase 6: Dark Pools & Volatility Corridors
        if (analysis.marketState?.darkPools) {
            analysis.marketState.darkPools.forEach((pool, idx) => {
                sourceAnnotations.push({
                    id: `darkpool-${idx}-${pool.price}`,
                    type: 'DARK_POOL',
                    coordinates: {
                        top: pool.price * 1.0005,
                        bottom: pool.price * 0.9995,
                        time: lastTime - (3600 * 5), // Show recent history
                        endTime: lastTime + (3600 * 2) // Project forward
                    }
                });
            });
        }

        if (analysis.marketState?.volatility?.corridor) {
            const { upper, lower } = analysis.marketState.volatility.corridor;
            const currentPrice = chartData[chartData.length - 1]?.close;
            if (currentPrice) {
                sourceAnnotations.push({
                    id: 'volatility-corridor',
                    type: 'VOLATILITY_CORRIDOR',
                    coordinates: {
                        top: currentPrice + upper,
                        bottom: currentPrice - lower,
                        time: lastTime,
                        endTime: lastTime + (3600 * 4) // Project forward 4h
                    }
                });
            }
        }

        // 4.6 Inject Phase 7: Order Book Walls
        if (analysis.marketState?.orderBookDepth?.walls) {
            analysis.marketState.orderBookDepth.walls.forEach((wall, idx) => {
                sourceAnnotations.push({
                    id: `orderbook-wall-${idx}-${wall.price}`,
                    type: 'ORDER_BOOK_WALL',
                    side: wall.side,
                    coordinates: {
                        top: wall.price * (1 + 0.0002), // Very thin line
                        bottom: wall.price * (1 - 0.0002),
                        time: lastTime,
                        endTime: lastTime + (3600 * 1) // Project 1h forward
                    }
                });
            });
        }

        // 5. Institutional Levels (PDH, PDL, etc)
        if (indicators.institutionalLevels && chartData.length > 24) {
            // Find start of current day and filter for previous day
            const now = new Date();
            const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()).getTime() / 1000;
            const yesterdayData = chartData.filter(d => d.time < today && d.time >= today - 86400);

            if (yesterdayData.length > 0) {
                const pdh = Math.max(...yesterdayData.map(d => d.high));
                const pdl = Math.min(...yesterdayData.map(d => d.low));
                const pdm = (pdh + pdl) / 2;

                lines.push({
                    price: pdh,
                    color: 'rgba(255, 255, 255, 0.4)',
                    lineWidth: 1,
                    lineStyle: 1, // Dotted
                    title: 'PDH',
                    label: `PDH @ ${pdh.toFixed(getPrecision(selectedPair))}`
                });
                lines.push({
                    price: pdl,
                    color: 'rgba(255, 255, 255, 0.4)',
                    lineWidth: 1,
                    lineStyle: 1, // Dotted
                    title: 'PDL',
                    label: `PDL @ ${pdl.toFixed(getPrecision(selectedPair))}`
                });
                lines.push({
                    price: pdm,
                    color: 'rgba(255, 255, 255, 0.2)',
                    lineWidth: 1,
                    lineStyle: 2, // Large Dashed
                    title: 'PDM',
                    label: `PDM @ ${pdm.toFixed(getPrecision(selectedPair))}`
                });
            }
        }

        // DEBUG: Log annotation types
        console.log('[Markets.jsx] Source Annotations:', sourceAnnotations.map(a => ({ type: a.type, id: a.id })));
        console.log('[Markets.jsx] Active Setup Annotations:', activeSetup?.annotations?.map(a => ({ type: a.type, id: a.id })));

        // 6. Pass marketState to AnnotationMapper for Phase 2 Visuals (Icebergs, Tape, Risk)
        const overlays = {
            ...AnnotationMapper.mapToOverlays(sourceAnnotations, {
                lastCandleTime: lastTime,
                timeframe,
                marketState: analysis.marketState // CRITICAL: Pass full market state
            }),
            liquidityMap: [
                ...(analysis.liquidityMap || []),
                ...(indicators.liquidityHeatmap ? getLiquidityHeatmap(chartData) : [])
            ]
        };

        // Add Session Zones if enabled
        if (indicators.sessionZones) {
            const sessions = getSessionZones(chartData);
            overlays.zones = [...(overlays.zones || []), ...sessions];
        }

        // DEBUG: Log overlay results
        console.log('[Markets.jsx] Visuals Computed:', {
            markers: markers.length,
            lines: lines.length,
            zones: overlays.zones?.length,
            paths: overlays.paths?.length
        });

        return { markers, lines, overlays };
    }, [analysis, chartData, activeSetupId, indicators]);


    const [health, setHealth] = useState({ isConnected: false, latency: 0 });

    useEffect(() => {
        return marketData.subscribeHealth(stats => {
            setHealth(stats);
        });
    }, []);

    return (
        <div style={{
            height: 'calc(100vh - 64px)',
            background: 'radial-gradient(circle at top left, #0f172a, #000000)',
            display: 'flex',
            flexDirection: 'column',
            color: 'white',
            overflow: 'hidden'
        }}>
            {/* ... header ... */}
            <header style={{
                height: '60px',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                justifyContent: 'space-between',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'var(--color-accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)'
                        }}>
                            <Activity size={20} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {selectedPair}
                                {(() => {
                                    const meta = getSymbolMetadata(selectedPair);
                                    return (
                                        <div
                                            title={meta.note}
                                            style={{
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: meta.isProxy ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                color: meta.isProxy ? '#f59e0b' : '#10b981',
                                                border: `1px solid ${meta.isProxy ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                                                fontWeight: 'bold',
                                                whiteSpace: 'nowrap',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {meta.isProxy ? <AlertTriangle size={10} /> : <ShieldCheck size={10} />}
                                            {meta.source}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div style={{
                                fontSize: '10px',
                                color: health.isConnected ? '#10b981' : '#ef4444',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: health.isConnected ? '#10b981' : '#ef4444' }} />
                                {health.isConnected ? 'LIVE NETWORK' : 'OFFLINE'}
                            </div>
                        </div>
                    </div>

                    <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Price</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                ${chartData[chartData.length - 1]?.close?.toLocaleString(undefined, { minimumFractionDigits: getPrecision(selectedPair) }) || '...'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Session</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8' }}>{analysis?.marketState?.session?.active || 'LONDON'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Volatility</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>
                                {(typeof analysis?.marketState?.volatility === 'string' ? analysis?.marketState?.volatility : analysis?.marketState?.volatility?.volatilityState?.level) || 'NOMINAL'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Macro Sentiment</div>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: analysis?.marketState?.macroSentiment?.bias === 'BULLISH' ? '#10b981' : analysis?.marketState?.macroSentiment?.bias === 'BEARISH' ? '#ef4444' : '#94a3b8'
                            }}>
                                {analysis?.marketState?.macroSentiment?.bias || 'NEUTRAL'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Basket Bias</div>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: analysis?.marketState?.basketArbitrage?.signal === 'LEADER' ? '#10b981' : analysis?.marketState?.basketArbitrage?.signal === 'LAGGARD' ? '#f59e0b' : '#94a3b8'
                            }}>
                                {analysis?.marketState?.basketArbitrage?.signal || 'STABLE'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Order Book</div>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 'bold',
                                color: analysis?.marketState?.orderBookDepth?.pressure === 'BULLISH' ? '#10b981' : analysis?.marketState?.orderBookDepth?.pressure === 'BEARISH' ? '#ef4444' : '#94a3b8'
                            }}>
                                {analysis?.marketState?.orderBookDepth?.pressure || 'NEUTRAL'}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setViewMode('SINGLE')}
                            style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'SINGLE' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: viewMode === 'SINGLE' ? 'white' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <Square size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('GRID')}
                            style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: 'none',
                                background: viewMode === 'GRID' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                color: viewMode === 'GRID' ? 'white' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <LayoutGrid size={16} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {['1m', '5m', '15m', '30m', '1H', '2H', '4H', 'D', 'W'].map(tf => (

                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    background: timeframe === tf ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: timeframe === tf ? 'white' : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleGenerateAnalysis}
                        disabled={loading}
                        style={{ height: '36px', padding: '0 16px', borderRadius: '8px', gap: '8px', fontSize: '12px' }}
                    >
                        {loading ? <Activity size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        AUDIT ASSET
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* 🧭 LEFT COLUMN: SLIM ASSET NAVIGATOR */}
                <nav style={{
                    width: '80px',
                    background: 'rgba(15, 23, 42, 0.4)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '10px 0',
                    gap: '12px',
                    overflowY: 'auto',
                    scrollbarWidth: 'none'
                }}>
                    {/* 🔍 SEARCH TRIGGER */}
                    <button
                        onClick={() => setIsSearching(!isSearching)}
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '12px',
                            background: isSearching ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: isSearching ? 'white' : 'rgba(255,255,255,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            marginBottom: '10px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Search size={20} />
                    </button>

                    {/* RECENT / SEARCHED PAIRS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ fontSize: '8px', fontWeight: 'bold', color: 'rgba(255,255,255,0.3)' }}>REC</div>
                        {recentPairs.slice(0, 5).map(pair => (
                            <button
                                key={pair}
                                onClick={() => setSelectedPair(pair)}
                                title={pair}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '10px',
                                    border: '1px solid',
                                    borderColor: selectedPair === pair ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.1)',
                                    background: selectedPair === pair ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.03)',
                                    color: selectedPair === pair ? 'white' : 'rgba(255,255,255,0.6)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '9px',
                                    fontWeight: 'bold'
                                }}
                            >
                                {pair.split('/')[0].substring(0, 3)}
                            </button>
                        ))}
                    </div>

                    <div style={{ width: '30px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }} />

                    {Object.keys(assetRegistry).map(cat => (
                        <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                            <div style={{
                                fontSize: '9px',
                                fontWeight: 'bold',
                                color: 'rgba(255,255,255,0.3)',
                                transform: 'rotate(-90deg)',
                                height: '40px',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                {cat.toUpperCase()}
                            </div>
                            {assetRegistry[cat].map(pair => (
                                <button
                                    key={pair}
                                    onClick={() => setSelectedPair(pair)}
                                    title={pair}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        border: '1px solid',
                                        borderColor: selectedPair === pair ? 'var(--color-accent-primary)' : 'rgba(255,255,255,0.1)',
                                        background: selectedPair === pair ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255,255,255,0.03)',
                                        color: selectedPair === pair ? 'white' : 'rgba(255,255,255,0.6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {pair.split('/')[0].substring(0, 3)}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* 📊 CENTER COLUMN: ANALYTICS BRIDGE */}
                <main style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#000',
                    position: 'relative',
                    overflowY: 'auto'
                }}>
                    {/* Phase 15: News Shock Alert Banner (Symbol-Specific) */}
                    <AnimatePresence>
                        {activeShock && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{
                                    background: activeShock.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                    border: `1px solid ${activeShock.severity === 'HIGH' ? '#ef4444' : '#f59e0b'}`,
                                    padding: '12px 24px',
                                    margin: '16px 24px 0 24px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    backdropFilter: 'blur(8px)',
                                    zIndex: 100
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <AlertTriangle size={20} color={activeShock.severity === 'HIGH' ? '#ef4444' : '#f59e0b'} />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: activeShock.severity === 'HIGH' ? '#ef4444' : '#f59e0b' }}>
                                                INSTITUTIONAL VOLATILITY ALERT: {activeShock.event.toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: '11px', opacity: 0.8, color: 'white' }}>
                                                {activeShock.message}. Capital protection active: Suitability penalized by {(activeShock.severity === 'HIGH' ? 50 : 20)}%.
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', opacity: 0.6, color: 'white' }}>
                                        {activeShock.phase} PHASE
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Integrated Chart HUD */}
                    <div style={{
                        flex: 1,
                        position: 'relative',
                        minHeight: '600px',
                        maxHeight: viewMode === 'GRID' ? 'none' : '700px'
                    }}>
                        {viewMode === 'GRID' ? (
                            <ChartGrid initialPair={selectedPair} />
                        ) : (
                            <Chart
                                key={`${selectedPair}-${timeframe}`}
                                data={chartData}
                                markers={chartVisuals.markers}
                                lines={chartVisuals.lines}
                                overlays={chartVisuals.overlays}
                            />
                        )}

                        {/* Fullscreen Button */}
                        {viewMode === 'SINGLE' && !isFullscreen && (
                            <button
                                onClick={() => setIsFullscreen(true)}
                                style={{
                                    position: 'absolute',
                                    top: '20px',
                                    right: '20px',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '8px',
                                    background: 'rgba(15, 23, 42, 0.85)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 10,
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.3)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                            </button>
                        )}

                        {/* PREMIUM HUD OVERLAY */}
                        <AnimatePresence>
                            {analysis && viewMode === 'SINGLE' && !isFullscreen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    style={{
                                        position: 'absolute',
                                        top: '20px',
                                        left: '20px',
                                        width: '280px',
                                        background: 'rgba(15, 23, 42, 0.85)',
                                        backdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '16px',
                                        padding: '16px',
                                        zIndex: 10,
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    {/* Setup Tabs */}
                                    {analysis.setups && analysis.setups.length > 0 && (
                                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', marginBottom: '16px', gap: '2px' }}>
                                            {analysis.setups.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => setActiveSetupId(s.id)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px',
                                                        borderRadius: '6px',
                                                        background: activeSetupId === s.id ?
                                                            (s.direction === 'LONG' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') :
                                                            'transparent',
                                                        color: activeSetupId === s.id ?
                                                            (s.direction === 'LONG' ? '#10b981' : '#ef4444') :
                                                            'rgba(255,255,255,0.4)',
                                                        cursor: 'pointer',
                                                        fontSize: '10px',
                                                        fontWeight: 'bold',
                                                        border: activeSetupId === s.id ?
                                                            `1px solid ${s.direction === 'LONG' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` :
                                                            '1px solid transparent'
                                                    }}
                                                >
                                                    SETUP {s.id}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>QUANT AUDIT v4.2</span>
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-accent-primary)' }}>
                                            SCORE: {analysis.setups?.find(s => s.id === activeSetupId)?.quantScore || analysis.setups?.[0]?.quantScore}%
                                            {analysis.setups?.find(s => s.id === activeSetupId)?.strategy && (
                                                <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: '6px' }}>
                                                    ({analysis.performanceWeights?.[analysis.setups.find(s => s.id === activeSetupId).strategy]?.toFixed(1) || '1.0'}x)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Institutional Cycle Integrated */}
                                    <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.2)', marginBottom: '16px' }}>
                                        <div style={{ fontSize: '9px', color: 'rgba(59, 130, 246, 0.8)', fontWeight: 'bold', marginBottom: '4px' }}>INSTITUTIONAL CYCLE (AMD)</div>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            color: analysis.marketState?.amdCycle?.phase === 'MANIPULATION' ? '#ef4444' :
                                                analysis.marketState?.amdCycle?.phase === 'ACCUMULATION' ? '#f59e0b' : '#10b981'
                                        }}>
                                            {analysis.marketState?.amdCycle?.phase || 'PENDING'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>BIAS</div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: analysis.marketState?.mtf?.globalBias === 'BULLISH' ? '#10b981' : '#ef4444' }}>
                                                {analysis.marketState?.mtf?.globalBias || 'NEUTRAL'}
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>VOLATILITY</div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#f59e0b' }}>{(typeof analysis.marketState?.volatility === 'string' ? analysis.marketState?.volatility : analysis.marketState?.volatility?.volatilityState?.level) || 'NOMINAL'}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>OBLIGATION</div>
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                color: analysis.marketState?.obligations?.state === 'OBLIGATED' ? '#10b981' : 'rgba(255,255,255,0.4)'
                                            }}>
                                                {analysis.marketState?.obligations?.state || 'UNKNOWN'}
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>CONFIDENCE</div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#3b82f6' }}>
                                                {analysis.prediction?.confidence || 0}%
                                            </div>
                                        </div>
                                    </div>

                                    {/* Precise Levels Restored */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>ENTRY</div>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{analysis.setups?.find(s => s.id === activeSetupId)?.entryZone?.optimal?.toFixed(getPrecision(selectedPair)) || '...'}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>STOP</div>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444' }}>{analysis.setups?.find(s => s.id === activeSetupId)?.stopLoss?.toFixed(getPrecision(selectedPair)) || '...'}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {analysis.marketState?.liquiditySweep && (
                                            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                                                <Target size={12} /> Liquidity Sweep Detected
                                            </div>
                                        )}
                                        {analysis.marketState?.smtDivergence && (
                                            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa' }}>
                                                <Activity size={12} /> SMT Divergence Active
                                            </div>
                                        )}
                                        {analysis.marketState?.technicalDivergences?.length > 0 && (
                                            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#facc15' }}>
                                                <TrendingUp size={12} /> Tech Divergence ({analysis.marketState.technicalDivergences.length})
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Full Analysis Report Section */}
                    {showReport && (
                        <div style={{ padding: '0 20px 20px 20px' }}>
                            <FullAnalysisReport analysis={analysis} loading={loading} realtimeDiag={realtimeDiag} />
                        </div>
                    )}
                </main>

                {/* 🛡️ RIGHT COLUMN: COMMAND CENTER */}
                {/* 🛡️ RIGHT COLUMN: COMMAND CENTER (Restored Single Column) */}
                <aside style={{
                    width: '380px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(30px)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflowY: 'auto'
                }}>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* 1. Intelligence Layer */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Relocated Global Signals Panel */}
                            <div style={{
                                maxHeight: '350px',
                                overflowY: 'auto',
                                background: 'rgba(15, 23, 42, 0.3)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                paddingBottom: '8px'
                            }}>
                                <GlobalSignalsPanel
                                    signals={globalSignals}
                                    onSelectSignal={(signal) => setSelectedPair(signal.symbol)}
                                />
                            </div>

                            <SentimentGauge score={analysis?.marketState?.sentiment?.score || 50} />
                            <ExplanationPanel
                                analysis={analysis}
                                loading={loading}
                                realtimeDiag={realtimeDiag}
                                onGenerateNew={() => handleGenerateAnalysis(true)}
                            />

                            <InstitutionalScanner onSelectSymbol={setSelectedPair} />

                        </div>

                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

                        {/* 2. Execution & Risk Layer */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <PortfolioRiskDashboard />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px', color: 'rgba(255,255,255,0.5)' }}>COMMAND CENTER</h3>
                                <button
                                    onClick={() => setShowReport(!showReport)}
                                    style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
                                >
                                    <Layout size={16} />
                                </button>
                            </div>

                            <SMTCorrelationHeatmap
                                symbol={selectedPair}
                                activeTimeframe={timeframe}
                                divergences={analysis?.marketState?.divergences || []}
                            />

                            {/* Auditor Config Section */}
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <div style={{ width: '4px', height: '14px', background: 'var(--color-accent-primary)', borderRadius: '2px' }} />
                                    <h4 style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>AUDITOR CONFIG</h4>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                            ACTIVE TRADING CAPITAL (USD)
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                value={accountSize}
                                                onChange={(e) => setAccountSize(Number(e.target.value))}
                                                style={{
                                                    width: '100%',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '10px',
                                                    padding: '12px',
                                                    color: 'white',
                                                    fontSize: '13px',
                                                    fontWeight: 'bold',
                                                    outline: 'none'
                                                }}
                                            />
                                            <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }}>
                                                <Target size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                            ANALYSIS ARCHITECTURE
                                        </label>
                                        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <button
                                                onClick={() => setComplexityMode('BEGINNER')}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: complexityMode === 'BEGINNER' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                                    color: complexityMode === 'BEGINNER' ? 'white' : 'rgba(255,255,255,0.3)',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <BookOpen size={14} /> LIGHT / RETAIL
                                            </button>
                                            <button
                                                onClick={() => setComplexityMode('ADVANCED')}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px',
                                                    borderRadius: '8px',
                                                    background: complexityMode === 'ADVANCED' ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                                                    color: complexityMode === 'ADVANCED' ? 'white' : 'rgba(255,255,255,0.3)',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Activity size={14} /> HEAVY / ALGO
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <select
                                    value={manualStrategy || ''}
                                    onChange={(e) => setManualStrategy(e.target.value || null)}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        padding: '10px 12px',
                                        color: 'white',
                                        fontSize: '12px'
                                    }}
                                >
                                    <option value="">🤖 AI AUTO-STRATEGY</option>
                                    {Object.entries(strategyCategories).map(([cat, strats]) => (
                                        <optgroup label={cat} key={cat} style={{ background: '#0f172a' }}>
                                            {strats.map(s => <option key={s} value={s}>{s}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>

                            <TradeExecution
                                symbol={selectedPair}
                                currentPrice={chartData[chartData.length - 1]?.close}
                                riskData={analysis?.setups?.find(s => s.id === (activeSetupId || 'A'))}
                                analysis={analysis}
                                candles={chartData}
                            />

                            {/* Order Book / DOM Widget - Restored Priority */}
                            <div style={{
                                background: 'rgba(0,0,0,0.3)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                padding: '12px',
                                minHeight: '300px'
                            }}>
                                <DOMWidget symbol={resolveSymbol(selectedPair)} />
                            </div>

                            <BacktestPanel symbol={resolveSymbol(selectedPair)} timeframe={timeframe} />
                        </div>
                    </div>
                </aside>
            </div>

            {/* 🌐 GLOBAL STATUS BAR */}
            <footer style={{
                height: '32px',
                background: '#0a0f1d',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)'
            }}>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: health.isConnected ? '#10b981' : '#ef4444' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: health.isConnected ? '#10b981' : '#ef4444' }} />
                        {health.isConnected ? 'SYSTEM OPERATIONAL' : 'SYSTEM DEGRADED'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={12} /> LATENCY: {health.latency}ms
                    </div>
                    <div>MTF BIAS: {analysis?.marketState?.mtf?.globalBias || 'NEUTRAL'}</div>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    {analysis?.marketState?.smtConfluence > 0 && (
                        <span style={{ color: 'var(--color-accent-primary)', fontWeight: 'bold' }}>
                            SMT CONFLUENCE: {analysis.marketState.smtConfluence}%
                        </span>
                    )}
                    <span>NEWS: {analysis?.newsEvents?.length > 0 ? `${analysis.newsEvents.length} IMPACT EVENTS` : 'NO HIGH IMPACT EVENTS'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>v2.4.0 PRO</span>
                </div>
            </footer>

            {/* FULLSCREEN CHART MODAL */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: '#000',
                            zIndex: 9999,
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        {/* Fullscreen Header with Advanced Controls */}
                        {!isCleanView && (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {/* Top Bar with Symbol Info */}
                                <div style={{
                                    height: '50px',
                                    background: 'rgba(15, 23, 42, 0.95)',
                                    backdropFilter: 'blur(20px)',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0 20px',
                                    justifyContent: 'space-between'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Activity size={18} color="white" />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {selectedPair}
                                                    {localStorage.getItem(`golden_params_${selectedPair.replace('/', '')}`) && (
                                                        <span style={{
                                                            fontSize: '8px',
                                                            background: 'rgba(56, 189, 248, 0.2)',
                                                            color: 'var(--color-accent-primary)',
                                                            padding: '2px 4px',
                                                            borderRadius: '4px',
                                                            border: '1px solid rgba(56, 189, 248, 0.4)'
                                                        }}>VAULT ACTIVE</span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '9px', color: '#10b981', fontWeight: 'bold' }}>LIVE NETWORK</div>
                                            </div>
                                        </div>
                                        <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                                            <div style={{ opacity: 0.5 }}>PRICE: <span style={{ color: 'white', fontWeight: 'bold' }}>${chartData[chartData.length - 1]?.close?.toFixed(2)}</span></div>
                                            <div style={{ opacity: 0.5 }}>BIAS: <span style={{ color: analysis?.marketState?.mtf?.globalBias === 'BULLISH' ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>{analysis?.marketState?.mtf?.globalBias || 'NEUTRAL'}</span></div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleGenerateAnalysis}
                                            disabled={loading}
                                            style={{
                                                height: '32px',
                                                padding: '0 12px',
                                                borderRadius: '6px',
                                                gap: '6px',
                                                fontSize: '11px',
                                                background: 'var(--color-accent-primary)',
                                                border: 'none',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {loading ? <Activity size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            AUDIT ASSET
                                        </button>

                                        <button
                                            onClick={() => setShowLeftPanel(!showLeftPanel)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: showLeftPanel ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.05)',
                                                color: showLeftPanel ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <PanelLeftOpen size={14} /> SIDEBAR
                                        </button>
                                        <button
                                            onClick={() => setShowRightPanel(!showRightPanel)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: showRightPanel ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.05)',
                                                color: showRightPanel ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            DOM <PanelRightOpen size={14} />
                                        </button>
                                        <button
                                            onClick={handleToggleMonitoring}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: isMonitoring ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)',
                                                color: isMonitoring ? '#10b981' : 'rgba(255,255,255,0.5)',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                            title="Background Fleet Scan"
                                        >
                                            <Activity size={14} className={isMonitoring ? 'animate-pulse' : ''} />
                                            SCAN: {isMonitoring ? 'ON' : 'OFF'}
                                        </button>
                                        <button
                                            onClick={() => setIsFullscreen(false)}
                                            style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '8px',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Square size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Controls Bar */}
                                <FullscreenControls
                                    timeframe={timeframe}
                                    onTimeframeChange={setTimeframe}
                                    indicators={indicators}
                                    onToggleIndicator={(id) => setIndicators(prev => ({ ...prev, [id]: !prev[id] }))}
                                    onScreenshot={handleScreenshot}
                                    activeDrawTool={activeDrawTool}
                                    onSelectDrawTool={setActiveDrawTool}
                                />
                            </div>
                        )}

                        {/* Main Content Area with Side Panels */}
                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                            {/* Left Panel - News & Context */}
                            <AnimatePresence>
                                {showLeftPanel && !isCleanView && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: '320px', opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        style={{
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                                            overflowY: 'auto',
                                            padding: '16px'
                                        }}
                                    >
                                        <MacroCalendar />
                                        <div style={{ height: '24px' }} />
                                        <NewsContextPanel
                                            newsEvents={analysis?.newsEvents}
                                            correlations={analysis?.marketState?.correlation}
                                            session={analysis?.marketState?.session}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Center - Chart with HUD */}
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Chart
                                    key={`${selectedPair}-${timeframe}-fullscreen`}
                                    data={chartData}
                                    markers={chartVisuals.markers}
                                    lines={chartVisuals.lines}
                                    overlays={chartVisuals.overlays}
                                />

                                {/* HUD Overlay in Fullscreen */}
                                {analysis && !isCleanView && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        style={{
                                            position: 'absolute',
                                            top: '20px',
                                            left: '20px',
                                            width: '320px',
                                            background: 'rgba(15, 23, 42, 0.85)',
                                            backdropFilter: 'blur(16px)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '16px',
                                            padding: '20px',
                                            zIndex: 10,
                                            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                                        }}
                                    >
                                        {/* Setup Tabs */}
                                        {analysis.setups && analysis.setups.length > 0 && (
                                            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px', marginBottom: '16px', gap: '2px' }}>
                                                {analysis.setups.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setActiveSetupId(s.id)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '6px',
                                                            borderRadius: '6px',
                                                            background: activeSetupId === s.id ?
                                                                (s.direction === 'LONG' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)') :
                                                                'transparent',
                                                            color: activeSetupId === s.id ?
                                                                (s.direction === 'LONG' ? '#10b981' : '#ef4444') :
                                                                'rgba(255,255,255,0.4)',
                                                            cursor: 'pointer',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold',
                                                            border: activeSetupId === s.id ?
                                                                `1px solid ${s.direction === 'LONG' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` :
                                                                '1px solid transparent'
                                                        }}
                                                    >
                                                        SETUP {s.id}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>QUANT AUDIT v4.2</span>
                                            </div>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-accent-primary)' }}>
                                                SCORE: {analysis.setups?.find(s => s.id === activeSetupId)?.quantScore || analysis.setups?.[0]?.quantScore}%
                                                {analysis.setups?.find(s => s.id === activeSetupId)?.strategy && (
                                                    <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: '6px' }}>
                                                        ({analysis.performanceWeights?.[analysis.setups.find(s => s.id === activeSetupId).strategy]?.toFixed(1) || '1.0'}x)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Institutional Cycle Integrated (FS) */}
                                        <div style={{ background: 'rgba(37, 99, 235, 0.1)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(37, 99, 235, 0.2)', marginBottom: '16px' }}>
                                            <div style={{ fontSize: '10px', color: 'rgba(59, 130, 246, 0.8)', fontWeight: 'bold', marginBottom: '4px' }}>INSTITUTIONAL CYCLE (AMD)</div>
                                            <div style={{
                                                fontSize: '16px',
                                                fontWeight: 'bold',
                                                color: analysis.marketState?.amdCycle?.phase === 'MANIPULATION' ? '#ef4444' :
                                                    analysis.marketState?.amdCycle?.phase === 'ACCUMULATION' ? '#f59e0b' : '#10b981'
                                            }}>
                                                {analysis.marketState?.amdCycle?.phase || 'PENDING'}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                                                {analysis.marketState?.amdCycle?.note || 'Detecting institutional fingerprints...'}
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>BIAS</div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: analysis.marketState?.mtf?.globalBias === 'BULLISH' ? '#10b981' : '#ef4444' }}>
                                                    {analysis.marketState?.mtf?.globalBias || 'NEUTRAL'}
                                                </div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>VOLATILITY</div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>{(typeof analysis.marketState?.volatility === 'string' ? analysis.marketState?.volatility : analysis.marketState?.volatility?.volatilityState?.level) || 'NOMINAL'}</div>
                                            </div>
                                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>OBLIGATION</div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    color: analysis.marketState?.obligations?.state === 'OBLIGATED' ? '#10b981' : 'rgba(255,255,255,0.4)'
                                                }}>
                                                    {analysis.marketState?.obligations?.state || 'UNKNOWN'}
                                                </div>
                                            </div>
                                            <div style={{ position: 'relative', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>CONFIDENCE</div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6', cursor: 'help' }} className="confidence-trigger">
                                                    {analysis.prediction?.confidence || 0}%
                                                </div>
                                                {/* Detailed Breakdown Tooltip */}
                                                <div className="confidence-tooltip-container" style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    zIndex: 100,
                                                    display: 'none',
                                                    paddingTop: '10px'
                                                }}>
                                                    <div style={{
                                                        background: 'rgba(15, 23, 42, 0.95)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        borderRadius: '8px',
                                                        padding: '12px',
                                                        width: '240px',
                                                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                                    }}>
                                                        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>CONFIDENCE BREAKDOWN</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Base Probability</span>
                                                                <span style={{ color: '#10b981' }}>+45%</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>HTF Alignment</span>
                                                                <span style={{ color: '#10b981' }}>+15%</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Vol. Confirmation</span>
                                                                <span style={{ color: '#10b981' }}>+10%</span>
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Path Clearance</span>
                                                                <span style={{ color: '#ef4444' }}>-5%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <style>{`
                                                    .confidence-trigger:hover + .confidence-tooltip-container {
                                                        display: block;
                                                    }
                                                `}</style>
                                            </div>
                                        </div>

                                        {/* Precise Levels & P&L Calculator */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>ENTRY</div>
                                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{analysis.setups?.find(s => s.id === activeSetupId)?.entryZone?.optimal?.toFixed(selectedPair.includes('JPY') || selectedPair.includes('XAU') ? 3 : 2) || '...'}</div>
                                                </div>
                                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>STOP LOSS</div>
                                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef4444' }}>{analysis.setups?.find(s => s.id === activeSetupId)?.stopLoss?.toFixed(selectedPair.includes('JPY') || selectedPair.includes('XAU') ? 3 : 2) || '...'}</div>
                                                </div>
                                            </div>

                                            {/* Projections & RR */}
                                            <div style={{
                                                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.02) 100%)',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(37, 99, 235, 0.2)'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 'bold' }}>PROJECTION METRICS</div>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        color: '#3b82f6',
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        RR 1:{analysis.setups?.find(s => s.id === activeSetupId)?.targets?.[0]?.rr?.toFixed(2) || '3.50'}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Target 1 (Base)</span>
                                                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                                                        {analysis.setups?.find(s => s.id === activeSetupId)?.targets?.[0]?.price?.toFixed(selectedPair.includes('JPY') || selectedPair.includes('XAU') ? 3 : 2) || '...'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {analysis.marketState?.liquiditySweep && (
                                                <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                                                    <Target size={12} /> Liquidity Sweep Detected
                                                </div>
                                            )}
                                            {analysis.marketState?.smtDivergence && (
                                                <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa' }}>
                                                    <Activity size={12} /> SMT Divergence Active
                                                </div>
                                            )}
                                            {analysis.marketState?.technicalDivergences?.length > 0 && (
                                                <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', color: '#facc15' }}>
                                                    <TrendingUp size={12} /> Tech Divergence ({analysis.marketState.technicalDivergences.length})
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Right Panel - DOM & Orders */}
                            <AnimatePresence>
                                {showRightPanel && !isCleanView && (
                                    <motion.div
                                        initial={{ width: 0, opacity: 0 }}
                                        animate={{ width: '320px', opacity: 1 }}
                                        exit={{ width: 0, opacity: 0 }}
                                        style={{
                                            background: 'rgba(15, 23, 42, 0.6)',
                                            borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                                            overflowY: 'auto',
                                            padding: '16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px'
                                        }}
                                    >
                                        <FullscreenDOMPanel
                                            symbol={selectedPair}
                                            currentPrice={chartData[chartData.length - 1]?.close || 50000}
                                        />

                                        <TradeExecution
                                            symbol={selectedPair}
                                            currentPrice={chartData[chartData.length - 1]?.close || 0}
                                            analysis={analysis}
                                            candles={chartData}
                                        />

                                        <div style={{ flex: 1, minHeight: '300px' }}>
                                            <PortfolioWidget symbol={selectedPair} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >
            {/* 🔍 SEARCH OVERLAY */}
            <AnimatePresence>
                {isSearching && (
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(20px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.8)',
                            zIndex: 1000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                width: '450px',
                                background: 'rgba(30, 41, 59, 0.95)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px',
                                padding: '32px',
                                boxShadow: '0 50px 100px rgba(0,0,0,0.8)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Search Assets</h3>
                                <button
                                    onClick={() => setIsSearching(false)}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                                >
                                    ✕
                                </button>
                            </div>

                            <div style={{ position: 'relative', marginBottom: '24px' }}>
                                <Search style={{ position: 'absolute', left: '16px', top: '16px', color: 'rgba(255,255,255,0.3)' }} size={20} />
                                <input
                                    autoFocus
                                    placeholder="Ticker (e.g. PEPE, SOL, SPX)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const bestResult = searchResults[0]?.display || searchQuery;
                                            setSelectedPair(bestResult);
                                            setRecentPairs(prev => [bestResult, ...prev.filter(p => p !== bestResult)].slice(0, 10));
                                            setIsSearching(false);
                                            setSearchQuery('');
                                        }
                                    }}
                                    style={{
                                        width: '100%',
                                        height: '52px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        padding: '0 16px 0 48px',
                                        color: 'white',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* 🎯 LIVE SEARCH RESULTS */}
                            {searchResults.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                                    {searchResults.map(res => (
                                        <button
                                            key={res.symbol}
                                            onClick={() => {
                                                setSelectedPair(res.display);
                                                setRecentPairs(prev => [res.display, ...prev.filter(p => p !== res.display)].slice(0, 10));
                                                setIsSearching(false);
                                                setSearchQuery('');
                                            }}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '12px 16px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                width: '100%',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontWeight: '800', fontSize: '14px', color: 'white' }}>{res.display}</div>
                                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>LIVE SPOT</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 'bold', color: 'white' }}>
                                                    ${res.price.toLocaleString(undefined, { minimumFractionDigits: res.price < 1 ? 6 : 2 })}
                                                </div>
                                                <div style={{ fontWeight: 'bold', fontSize: '12px', color: res.change >= 0 ? '#10b981' : '#ef4444' }}>
                                                    {res.change >= 0 ? '+' : ''}{res.change.toFixed(2)}%
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>
                                <History size={14} />
                                <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{searchQuery ? 'Top Results' : 'Recent Searches'}</span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {recentPairs.slice(0, 6).map(pair => (
                                    <button
                                        key={pair}
                                        onClick={() => {
                                            setSelectedPair(pair);
                                            setIsSearching(false);
                                        }}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            color: 'white',
                                            textAlign: 'left',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    >
                                        {pair}
                                    </button>
                                ))}
                            </div>

                            {/* Top Movers Section */}
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.3)', marginBottom: '16px' }}>
                                    <TrendingUp size={14} />
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Top Movers (24h)</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {topMovers.map(mover => (
                                        <button
                                            key={mover.symbol}
                                            onClick={() => {
                                                setSelectedPair(mover.display);
                                                setIsSearching(false);
                                            }}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '12px',
                                                background: 'rgba(16, 185, 129, 0.05)',
                                                border: '1px solid rgba(16, 185, 129, 0.1)',
                                                color: 'white',
                                                textAlign: 'left',
                                                fontSize: '13px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'}
                                        >
                                            <span>{mover.display.split('/')[0]}</span>
                                            <span style={{ color: '#10b981', fontSize: '11px' }}>+{mover.change.toFixed(2)}%</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
