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
import { newsService } from '../services/newsService';

const getSession = () => {
    const hour = new Date().getUTCHours();
    if (hour >= 0 && hour < 8) return { name: 'Asian Session', status: 'Low Volatility' };
    if (hour >= 8 && hour < 12) return { name: 'London Session', status: 'High Volatility' };
    if (hour >= 12 && hour < 17) return { name: 'NY / London Overlap', status: 'Peak Volatility' };
    if (hour >= 17 && hour < 21) return { name: 'New York Session', status: 'Moderate Volatility' };
    return { name: 'Market Close', status: 'Low Liquidity' };
};

import { CorrelationClusterEngine } from '../services/CorrelationClusterEngine';
import { AnnotationMapper } from '../services/annotationMapper';

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

    useEffect(() => {
        // Future Phase: Integration with real CorrelationClusterEngine based on active wallet/setups
    }, [setups]);

    useEffect(() => {
        // Update session every minute
        const interval = setInterval(() => {
            setSession(getSession());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // 1. Subscribe to Firestore updates
        const unsubscribeDB = subscribeToTradeSetups((data) => {
            // Filter setups for the selected symbol if needed, 
            // but usually we want to see all High Prob setups.
            // For the dashboard, let's prioritize the selected one.
            const sorted = [...data].sort((a, b) => {
                if (a.symbol === selectedSymbol && b.symbol !== selectedSymbol) return -1;
                if (a.symbol !== selectedSymbol && b.symbol === selectedSymbol) return 1;
                return b.timestamp - a.timestamp;
            });
            setSetups(data);
        });

        // 2. Fetch Initial History
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

        // 3. Connect WebSocket
        const apiSymbol = selectedSymbol.replace('/', '');
        marketData.connect(apiSymbol, '1h');
        const unsubscribeWS = marketData.subscribe((candle) => {
            setChartData(prev => {
                const last = prev[prev.length - 1];
                if (last && last.time === candle.time) {
                    const newData = [...prev];
                    newData[prev.length - 1] = candle;
                    return newData;
                } else {
                    return [...prev, candle];
                }
            });
            setCurrentPrice(candle.close);
        });

        return () => {
            unsubscribeDB();
            unsubscribeWS();
            marketData.disconnect();
        };
    }, [selectedSymbol]);

    // UseToast moved to top

    const mapAnnotationsToOverlays = (annotations, liquidityMap = []) => {
        const lastCandleTime = chartData && chartData.length > 0 ? chartData[chartData.length - 1].time : Date.now() / 1000;
        const overlays = AnnotationMapper.mapToOverlays(annotations, { lastCandleTime, timeframe: '1h' });

        return {
            ...overlays,
            liquidityMap
        };
    };

    const [isRefining, setIsRefining] = useState(false);

    const handleAIScan = async () => {
        if (chartData.length < 50) {
            addToast("Not enough market data to analyze. Please wait for the chart to load.", 'warning');
            return;
        }

        setLoading(true);
        setIsRefining(true);

        try {
            // 1. Analyze with partial result callback for instant feedback
            const newSetup = await generateTradeAnalysis(
                chartData,
                selectedSymbol,
                '1H',
                null,
                'ADVANCED',
                (partial) => {
                    // Update UI immediately with deterministic results
                    setSetups(prev => {
                        const exists = prev.find(s => s.id === partial.id || (s.symbol === partial.symbol && s.strategy === partial.strategy));
                        if (exists) return prev.map(s => (s.id === partial.id || (s.symbol === partial.symbol && s.strategy === partial.strategy)) ? partial : s);
                        return [partial, ...prev];
                    });

                    if (partial.annotations) {
                        const visualOverlays = mapAnnotationsToOverlays(partial.annotations, partial.liquidityMap);
                        setOverlays(visualOverlays);
                    }

                    // STOP the heavy loading state as soon as we have technical data
                    setLoading(false);
                    addToast(`Fast Scan Complete. Refining Deep Intel...`, 'info');
                }
            );

            // 2. Save full result to Firestore
            await addDoc(collection(db, "tradeSetups"), newSetup);

            // 3. Update UI with final AI-enhanced setup
            setSetups(prev => {
                // If we have a local partial one, replace it
                const index = prev.findIndex(s => s.isPartial && s.symbol === newSetup.symbol);
                if (index !== -1) {
                    const next = [...prev];
                    next[index] = newSetup;
                    return next;
                }
                return [newSetup, ...prev];
            });

            if (newSetup.annotations) {
                const visualOverlays = mapAnnotationsToOverlays(newSetup.annotations, newSetup.liquidityMap);
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
            <div>
                <div style={{ marginBottom: '24px', height: '32px', width: '200px', background: 'var(--color-bg-tertiary)', borderRadius: '4px' }}></div>
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


    // useNavigate moved to top

    // ... (rest of component)

    return (
        <div>
            <div className="flex-row justify-between items-end" style={{ marginBottom: '24px' }}>
                <div className="flex-col">
                    <h1 style={{ fontSize: '28px', margin: 0, letterSpacing: '-1px', fontWeight: '900', color: 'white' }}>COMMAND CENTER</h1>
                    <p style={{ fontSize: '11px', opacity: 0.4, fontWeight: 'bold', margin: 0 }}>INTELLIGENCE v5.2 // INSTITUTIONAL GRADE</p>
                </div>
                <div className="flex-row gap-md items-center">
                    <div className="badge badge-success" style={{ fontSize: '9px', fontWeight: '900' }}>CORE ENGINE ACTIVE</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', opacity: 0.6 }}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</div>
                </div>
            </div>

            <GlobalRiskHUD setups={setups} />

            {/* Sentiment Cards (High-Density) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div
                    className="card interactive-card"
                    onClick={() => navigate('/app/markets')}
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Bitcoin Price</p>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                        ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p style={{ fontSize: '12px', marginTop: '4px', color: 'var(--color-text-secondary)' }}>Live from Binance</p>
                </div>
                <div
                    className="card interactive-card"
                    onClick={() => navigate('/app/markets')} // Or /setups if we had it
                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Active Setups</p>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{setups.filter(s => s.status === 'ACTIVE').length}</div>
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>Ready to execute</p>
                </div>
                <div className="card">
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Portfolio Risk Status</p>
                    <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: riskStatus.globalRiskStatus.includes('DANGER') ? 'var(--color-danger)' :
                            riskStatus.globalRiskStatus.includes('WARNING') ? 'var(--color-warning)' :
                                'var(--color-success)'
                    }}>
                        {riskStatus.globalRiskStatus}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div className="badge" style={{ fontSize: '10px' }}>{riskStatus.diversificationScore} Diversification Score</div>
                    </div>
                </div>
                <div className="card">
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '8px' }}>Market Obligation</p>
                    <div style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: setups[0]?.marketState?.obligations?.state === 'OBLIGATED'
                            ? 'var(--color-success)'
                            : 'var(--color-text-secondary)'
                    }}>
                        {setups[0]?.marketState?.obligations?.state || 'UNKNOWN'}
                    </div>
                    {setups[0]?.marketState?.obligations?.primaryObligation && (
                        <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-text-secondary)' }}>
                            {setups[0].marketState.obligations.primaryObligation.description}
                        </p>
                    )}
                </div>
                <SentimentGauge score={setups[0]?.marketState?.sentiment?.score || 50} />
                <LiveWallet />
            </div>



            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>

                {/* Left Column: Chart */}
                <div className="flex-col gap-md">
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div className="card-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', margin: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="flex-row gap-sm items-center">
                                <h2 className="card-title" style={{ margin: 0 }}>{selectedSymbol} Structure</h2>
                                <select
                                    className="input"
                                    style={{ width: '120px', fontSize: '11px', padding: '2px 4px', height: '24px' }}
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
                            <div className="flex-row gap-sm">
                                <span className="badge badge-neutral">1H</span>
                                <span className="badge badge-success">LIVE</span>
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
                </div>

                {/* Right Column: Trade Setups */}
                <div className="flex-col gap-md">
                    <div className="flex-row justify-between items-center">
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>High Probability Setups</h2>
                        <button
                            id="ai-btn"
                            onClick={handleAIScan}
                            disabled={loading}
                            className={`btn btn-primary ${loading ? 'opacity-50' : ''}`}
                            style={{ fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center', minWidth: '140px' }}
                        >
                            {loading ? (
                                <RefreshCw size={16} className="animate-spin" />
                            ) : isRefining ? (
                                <RefreshCw size={16} className="animate-spin" style={{ color: '#10B981' }} />
                            ) : (
                                <Bot size={16} />
                            )}
                            {loading ? 'Analyzing...' : isRefining ? 'Refining Intel...' : 'AI Scan'}
                        </button>
                    </div>

                    <div className="card">
                        <h2 className="card-title" style={{ fontSize: '14px', marginBottom: '16px' }}>Strategy Risk Projection</h2>
                        <MonteCarloRisk />
                    </div>

                    {setups.map(setup => (
                        <div key={setup.id} onClick={() => {
                            // On click, allow visualizing this setup's annotations if available
                            if (setup.annotations) {
                                setOverlays(mapAnnotationsToOverlays(setup.annotations));
                            }
                        }} style={{ cursor: 'pointer' }}>
                            <TradeSetupCard setup={setup} />
                        </div>
                    ))}

                    {setups.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
                            No active setups found.
                        </div>
                    )}
                </div>

            </div>

            {/* Market Intelligence Section */}
            <h2 className="card-title" style={{ fontSize: '18px', marginBottom: '16px' }}>Institutional Market Intel</h2>
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
                    {overlays.liquidityMap && overlays.liquidityMap.length > 0 && (
                        <div className="card glass-panel" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex-row justify-between items-center" style={{ marginBottom: '16px' }}>
                                <h3 className="card-title" style={{ fontSize: '12px', margin: 0 }}>ORDER FLOW DEPTH</h3>
                                <div className="badge badge-outline" style={{ fontSize: '8px' }}>DOM VIEW</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {overlays.liquidityMap.slice(0, 10).map((l, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '10px',
                                        padding: '6px 8px',
                                        background: 'rgba(255,255,255,0.02)',
                                        borderRadius: '4px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: `${l.intensity * 100}%`,
                                            background: l.side === 'BID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            zIndex: 0
                                        }} />
                                        <span style={{
                                            color: l.side === 'BID' ? '#10b981' : '#ef4444',
                                            fontWeight: 'bold',
                                            zIndex: 1,
                                            fontFamily: 'monospace'
                                        }}>
                                            {l.side} @ {l.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.6)', zIndex: 1, fontFamily: 'monospace' }}>
                                            {((l.volume || 0) / 1000).toFixed(1)}k
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-col gap-md">
                    <EconomicCalendar />
                    <NewsFeed />
                </div>
            </div>
        </div>
    );
}
