import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { monteCarloService } from '../../services/monteCarloService';
import { ShieldAlert, TrendingUp, Info } from 'lucide-react';

export default function MonteCarloRisk({ stats }) {
    // Default stats if none provided (from backtest)
    const activeStats = stats || { winRate: 55, profitFactor: 1.8, totalTrades: 100 };

    const results = useMemo(() => {
        return monteCarloService.runSimulation(activeStats, 1000, 50, 10000);
    }, [activeStats]);

    // Simple SVG rendering for the paths
    const renderPath = (path) => {
        const minVal = 5000;
        const maxVal = 25000;
        const range = maxVal - minVal;

        const points = path.map((val, i) => {
            const x = (i / (path.length - 1)) * 100;
            const y = 100 - ((val - minVal) / range) * 100;
            return `${x},${y}`;
        }).join(' ');

        return <polyline points={points} fill="none" strokeWidth="0.5" />;
    };

    return (
        <div className="flex-col gap-md">
            <div className="flex-row justify-between items-center">
                <div className="flex-col">
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: results.riskOfRuin > 10 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {results.riskOfRuin}%
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Risk of Ruin</div>
                </div>
                <div className="flex-col items-end">
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                        ${results.averageFinalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>Avg. Expectancy (50t)</div>
                </div>
            </div>

            {/* Path Visualization */}
            <div style={{ height: '120px', position: 'relative', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflow: 'hidden' }}>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
                    {/* Grid lines */}
                    <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,b255,255,0.05)" strokeWidth="0.5" />

                    {/* Simulation Paths */}
                    <g stroke="rgba(56, 189, 248, 0.2)">
                        {results.paths.map((p, i) => <React.Fragment key={i}>{renderPath(p)}</React.Fragment>)}
                    </g>

                    {/* Average Path (Median) */}
                    <polyline
                        points={results.paths[0].map((_, i) => {
                            const val = results.percentiles.p50; // Simple flat line for visualization of target
                            const x = (i / (results.paths[0].length - 1)) * 100;
                            const y = 100 - ((val - 5000) / 20000) * 100;
                            return `${x},${y}`;
                        }).join(' ')}
                        fill="none" stroke="var(--color-accent-primary)" strokeWidth="1.5" strokeDasharray="2"
                    />
                </svg>

                <div style={{ position: 'absolute', top: '4px', right: '8px', fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>
                    1,000 Iterations
                </div>
            </div>

            <div className="flex-row items-center gap-xs" style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '8px', borderRadius: '4px' }}>
                <Info size={14} color="var(--color-accent-primary)" />
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                    Probabilistic modeling suggests a <b>{100 - results.riskOfRuin}%</b> probability of account survival over the next 50 trades.
                </span>
            </div>
        </div>
    );
}
