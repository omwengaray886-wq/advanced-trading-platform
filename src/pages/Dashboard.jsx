import React, { useMemo, useEffect, useState } from 'react';
import Chart from '../components/ui/Chart';
import TradeSetupCard from '../components/features/TradeSetupCard';
import MarketTicker from '../components/features/MarketTicker';
import { CardSkeleton } from '../components/ui/Skeleton';
import { useNavigate } from 'react-router-dom';
import { subscribeToTradeSetups } from '../services/db';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { marketData } from '../services/marketData';
import { generateTradeAnalysis } from '../services/ai';
import { Bot, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import EconomicCalendar from '../components/features/EconomicCalendar';
import NewsFeed from '../components/features/NewsFeed';
import CorrelationMatrix from '../components/features/CorrelationMatrix';
import SentimentGauge from '../components/features/SentimentGauge';
import MarketHeatmap from '../components/features/MarketHeatmap';
import ActivePositions from '../components/features/ActivePositions';
import MonteCarloRisk from '../components/features/MonteCarloRisk';
import LiveWallet from '../components/features/LiveWallet';
import LegendPanel from '../components/features/LegendPanel';
import CorrelationHeatmap from '../components/features/CorrelationHeatmap';
import InstitutionalScanner from '../components/features/InstitutionalScanner';
import GlobalRiskHUD from '../components/features/GlobalRiskHUD';
import GlobalSignalsPanel from '../components/features/GlobalSignalsPanel';
import { newsService } from '../services/newsService';
import { CorrelationClusterEngine } from '../services/CorrelationClusterEngine';
import { AnnotationMapper } from '../services/annotationMapper';
import { signalManager } from '../services/SignalManager';
import { subscribeToGlobalSignals } from '../services/db';
import AlphaMonitor from '../components/features/AlphaMonitor';

const getSession = () => {
    const hour = new Date().getUTCHours();
    if (hour >= 0 && hour < 8) return { name: 'Asian Session', status: 'Low Volatility' };
    if (hour >= 8 && hour < 12) return { name: 'London Session', status: 'High Volatility' };
    if (hour >= 12 && hour < 17) return { name: 'NY / London Overlap', status: 'Peak Volatility' };
    if (hour >= 17 && hour < 21) return { name: 'New York Session', status: 'Moderate Volatility' };
    return { name: 'Market Close', status: 'Low Liquidity' };
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [setups, setSetups] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
    const [currentPrice, setCurrentPrice] = useState(null);
    const [session, setSession] = useState(getSession());
    const { addToast } = useToast();
    const [overlays, setOverlays] = useState({ zones: [], labels: [] });
    const [riskStatus, setRiskStatus] = useState({ diversificationScore: 100, globalRiskStatus: 'REAL-TIME' });
    const [isRefining, setIsRefining] = useState(false);
    const [globalSignals, setGlobalSignals] = useState([]);

    const mapAnnotationsToOverlays = (annotations, liquidityMap = [], marketState = null) => {
        const lastCandleTime = chartData && chartData.length > 0 ? chartData[chartData.length - 1].time : Date.now() / 1000;
        const overlays = AnnotationMapper.mapToOverlays(annotations, { lastCandleTime, timeframe: '1h', marketState });
        return { ...overlays, liquidityMap };
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setSession(getSession());
        }, 60000);

        // Phase 14: Initialize Signal Manager Persistence
        signalManager.init();

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const unsubscribeDB = subscribeToTradeSetups((data) => {
            setSetups(data);
        });

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const apiSymbol = marketData.mapSymbol(selectedSymbol);
                const formatted = await marketData.fetchHistory(apiSymbol, '1h', 100);
                setChartData(formatted);
                if (formatted.length > 0) {
                    setCurrentPrice(formatted[formatted.length - 1].close);
                }
                setLoading(false);
            } catch (e) {
                console.error("Failed to load history", e);
                setLoading(false);
            }
        };

        fetchHistory();

        const apiSymbol = selectedSymbol.replace('/', '');
        marketData.connect(apiSymbol, '1h');
        const unsubscribeWS = marketData.subscribe((candle) => {
            // Phase 13: Real-time Signal Management
            signalManager.updateMarketPrice(selectedSymbol, candle.close);

            setChartData(prev => {
                const last = prev[prev.length - 1];
                if (last && last.time === candle.time) {
                    const newData = [...prev];
                    newData[prev.length - 1] = candle;
                    return newData;
                }
                return [...prev, candle];
            });
            setCurrentPrice(candle.close);
        });

        return () => {
            unsubscribeDB();
            unsubscribeWS();
            marketData.disconnect();
        };
    }, [selectedSymbol]);

    // Phase 13: Global Signals Subscription
    useEffect(() => {
        const unsubscribeDB = subscribeToGlobalSignals((dbSignals) => {
            const liveSignals = signalManager.getActiveSignals();
            setGlobalSignals([...liveSignals, ...dbSignals]);
        });

        const unsubscribeLive = signalManager.subscribe((liveSignals) => {
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

    // Phase 14: Autonomous Background Scanner
    useEffect(() => {
        const SCAN_LIST = ['BTC/USDT', 'ETH/USDT', 'XAU/USD', 'EUR/USD', 'GBP/USD'];
        let currentIndex = 0;

        const performBackgroundScan = async () => {
            const sym = SCAN_LIST[currentIndex];
            console.log(`[BackgroundScanner] Scanning ${sym} for institutional setups...`);

            try {
                const history = await marketData.fetchHistory(sym, '1h', 100);
                if (history && history.length >= 50) {
                    await generateTradeAnalysis(
                        history,
                        sym,
                        '1H',
                        null,
                        'ADVANCED',
                        async (result) => {
                            if (!result.isPartial) {
                                // Save full analysis/setup to DB to populate dashboard
                                await addDoc(collection(db, "tradeSetups"), result);
                                console.log(`[BackgroundScanner] Successfully scanned ${sym}`);
                            }
                        }
                    );
                }
            } catch (e) {
                console.warn(`[BackgroundScanner] Scan failed for ${sym}:`, e.message);
            }

            currentIndex = (currentIndex + 1) % SCAN_LIST.length;
        };

        // Scan every 5 minutes
        const scanInterval = setInterval(performBackgroundScan, 300000);

        // Initial delay to let the dashboard load first
        const initialDelay = setTimeout(performBackgroundScan, 30000);

        return () => {
            clearInterval(scanInterval);
            clearTimeout(initialDelay);
        };
    }, []);

    const handleAIScan = async () => {
        if (chartData.length < 50) {
            addToast("Not enough market data to analyze. Please wait for the chart to load.", 'warning');
            return;
        }

        setLoading(true);
        setIsRefining(true);

        try {
            const newSetup = await generateTradeAnalysis(
                chartData,
                selectedSymbol,
                '1H',
                null,
                'ADVANCED',
                (partial) => {
                    setSetups(prev => {
                        const exists = prev.find(s => s.id === partial.id || (s.symbol === partial.symbol && s.strategy === partial.strategy));
                        if (exists) return prev.map(s => (s.id === partial.id || (s.symbol === partial.symbol && s.strategy === partial.strategy)) ? partial : s);
                        return [partial, ...prev];
                    });

                    if (partial.annotations) {
                        const visualOverlays = mapAnnotationsToOverlays(partial.annotations, partial.liquidityMap, partial.marketState);
                        setOverlays(visualOverlays);
                    }
                    setLoading(false);
                    addToast(`Fast Scan Complete. Refining Deep Intel...`, 'info');
                }
            );

            await addDoc(collection(db, "tradeSetups"), newSetup);

            setSetups(prev => {
                const index = prev.findIndex(s => s.isPartial && s.symbol === newSetup.symbol);
                if (index !== -1) {
                    const next = [...prev];
                    next[index] = newSetup;
                    return next;
                }
                return [newSetup, ...prev];
            });

            if (newSetup.annotations) {
                const visualOverlays = mapAnnotationsToOverlays(newSetup.annotations, newSetup.liquidityMap, newSetup.marketState);
                setOverlays(visualOverlays);
            }

            addToast(`AI Analysis Fully Enhanced: ${newSetup.type}!`, 'success');
        } catch (error) {
            console.error("AI Scan failed", error);
            addToast("AI Analysis failed. Please try again.", 'error');
            setLoading(false);
        }
        setIsRefining(false);
    };

    if (loading && chartData.length === 0) {
        return (
            <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '24px', height: '32px', width: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                    <div className="card" style={{ height: '120px' }}></div>
                    <div className="card" style={{ height: '120px' }}></div>
                    <div className="card" style={{ height: '120px' }}></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
            <div className="flex-row justify-between items-end" style={{ marginBottom: '24px' }}>
                <div className="flex-col">
                    <h1 style={{ fontSize: '28px', margin: 0, letterSpacing: '-1px', fontWeight: '900', color: 'white' }}>COMMAND CENTER</h1>
                    <p style={{ fontSize: '11px', opacity: 0.4, fontWeight: 'bold', margin: 0 }}>INTELLIGENCE v5.2 // INSTITUTIONAL GRADE</p>
                </div>
                <div className="flex-row gap-lg items-center">
                    <div className="flex-row items-center gap-xs">
                        <div className="pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                        <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', letterSpacing: '1px' }}>LIVE CONNECTION</span>
                    </div>
                    <div className="badge badge-success" style={{ fontSize: '9px', fontWeight: '900' }}>CORE ENGINE ACTIVE</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', opacity: 0.6 }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                </div>
            </div>

            <GlobalRiskHUD setups={setups} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div className="card interactive-card" onClick={() => navigate('/app/markets')} style={{ cursor: 'pointer' }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px' }}>{selectedSymbol} Price</p>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                        ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="card interactive-card" onClick={() => navigate('/app/markets')} style={{ cursor: 'pointer' }}>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px' }}>Active Setups</p>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{setups.filter(s => s.status === 'ACTIVE').length}</div>
                </div>
                <div className="card">
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px' }}>Portfolio Risk Status</p>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{riskStatus.globalRiskStatus}</div>
                </div>
                <div className="card">
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '8px' }}>Institutional Cycle</p>
                    <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{setups[0]?.marketState?.amdCycle?.phase || 'NEUTRAL'}</div>
                </div>
                <SentimentGauge score={setups[0]?.marketState?.sentiment?.score || 50} />
                <LiveWallet />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                <div className="flex-col gap-md">
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="flex-row gap-sm items-center">
                                <h2 className="card-title" style={{ margin: 0, fontSize: '16px' }}>{selectedSymbol} Structure</h2>
                                <select
                                    className="input"
                                    style={{ width: '120px', fontSize: '11px', padding: '2px 4px', height: '24px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                    value={selectedSymbol}
                                    onChange={(e) => setSelectedSymbol(e.target.value)}
                                >
                                    <option value="BTC/USDT">BTC/USDT</option>
                                    <option value="ETH/USDT">ETH/USDT</option>
                                    <option value="EUR/USD">EUR/USD</option>
                                    <option value="GBP/USD">GBP/USD</option>
                                    <option value="XAU/USD">XAU/USD</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ height: '380px', position: 'relative' }}>
                            <Chart data={chartData} overlays={overlays} />
                            <LegendPanel />
                        </div>
                    </div>
                    <div className="card">
                        <h2 className="card-title" style={{ fontSize: '14px', marginBottom: '16px' }}>Active Trade Monitoring</h2>
                        <ActivePositions />
                    </div>
                    <MarketTicker />
                    <AlphaMonitor />
                </div>

                <div className="flex-col gap-md">
                    <div style={{ marginBottom: '16px' }}>
                        <GlobalSignalsPanel
                            signals={globalSignals}
                            onSelectSignal={(sig) => {
                                setSelectedSymbol(sig.symbol);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        />
                    </div>

                    <div className="flex-row justify-between items-center">
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>High Probability Setups</h2>
                        <button
                            onClick={handleAIScan}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center', minWidth: '140px' }}
                        >
                            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Bot size={16} />}
                            {loading ? 'Analyzing...' : 'AI Scan'}
                        </button>
                    </div>

                    <div className="card">
                        <h2 className="card-title" style={{ fontSize: '14px', marginBottom: '16px' }}>Strategy Risk Projection</h2>
                        <MonteCarloRisk />
                    </div>

                    {setups.map(setup => (
                        <div key={setup.id} onClick={() => {
                            if (setup.annotations) {
                                setOverlays(mapAnnotationsToOverlays(setup.annotations, setup.liquidityMap, setup.marketState));
                            }
                        }} style={{ cursor: 'pointer' }}>
                            <TradeSetupCard setup={setup} />
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                <InstitutionalScanner onSelectSymbol={(sym) => {
                    setSelectedSymbol(sym);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }} />
                <div className="flex-col gap-md">
                    <div className="card">
                        <h3 className="card-title" style={{ fontSize: '13px', marginBottom: '12px' }}>Relative Strength Heatmap</h3>
                        <MarketHeatmap />
                    </div>
                    <CorrelationHeatmap />
                </div>
                <div className="flex-col gap-md">
                    <EconomicCalendar />
                    <NewsFeed />
                </div>
            </div>
        </div>
    );
}
