import React, { useState, useEffect, useCallback } from 'react';
import { Chart } from '../ui/Chart';
import { marketData } from '../../services/marketData';
import { AnalysisOrchestrator } from '../../services/analysisOrchestrator';
import { motion } from 'framer-motion';

import { AnnotationMapper } from '../../services/annotationMapper';

const orchestrator = new AnalysisOrchestrator();

export default function ChartGrid({ initialPair = 'BTCUSDT' }) {
    const [gridSize, setGridSize] = useState(1); // 1, 2, or 4
    const [charts, setCharts] = useState([
        { id: 1, pair: 'BTCUSDT', timeframe: '1H', data: [], analysis: null },
        { id: 2, pair: 'ETHUSDT', timeframe: '4H', data: [], analysis: null },
        { id: 3, pair: 'EURUSDT', timeframe: '1H', data: [], analysis: null },
        { id: 4, pair: 'SOLUSDT', timeframe: '1D', data: [], analysis: null }
    ]);

    const [syncCrosshair, setSyncCrosshair] = useState(null);

    // Fetch data for all visible charts
    useEffect(() => {
        const fetchAllData = async () => {
            const updatedCharts = await Promise.all(charts.slice(0, gridSize).map(async (chart) => {
                if (chart.data.length > 0) return chart;

                try {
                    const data = await marketData.fetchHistory(chart.pair, chart.timeframe, 200);
                    const analysis = await orchestrator.analyze(data, chart.pair, chart.timeframe);
                    return { ...chart, data, analysis };
                } catch (e) {
                    console.error("Grid fetch failed", e);
                    return chart;
                }
            }));

            if (updatedCharts.length !== charts.length || updatedCharts.some((c, i) => c !== charts[i])) {
                setCharts(prev => {
                    const newCharts = [...prev];
                    updatedCharts.forEach((uc, i) => { newCharts[i] = uc; });
                    return newCharts;
                });
            }
        };

        fetchAllData();
    }, [gridSize]);

    const handlePairChange = async (index, newPair) => {
        const data = await marketData.fetchHistory(newPair, charts[index].timeframe, 200);
        const analysis = await orchestrator.analyze(data, newPair, charts[index].timeframe);

        setCharts(prev => {
            const next = [...prev];
            next[index] = { ...next[index], pair: newPair, data, analysis };
            return next;
        });
    };

    const gridLayout = gridSize === 1 ? '1fr' : gridSize === 2 ? '1fr 1fr' : '1fr 1fr';
    const gridRows = gridSize <= 2 ? '1fr' : '1fr 1fr';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            {/* Grid Controls */}
            <div className="flex-row justify-between items-center glass-panel" style={{ padding: '8px 16px', borderRadius: '8px' }}>
                <div className="flex-row gap-sm">
                    {[1, 2, 4].map(size => (
                        <button
                            key={size}
                            onClick={() => setGridSize(size)}
                            className={`btn btn-xs ${gridSize === size ? 'btn-primary' : 'btn-ghost'}`}
                        >
                            {size} Chart{size > 1 ? 's' : ''}
                        </button>
                    ))}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
                    Crosshair Sync: <span style={{ color: 'var(--color-success)' }}>Active</span>
                </div>
            </div>

            {/* Charts Area */}
            <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: gridLayout,
                gridTemplateRows: gridRows,
                gap: '8px',
                minHeight: 0
            }}>
                {charts.slice(0, gridSize).map((chart, idx) => (
                    <motion.div
                        key={chart.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="glass-panel"
                        style={{ position: 'relative', overflow: 'hidden', padding: '12px', display: 'flex', flexDirection: 'column' }}
                    >
                        <div className="flex-row justify-between items-center" style={{ marginBottom: '8px' }}>
                            <div className="flex-row items-center gap-xs">
                                <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{chart.pair}</span>
                                <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{chart.timeframe}</span>
                            </div>
                            <select
                                value={chart.pair}
                                onChange={(e) => handlePairChange(idx, e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-tertiary)', fontSize: '10px' }}
                            >
                                <option value="BTCUSDT">BTC</option>
                                <option value="ETHUSDT">ETH</option>
                                <option value="SOLUSDT">SOL</option>
                                <option value="BNBUSDT">BNB</option>
                                <option value="DOGEUSDT">DOGE</option>
                                <option value="MATICUSDT">MATIC</option>
                                <option value="EURUSDT">EUR</option>
                                <option value="PAXGUSDT">GOLD</option>
                                <option value="GBPJPY">GBP/JPY</option>
                            </select>
                        </div>

                        <div style={{ flex: 1, minHeight: 0 }}>
                            <Chart
                                data={chart.data}
                                markers={[]}
                                overlays={chart.analysis ? AnnotationMapper.mapToOverlays(chart.analysis.annotations, { lastCandleTime: chart.data[chart.data.length - 1]?.time, timeframe: chart.timeframe }) : {}}
                                externalCrosshair={syncCrosshair}
                                onCrosshairMove={setSyncCrosshair}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
