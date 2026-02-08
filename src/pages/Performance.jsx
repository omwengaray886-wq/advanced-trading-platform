import { TrendingUp, AlertTriangle, ShieldCheck, Activity, BarChart3, HelpCircle, FileText, Zap } from 'lucide-react';
import { PredictionTracker } from '../services/predictionTracker';
import { backtestService } from '../services/backtestService';
import { userPerformanceService } from '../services/userPerformanceService';
import EquityCurve from '../components/features/EquityCurve';
import PerformanceComparisonChart from '../components/features/PerformanceComparisonChart';
import AlphaReport from '../components/features/AlphaReport';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../components/layout/Footer';
import { User, LayoutDashboard, PenLine } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import StrategyJournalModal from '../components/features/StrategyJournalModal';

export default function Performance() {
    const [backtest, setBacktest] = React.useState(null);
    const [userStats, setUserStats] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [showReport, setShowReport] = React.useState(false);
    const [selectedPair, setSelectedPair] = React.useState('BTCUSDT');
    const [viewMode, setViewMode] = React.useState('SYSTEM'); // 'SYSTEM' | 'USER'
    const [journalingTrade, setJournalingTrade] = React.useState(null);
    const { addToast } = useToast();

    const handleSaveJournal = (journalData) => {
        // In a real app, this would be saved to Firestore
        console.log('Saving journal:', journalData);
        addToast(`Journal for ${journalData.tradeId} archived successfully.`, 'success');
    };

    // Load System Backtest
    React.useEffect(() => {
        const runTest = async () => {
            if (viewMode === 'SYSTEM') {
                setLoading(true);
                const result = await backtestService.runBacktest(selectedPair, '1H', 300);
                setBacktest(result);
                setLoading(false);
            }
        };
        runTest();
    }, [selectedPair, viewMode]);

    // Load User Stats
    React.useEffect(() => {
        const loadUser = async () => {
            if (viewMode === 'USER') {
                setLoading(true);
                const stats = await userPerformanceService.getUserMetrics();
                setUserStats(stats);
                setLoading(false);
            }
        };
        loadUser();
    }, [viewMode]);

    const stats = viewMode === 'SYSTEM' ? (backtest?.stats || {
        totalTrades: 0, winRate: 0, profitFactor: 0, sharpe: 0, maxDrawdown: 0, totalReturn: 0
    }) : (userStats || {
        totalTrades: 0, winRate: 0, profitFactor: 0, sharpe: 0, maxDrawdown: 0, totalReturn: 0
    });

    // Handle history data (real or mock for UI)
    const historyData = viewMode === 'SYSTEM'
        ? (backtest?.history || [])
        : (userStats?.recentHistory || stats.history || []);

    const currentEquityCurve = viewMode === 'SYSTEM' ? backtest?.equityCurve : userStats?.equityCurve;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>TradeAlgo</h1>
                <div className="flex-row gap-md">
                    <a href="/" className="btn btn-ghost">Home</a>
                    <a href="/pricing" className="btn btn-ghost">Pricing</a>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px 20px' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                            {viewMode === 'SYSTEM' ? 'Alpha Analytics' : 'My Performance'}
                        </h1>
                        <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto', marginBottom: '24px' }}>
                            {viewMode === 'SYSTEM'
                                ? 'Institutional-grade backtesting engine running real-time strategy simulations on historical market data.'
                                : 'Track your live trading performance, analyze execution quality, and identify areas for improvement.'}
                        </p>

                        {/* View Mode Toggle */}
                        <div className="flex-row justify-center gap-sm" style={{ marginBottom: '24px' }}>
                            <button
                                onClick={() => setViewMode('SYSTEM')}
                                className={`btn ${viewMode === 'SYSTEM' ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ display: 'flex', gap: '8px' }}
                            >
                                <LayoutDashboard size={14} /> System Alpha
                            </button>
                            <button
                                onClick={() => setViewMode('USER')}
                                className={`btn ${viewMode === 'USER' ? 'btn-primary' : 'btn-ghost'}`}
                                style={{ display: 'flex', gap: '8px' }}
                            >
                                <User size={14} /> My Trades
                            </button>
                        </div>

                        {viewMode === 'SYSTEM' && (
                            <button
                                onClick={() => setShowReport(true)}
                                className="btn btn-primary no-print"
                                disabled={loading || !backtest}
                                style={{ margin: '0 auto' }}
                            >
                                <FileText size={16} /> Generate Alpha Report
                            </button>
                        )}
                    </div>

                    <div className="flex-row justify-center gap-sm" style={{ marginBottom: '32px' }}>
                        {['BTCUSDT', 'ETHUSDT', 'EURUSDT', 'GBPUSDT'].map(p => (
                            <button
                                key={p}
                                onClick={() => setSelectedPair(p)}
                                className={`btn ${selectedPair === p ? 'btn-primary' : 'btn-outline'}`}
                                style={{ fontSize: '12px' }}
                            >
                                {p.replace('USDT', '')}
                            </button>
                        ))}
                    </div>

                    {/* Critical Disclaimer */}
                    <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid var(--color-danger)', borderRadius: '8px', marginBottom: '48px' }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'start' }}>
                            <AlertTriangle size={24} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--color-danger)' }}>
                                    IMPORTANT: Past Performance Disclaimer
                                </h3>
                                <p style={{ fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                                    These statistics show <strong>analysis generation</strong>, not actual trading results.
                                    They do NOT represent guaranteed profits or future performance. Markets are unpredictable and conditions change constantly.
                                    TradeAlgo is an educational tool, not a guarantee of success. Trade at your own risk.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card glass-panel" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-accent-primary)', marginBottom: '4px' }}>
                                {loading ? '...' : stats.totalTrades}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Total Executions
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card glass-panel" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-success)', marginBottom: '4px' }}>
                                {loading ? '...' : `${stats.winRate}%`}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Win Rate
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card glass-panel" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '4px' }}>
                                {loading ? '...' : `${stats.profitFactor}x`}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Profit Factor
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card glass-panel" style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-warning)', marginBottom: '4px' }}>
                                {loading ? '...' : `${stats.maxDrawdown}%`}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Max Drawdown
                            </div>
                        </motion.div>
                    </div>

                    {/* Equity Curve & Detailed Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '48px' }}>
                        <div className="card glass-panel" style={{ padding: '24px' }}>
                            <div className="flex-row justify-between items-center" style={{ marginBottom: '20px' }}>
                                <div className="flex-row items-center gap-sm">
                                    <Activity size={18} color="var(--color-accent-primary)" />
                                    <h3 style={{ margin: 0, fontSize: '16px' }}>Growth Trajectory</h3>
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 'bold' }}>
                                    {loading ? 'Analyzing...' : `+${stats.totalReturn}% Period ROI`}
                                </span>
                            </div>
                            {loading ? (
                                <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                        <Activity size={32} color="var(--color-accent-primary)" />
                                    </motion.div>
                                </div>
                            ) : (
                                viewMode === 'USER' && userStats && backtest ? (
                                    <PerformanceComparisonChart userEquity={userStats.equityCurve} systemEquity={backtest.equityCurve} />
                                ) : (
                                    <EquityCurve data={currentEquityCurve} height={300} />
                                )
                            )}
                        </div>

                        <div className="flex-col gap-md">
                            <div className="card glass-panel" style={{ padding: '20px' }}>
                                <div className="flex-row items-center gap-sm" style={{ marginBottom: '16px' }}>
                                    <ShieldCheck size={18} color="var(--color-success)" />
                                    <h3 style={{ margin: 0, fontSize: '14px' }}>Risk Assessment</h3>
                                </div>
                                <div className="flex-col gap-sm">
                                    <div className="flex-row justify-between">
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Sharpe Ratio</span>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: stats.sharpe > 1 ? 'var(--color-success)' : 'white' }}>
                                            {loading ? '...' : stats.sharpe?.toFixed(2) || '0.00'}
                                        </span>
                                    </div>
                                    <div className="progress-bar" style={{ height: '4px' }}><div className="progress-fill" style={{ width: `${Math.min(stats.sharpe * 50, 100)}%` }}></div></div>

                                    <div className="flex-row justify-between" style={{ marginTop: '8px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Sortino Ratio</span>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: stats.sortino > 1.5 ? 'var(--color-success)' : 'white' }}>
                                            {loading ? '...' : stats.sortino?.toFixed(2) || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="progress-bar" style={{ height: '4px' }}><div className="progress-fill" style={{ width: `${Math.min((stats.sortino || 0) * 40, 100)}%`, background: '#f59e0b' }}></div></div>

                                    <div className="flex-row justify-between" style={{ marginTop: '8px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Recovery Factor</span>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                            {loading ? '...' : (stats.recoveryFactor?.toFixed ? stats.recoveryFactor.toFixed(2) : (stats.recoveryFactor || 'N/A'))}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '9px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>Net Profit / Max Drawdown</div>
                                </div>
                            </div>

                            <div className="card glass-panel" style={{ padding: '20px', flex: 1 }}>
                                <div className="flex-row items-center gap-sm" style={{ marginBottom: '12px' }}>
                                    <Activity size={18} color="#38bdf8" />
                                    <h3 style={{ margin: 0, fontSize: '14px' }}>Session Edge Heatmap</h3>
                                </div>
                                <div className="flex-col gap-sm">
                                    {loading ? (
                                        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Mapping killzones...</div>
                                    ) : (
                                        stats.sessionEdge ? (
                                            Object.entries(stats.sessionEdge).map(([session, data], i) => {
                                                const wr = data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0;
                                                return (
                                                    <div key={i} className="flex-col" style={{ marginBottom: '8px' }}>
                                                        <div className="flex-row justify-between items-center" style={{ marginBottom: '4px' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{session} KILLZONE</span>
                                                            <span style={{ fontSize: '10px', color: wr > 60 ? 'var(--color-success)' : 'white' }}>{wr}% WR</span>
                                                        </div>
                                                        <div className="progress-bar" style={{ height: '6px', background: 'rgba(255,255,255,0.05)' }}>
                                                            <div
                                                                className="progress-fill"
                                                                style={{
                                                                    width: `${wr}%`,
                                                                    background: wr > 60 ? 'var(--color-success)' : wr > 50 ? 'var(--color-warning)' : '#ef4444',
                                                                    boxShadow: wr > 60 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
                                                                }}
                                                            />
                                                        </div>
                                                        <div style={{ fontSize: '8px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>{data.total} Trades Executed</div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div style={{ fontSize: '11px', opacity: 0.5 }}>No session data available.</div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Auditable Receipt History (Phase 51 Upgrade) */}
                    <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Auditable Prediction Receipts</h2>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
                        Every prediction generated by the engine is logged with a unique ID for transparency.
                    </p>
                    <div className="card" style={{ marginBottom: '48px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>PREDICTION ID</th>
                                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>SYMBOL</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>EDGE</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>OUTCOME</th>
                                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>JOURNAL</th>
                                    <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-secondary)' }}>TIMESTAMP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', fontSize: '12px', opacity: 0.5 }}>Syncing with Firestore...</td></tr>
                                ) : (
                                    historyData.length === 0 ? (
                                        <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', fontSize: '12px', opacity: 0.5 }}>No prediction history found.</td></tr>
                                    ) : (
                                        historyData.map((p, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                                <td style={{ padding: '12px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--color-accent-primary)' }}>{p.id}</td>
                                                <td style={{ padding: '12px', fontSize: '12px', fontWeight: 'bold' }}>{p.symbol}</td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: (p.edgeScore || p.edge || p.quantScore) >= 75 ? 'var(--color-success)' : 'white' }}>
                                                        {p.edgeScore || p.edge || p.quantScore || 'N/A'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <span style={{
                                                        fontSize: '9px',
                                                        fontWeight: 'bold',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        background: p.outcome === 'HIT' ? 'rgba(16, 185, 129, 0.1)' : p.outcome === 'FAIL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                        color: p.outcome === 'HIT' ? 'var(--color-success)' : p.outcome === 'FAIL' ? 'var(--color-danger)' : 'white'
                                                    }}>{p.outcome}</span>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => setJournalingTrade(p)}
                                                        className="btn btn-ghost"
                                                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                                                    >
                                                        <PenLine size={14} color="var(--color-accent-primary)" />
                                                    </button>
                                                </td>
                                                <td style={{ padding: '12px', textAlign: 'right', fontSize: '11px', opacity: 0.6 }}>{p.time || new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC'}</td>
                                            </tr>
                                        ))
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>

                    <AnimatePresence>
                        {journalingTrade && (
                            <StrategyJournalModal
                                trade={journalingTrade}
                                onClose={() => setJournalingTrade(null)}
                                onSave={handleSaveJournal}
                            />
                        )}
                    </AnimatePresence>

                    {/* By Market */}
                    <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Analysis by Market</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '48px' }}>
                        {stats.byMarket.map((market, idx) => (
                            <div key={idx} className="card">
                                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{market.name}</h3>
                                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--color-accent-primary)' }}>
                                    {market.setups}
                                </div>
                                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                                    setups analyzed
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Methodology Note */}
                    <div style={{ padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', gap: '16px' }}>
                        <HelpCircle size={24} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
                        <div>
                            <h3 style={{ fontSize: '15px', marginBottom: '8px', color: 'white' }}>Quantitative Methodology</h3>
                            <p style={{ fontSize: '13px', lineHeight: '1.6', margin: 0, color: 'var(--color-text-secondary)' }}>
                                Backtest results are calculated using a 300-candle lookback window. Our engine simulates trade execution using a fixed 1% risk-per-trade model. Strategy signals (SMC, Wyckoff, etc.) are processed through the Analysis Orchestrator to ensure consistency between historical simulation and live market data.
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            <AnimatePresence>
                {showReport && (
                    <AlphaReport
                        data={backtest}
                        onClose={() => setShowReport(false)}
                    />
                )}
            </AnimatePresence>

            <Footer />
        </div>
    );
}
