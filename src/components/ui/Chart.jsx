/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart } from 'lightweight-charts';
import { normalizeDirection } from '../../utils/normalization';
import { EntryConfirmationOverlay } from './EntryConfirmationOverlay';
import { ChartLegend } from './ChartLegend';
import { HelpOverlay } from './HelpOverlay';
import { marketData } from '../../services/marketData';
import { LiquidityMapService } from '../../services/LiquidityMapService';

export const Chart = ({ data, markers = [], lines = [], overlays = { zones: [], labels: [] }, externalCrosshair = null, onCrosshairMove = null, analysis = null, setups = [] }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const seriesRef = useRef();
    const isInitializedRef = useRef(false);
    const priceLinesRef = useRef([]);
    const isInternalMoveRef = useRef(false);

    // HTML Overlay State
    const [overlayItems, setOverlayItems] = useState({
        zones: [],
        labels: [],
        shocks: [],
        liquidity: [],
        divergences: [],
        lines: [],
        markers: [],
        paths: []
    });

    // UI Component State
    const [showLegend, setShowLegend] = useState(true);
    const [showVolumeProfile, setShowVolumeProfile] = useState(true);
    const [showEntryZones, setShowEntryZones] = useState(true);
    const [showHelp, setShowHelp] = useState(false);
    const [showConfirmationOverlay, setShowConfirmationOverlay] = useState(true);

    // Real-Time DOM State (Phase 69)
    const [liveLiquidityMap, setLiveLiquidityMap] = useState([]);
    const symbolRef = useRef(analysis?.symbol || 'BTCUSDT');

    // --- Sync Logic ---
    const syncOverlays = useCallback(() => {
        if (!chartRef.current || !seriesRef.current || !data || data.length === 0) return;

        const timeScale = chartRef.current.timeScale();
        const width = chartContainerRef.current.clientWidth;
        const height = chartContainerRef.current.clientHeight;

        if (!data || data.length === 0) return;

        const lastCandle = data[data.length - 1];
        const lastCandleTime = lastCandle.time;
        const firstCandleTime = data[0].time;
        const lastCandleX = timeScale.timeToCoordinate(lastCandleTime);

        const visibleRange = timeScale.getVisibleRange();
        let pixelsPerSecond = 0;
        if (visibleRange && visibleRange.to > visibleRange.from) {
            pixelsPerSecond = width / (visibleRange.to - visibleRange.from);
        }

        const getSafePoint = (time, price) => {
            // Safety Check: Ensure inputs are valid and numbers
            if (time === null || time === undefined || isNaN(time) || !isFinite(time)) return { x: null, y: null };
            if (price === null || price === undefined || isNaN(price) || !isFinite(price)) return { x: null, y: null };

            // Lightweight-charts expects integer timestamps for 'time' coordinates
            const integerTime = Math.floor(time);

            let x = timeScale.timeToCoordinate(integerTime);
            let y = seriesRef.current.priceToCoordinate(price);

            // Future Projection
            if (x === null && integerTime > lastCandleTime && lastCandleX !== null && pixelsPerSecond > 0) {
                const secondsAhead = integerTime - lastCandleTime;
                x = lastCandleX + (secondsAhead * pixelsPerSecond);
            }

            return { x, y };
        };

        const newZones = [];
        (overlays.zones || []).forEach(zone => {
            const p1 = getSafePoint(zone.x1, zone.y1);
            const p2 = getSafePoint(zone.x2, zone.y2);

            let x1 = p1.x;
            let x2 = p2.x;
            let y1 = p1.y;
            let y2 = p2.y;

            // Clamping/Fallback for off-screen
            if (x1 === null) x1 = zone.x1 < firstCandleTime ? -100 : width + 100;
            if (x2 === null) x2 = zone.x2 > lastCandleTime ? width + 500 : (zone.x1 < firstCandleTime ? -100 : 10000);

            if (y1 === null || isNaN(y1) || !isFinite(y1)) y1 = -100;
            if (y2 === null || isNaN(y2) || !isFinite(y2)) y2 = height + 100;

            const left = Math.min(x1, x2);
            const zoneWidth = Math.max(1, Math.abs(x2 - x1));
            const top = Math.min(y1, y2);
            const zoneHeight = Math.max(1, Math.abs(y2 - y1));

            if (isFinite(left) && isFinite(zoneWidth) && isFinite(top) && isFinite(zoneHeight)) {
                newZones.push({
                    ...zone,
                    style: {
                        left,
                        width: zoneWidth,
                        top,
                        height: zoneHeight,
                    }
                });
            }
        });

        const newLabels = [];
        (overlays.labels || []).forEach(label => {
            const p = getSafePoint(label.x, label.y);
            if (p.x !== null && p.y !== null && isFinite(p.x) && isFinite(p.y)) {
                newLabels.push({
                    ...label,
                    style: {
                        left: p.x,
                        top: p.y,
                    }
                });
            }
        });

        const newShocks = [];
        (overlays.shocks || []).forEach(shock => {
            const timeCoord = getSafePoint(shock.time, 0).x;
            const corridorX1 = shock.corridor ? getSafePoint(shock.corridor.start, 0).x : null;
            const corridorX2 = shock.corridor ? getSafePoint(shock.corridor.end, 0).x : null;

            if (timeCoord !== null && isFinite(timeCoord)) {
                newShocks.push({
                    ...shock,
                    left: timeCoord,
                    corridorStyle: corridorX1 !== null && corridorX2 !== null && isFinite(corridorX1) && isFinite(corridorX2) ? {
                        left: Math.min(corridorX1, corridorX2),
                        width: Math.abs(corridorX2 - corridorX1)
                    } : null
                });
            }
        });

        const newLiquidity = [];
        (overlays.liquidityMap || []).forEach(item => {
            const y = seriesRef.current.priceToCoordinate(item.price);
            if (y !== null && isFinite(y)) {
                newLiquidity.push({
                    ...item,
                    top: y
                });
            }
        });

        const newLines = [];
        (overlays.lines || []).forEach(line => {
            if (!line.start || !line.end) return;
            const p1 = getSafePoint(line.start.time, line.start.price);
            const p2 = getSafePoint(line.end.time, line.end.price);

            if (p1.x !== null && p2.x !== null && p1.y !== null && p2.y !== null &&
                isFinite(p1.x) && isFinite(p2.x) && isFinite(p1.y) && isFinite(p2.y)) {
                newLines.push({ ...line, x1: p1.x, x2: p2.x, y1: p1.y, y2: p2.y });
            }
        });

        const newMarkers = [];
        (overlays.structureMarkers || []).forEach(marker => {
            const p = getSafePoint(marker.time, marker.price);
            if (p.x !== null && p.y !== null && isFinite(p.x) && isFinite(p.y)) {
                newMarkers.push({ ...marker, x: p.x, y: p.y });
            }
        });

        const newDivergences = [];
        (overlays.divergences || []).forEach(div => {
            const p = getSafePoint(div.time, div.y);
            if (p.x !== null && p.y !== null && isFinite(p.x) && isFinite(p.y)) {
                newDivergences.push({ ...div, left: p.x, top: p.y });
            }
        });

        const newPaths = [];
        (overlays.paths || []).forEach(path => {
            if (!path.points || !Array.isArray(path.points)) return;
            const mappedPoints = path.points.map(p => {
                if (!p) return null;
                const coord = getSafePoint(p.time, p.price);
                if (coord.x !== null && coord.y !== null && isFinite(coord.x) && isFinite(coord.y)) {
                    return { x: coord.x, y: coord.y, label: p.label };
                }
                return null;
            }).filter(p => p !== null);

            if (mappedPoints.length >= 2) {
                newPaths.push({ ...path, mappedPoints });
            }
        });

        setOverlayItems({
            zones: newZones,
            labels: newLabels,
            shocks: newShocks,
            liquidity: newLiquidity,
            divergences: newDivergences,
            lines: newLines,
            markers: newMarkers,
            paths: newPaths
        });

    }, [overlays, data]);

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Ignore if typing in an input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'l':
                    setShowLegend(prev => !prev);
                    break;
                case 'v':
                    setShowVolumeProfile(prev => !prev);
                    break;
                case 'e':
                    setShowEntryZones(prev => !prev);
                    break;
                case '?':
                    setShowHelp(prev => !prev);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);

    // --- Chart Instance ---
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
                // Force sync after resize
                requestAnimationFrame(syncOverlays);
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: '#131722' },
                textColor: '#d1d4dc',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            grid: {
                vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
                horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: 'rgba(197, 203, 206, 0.1)',
            },
            rightPriceScale: {
                borderColor: 'rgba(197, 203, 206, 0.1)',
            },
        });

        const series = chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        chartRef.current = chart;
        seriesRef.current = series;

        // Subscriptions
        chart.timeScale().subscribeVisibleTimeRangeChange(() => {
            requestAnimationFrame(syncOverlays);
        });

        chart.subscribeCrosshairMove((param) => {
            if (onCrosshairMove && param.time && !isInternalMoveRef.current) {
                onCrosshairMove({ time: param.time, price: param.seriesPrices.get(series) });
            }
        });

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
                seriesRef.current = null;
            }
        };
    }, []); // Only runs once on mount

    // --- Data Updates ---
    useEffect(() => {
        if (seriesRef.current && data && data.length > 0) {
            try {
                seriesRef.current.setData(data);

                if (!isInitializedRef.current && chartRef.current) {
                    chartRef.current.timeScale().fitContent();
                    isInitializedRef.current = true;
                }
                // Sync overlays after data update
                requestAnimationFrame(syncOverlays);
            } catch (error) {
                console.error('Error setting chart data:', error);
            }
        }
    }, [data, syncOverlays]);

    // --- Markers ---
    useEffect(() => {
        if (seriesRef.current && markers) {
            try {
                if (typeof seriesRef.current.setMarkers === 'function') {
                    seriesRef.current.setMarkers(markers);
                }
            } catch (e) {
                console.warn('Failed to set markers:', e);
            }
        }
    }, [markers]);

    // --- Lines ---
    useEffect(() => {
        if (seriesRef.current && lines) {
            // Clean up old lines
            priceLinesRef.current.forEach(line => {
                try { seriesRef.current.removePriceLine(line); } catch (e) { }
            });
            priceLinesRef.current = [];

            // Add new lines
            lines.forEach(line => {
                try {
                    const pl = seriesRef.current.createPriceLine(line);
                    priceLinesRef.current.push(pl);
                } catch (e) { }
            });
        }
    }, [lines]);

    // --- External Crosshair Sync ---
    useEffect(() => {
        if (chartRef.current && externalCrosshair && !isInternalMoveRef.current) {
            isInternalMoveRef.current = true;
            chartRef.current.setCrosshairPosition(externalCrosshair.price, externalCrosshair.time, seriesRef.current);
            requestAnimationFrame(() => {
                isInternalMoveRef.current = false;
            });
        }
    }, [externalCrosshair]);

    // --- Trigger Sync when Overlays prop changes ---
    useEffect(() => {
        requestAnimationFrame(syncOverlays);
    }, [overlays, syncOverlays]);

    // --- Real-Time DOM Pressure Subscription (Phase 69) ---
    useEffect(() => {
        const symbol = analysis?.symbol || 'BTCUSDT';
        symbolRef.current = symbol;

        // Subscribe to live order book depth updates
        const updateDepth = async () => {
            const depthData = await marketData.fetchOrderBook(symbol, 20);
            if (depthData) {
                const maps = LiquidityMapService.generateMap(depthData);
                setLiveLiquidityMap(maps);
            }
        };

        // Initial load
        updateDepth();

        // Real-time updates every 2 seconds for scalpers
        const interval = setInterval(updateDepth, 2000);

        return () => {
            clearInterval(interval);
        };
    }, [analysis?.symbol]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            {/* Chart Container */}
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* Overlays Layer */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
                {/* SVG Layer for Lines and Paths */}
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                    <defs>
                        {/* Premium Glow Filters */}
                        <filter id="neon-glow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>

                        <filter id="institutional-flicker">
                            <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" />
                        </filter>

                        {/* Path Gradients */}
                        <linearGradient id="long-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10B981" stopOpacity="1" />
                            <stop offset="100%" stopColor="#10B981" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="short-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#EF4444" stopOpacity="1" />
                            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.2" />
                        </linearGradient>

                        {/* Modernized Arrowhead Markers */}
                        <marker id="arrowhead-long" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                            <path d="M0,0 L12,6 L0,12 L3,6 Z" fill="#10B981" filter="url(#neon-glow)" />
                        </marker>
                        <marker id="arrowhead-short" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                            <path d="M0,0 L12,6 L0,12 L3,6 Z" fill="#EF4444" filter="url(#neon-glow)" />
                        </marker>
                        <marker id="arrowhead-gray" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                        </marker>
                    </defs>
                    {overlayItems.lines.map((line, i) => (
                        <line
                            key={line.id || i}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke={line.color || '#2979FF'}
                            strokeWidth={line.width || 2}
                            strokeDasharray={line.dashed ? '5,5' : 'none'}
                            style={{ transition: 'all 0.1s ease-out' }}
                        />
                    ))}

                    {overlayItems.paths.map((path, i) => {
                        let dashArray = 'none';
                        let strokeWidth = 3;
                        let opacity = 0.9;

                        // Enhanced Style Logic (Phase 40)
                        if (path.style === 'DASHED' || path.isDashed) { // Support legacy isDashed
                            dashArray = '6,4';
                            strokeWidth = 2;
                            opacity = 0.7;
                        } else if (path.style === 'DOTTED') {
                            dashArray = '2,4';
                            strokeWidth = 2;
                            opacity = 0.6;
                        } else if (path.style === 'SOLID' || path.style === 'BOLD') {
                            dashArray = 'none';
                            strokeWidth = 3;
                            opacity = 1.0;
                        }

                        const normDir = normalizeDirection(path.direction);
                        const arrowId = normDir === 'BULLISH' ? 'arrowhead-long' : normDir === 'BEARISH' ? 'arrowhead-short' : 'arrowhead-gray';

                        // Conviction Scaling (High probability = bolder, brighter)
                        const conviction = path.probability || 70;
                        const convictionScale = 0.5 + (conviction / 200); // 0.85 to 1.0 approx
                        const finalStrokeWidth = strokeWidth * convictionScale;
                        const isHighConviction = conviction > 85;

                        return (
                            <g key={path.id || i}>
                                {/* Path Shadow/Outer Glow */}
                                {isHighConviction && (
                                    <polyline
                                        points={path.mappedPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                        fill="none"
                                        stroke={path.color || (normDir === 'BULLISH' ? '#10B981' : '#EF4444')}
                                        strokeWidth={finalStrokeWidth + 4}
                                        opacity={0.15}
                                        filter="blur(4px)"
                                    />
                                )}

                                <polyline
                                    points={path.mappedPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke={path.color || (normDir === 'BULLISH' ? 'url(#long-gradient)' : 'url(#short-gradient)')}
                                    strokeWidth={finalStrokeWidth}
                                    strokeDasharray={dashArray}
                                    opacity={opacity}
                                    markerEnd={`url(#${arrowId})`}
                                    filter={isHighConviction ? 'url(#neon-glow)' : 'none'}
                                    style={{
                                        transition: 'all 0.3s ease-out',
                                        animation: isHighConviction ? 'pulse 2s infinite ease-in-out' : 'none'
                                    }}
                                />
                                {/* Path Labels */}
                                {path.mappedPoints.map((p, idx) => p.label && (
                                    <text
                                        key={idx}
                                        x={p.x}
                                        y={p.y - 12}
                                        fill={path.color || '#DDD'}
                                        fontSize="10"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        style={{ textShadow: '0 2px 4px rgba(0,0,0,1)' }}
                                    >
                                        {p.label}
                                    </text>
                                ))}
                            </g>
                        )
                    })}
                </svg>

                {/* Render Zones */}
                {overlayItems.zones.map((zone, i) => {
                    const isConfluence = zone.isConfluence;
                    const isHTF = zone.isHTF;
                    const role = zone.role || 'NEUTRAL'; // DEFENSE, BREAKTHROUGH, REACTION, INVALIDATION_FLIP

                    // Dynamic Border Logic based on Role
                    let borderStyle = '1px solid';
                    if (role === 'INVALIDATION_FLIP') borderStyle = '1px dashed';
                    else if (role === 'DEFENSE') borderStyle = '2px solid';
                    else if (isHTF) borderStyle = '4px double';

                    // Opacity Override
                    const bg = role === 'BREAKTHROUGH' ? 'transparent' : zone.color;
                    const borderColor = zone.borderColor || zone.color;

                    return (
                        <div
                            key={zone.id || i}
                            style={{
                                position: 'absolute',
                                ...zone.style,
                                background: bg,
                                border: `${borderStyle} ${borderColor}`,
                                boxShadow: isConfluence ? `0 0 15px ${borderColor}, inset 0 0 10px ${borderColor}` : 'none',
                                animation: isConfluence ? 'pulse-confluence 2s infinite ease-in-out' : 'none',
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'center',
                                zIndex: 1,
                                borderRadius: '2px',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {(zone.label || role !== 'NEUTRAL') && (
                                <span style={{
                                    background: borderColor,
                                    color: 'white',
                                    padding: '2px 6px',
                                    fontSize: '9px',
                                    fontWeight: '700',
                                    borderRadius: '0 0 4px 4px',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    gap: '4px',
                                    alignItems: 'center'
                                }}>
                                    <span>{zone.label}</span>
                                    {role !== 'NEUTRAL' && role !== 'REACTION' && (
                                        <span style={{ opacity: 0.8, fontSize: '8px', textTransform: 'uppercase' }}>
                                            | {role.replace('_', ' ')}
                                        </span>
                                    )}
                                </span>
                            )}
                        </div>
                    )
                })}

                {/* Render Labels/Callouts */}
                {overlayItems.labels.map((label, i) => (
                    <div
                        key={label.id || i}
                        className={label.className || ''}
                        style={{
                            position: 'absolute',
                            left: label.style.left,
                            top: label.style.top,
                            transform: label.direction === 'down' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: label.direction === 'down' ? '0 0 8px 0' : '8px 0 0 0',
                            zIndex: 2,
                            width: 'max-content',
                            transition: 'left 0.1s ease-out, top 0.1s ease-out'
                        }}
                    >
                        {/* Text Box */}
                        <div style={{
                            background: label.color, // solid color
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                            textAlign: 'center',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{label.text}</div>
                            {label.subtext && <div style={{ fontSize: '10px', opacity: 0.9 }}>{label.subtext}</div>}
                        </div>

                        {/* Arrow */}
                        <div style={{
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            [label.direction === 'down' ? 'borderTop' : 'borderBottom']: `8px solid ${label.color}`,
                            marginTop: label.direction === 'down' ? '-1px' : '0',
                            marginBottom: label.direction === 'up' ? '-1px' : '0',
                            order: label.direction === 'up' ? -1 : 1
                        }} />
                    </div>
                ))}

                {/* Render News Shocks (Phase 22) */}
                {overlayItems.shocks.map((shock, i) => (
                    <React.Fragment key={shock.id || i}>
                        {/* Volatility Corridor */}
                        {shock.corridorStyle && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                ...shock.corridorStyle,
                                background: shock.corridor.color,
                                zIndex: 0
                            }} />
                        )}
                        {/* Vertical Shock Line */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            left: shock.left,
                            width: '2px',
                            background: `linear-gradient(to bottom, ${shock.color}, transparent)`,
                            borderLeft: `1px dashed ${shock.color}`,
                            zIndex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <div style={{
                                background: shock.color,
                                color: 'white',
                                padding: '4px 10px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                borderRadius: '4px',
                                transform: 'translateY(10px)',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span>⚠️ {shock.label}</span>
                                {shock.isImminent && <span className="animate-pulse" style={{ color: '#fff' }}>[IMMINENT]</span>}
                            </div>
                        </div>
                    </React.Fragment>
                ))}

                {/* Institutional Liquidity Heatmap (Phase 59) */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '60px',
                    bottom: 0,
                    background: 'rgba(0,0,0,0.2)',
                    borderLeft: '1px solid rgba(255,255,255,0.05)',
                    zIndex: 0,
                    pointerEvents: 'none'
                }}>
                    {overlayItems.liquidity.map((strip) => (
                        <div key={strip.id} style={{
                            position: 'absolute',
                            top: strip.top,
                            right: 0,
                            width: `${strip.intensity * 100}%`,
                            height: '2px',
                            background: strip.side === 'BID' ? '#10b981' : '#ef4444',
                            opacity: 0.1 + (strip.intensity * 0.7),
                            boxShadow: strip.intensity > 0.8 ? `0 0 8px ${strip.side === 'BID' ? '#10b981' : '#ef4444'}` : 'none',
                            transition: 'all 0.3s'
                        }} />
                    ))}
                </div>

                {/* DOM Imbalance HUD (Phase 59 + Phase 69 Real-Time) */}
                {(liveLiquidityMap.length > 0 || overlays.liquidityMap?.length > 0) && (
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        right: '80px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(8px)',
                        padding: '12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        zIndex: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        minWidth: '150px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                    }}>
                        <div className="flex-row justify-between items-center">
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>DOM PRESSURE</span>
                            <div className="flex-row items-center gap-xs">
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', animation: 'animate-pulse 1s infinite' }} />
                                <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 'bold' }}>LIVE</span>
                            </div>
                        </div>

                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                            {(() => {
                                // Use live data if available, fallback to static overlay data
                                const mapToUse = liveLiquidityMap.length > 0 ? liveLiquidityMap : (overlays.liquidityMap || []);
                                const total = mapToUse.reduce((s, i) => s + (i.volume || 0), 0);
                                const bids = mapToUse.filter(i => i.side === 'BID').reduce((s, i) => s + (i.volume || 0), 0);
                                const bidPct = total > 0 ? (bids / total) * 100 : 50;
                                return (
                                    <>
                                        <div style={{ width: `${bidPct}%`, height: '100%', background: '#10b981', transition: 'width 0.5s ease' }} />
                                        <div style={{ flex: 1, height: '100%', background: '#ef4444', transition: 'width 0.5s ease' }} />
                                    </>
                                );
                            })()}
                        </div>

                        <div className="flex-row justify-between" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                            {(() => {
                                const mapToUse = liveLiquidityMap.length > 0 ? liveLiquidityMap : (overlays.liquidityMap || []);
                                const total = mapToUse.reduce((s, i) => s + (i.volume || 0), 0);
                                const bids = mapToUse.filter(i => i.side === 'BID').reduce((s, i) => s + (i.volume || 0), 0);
                                const asks = mapToUse.filter(i => i.side === 'ASK').reduce((s, i) => s + (i.volume || 0), 0);
                                return (
                                    <>
                                        <span style={{ color: '#10b981' }}>{total > 0 ? ((bids / total) * 100).toFixed(1) : '50.0'}%</span>
                                        <span style={{ color: '#ef4444' }}>{total > 0 ? ((asks / total) * 100).toFixed(1) : '50.0'}%</span>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Divergence Badges (Phase 25) */}
                {overlayItems.divergences.map((div) => (
                    <div key={div.id} style={{
                        position: 'absolute',
                        top: div.top - 20,
                        left: div.left,
                        zIndex: 2,
                        pointerEvents: 'none'
                    }}>
                        <div className="animate-pulse" style={{
                            background: div.color,
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap',
                            boxShadow: `0 0 10px ${div.color}`
                        }}>
                            {div.label}
                        </div>
                    </div>
                ))}

                {/* Structure Markers */}
                {overlayItems.markers.map((marker, i) => (
                    <div
                        key={marker.id || i}
                        style={{
                            position: 'absolute',
                            left: marker.x,
                            top: marker.y,
                            transform: marker.isBullish ? 'translate(-50%, 4px)' : 'translate(-50%, calc(-100% - 4px))',
                            zIndex: 15,
                            pointerEvents: 'none'
                        }}
                    >
                        <div style={{
                            background: marker.color || 'rgba(30, 41, 59, 0.95)',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '800',
                            border: `1px solid ${marker.color || 'white'}`,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            whiteSpace: 'nowrap'
                        }}>
                            {marker.label}
                        </div>
                    </div>
                ))}
            </div>

            {/* Institutional Styles Overlay */}
            <style>{`
                @keyframes pulse-confluence {
                    0% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.4); }
                    50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.8), inset 0 0 15px rgba(255, 215, 0, 0.4); }
                    100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.4); }
                }
                @keyframes pulse-gold {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.05); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
                .retest-pulsing {
                    animation: pulse-gold 2s infinite ease-in-out;
                }
                .scenario-dashed {
                    opacity: 0.6;
                    border-style: dashed !important;
                }
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}</style>

            {/* Entry Confirmation Overlay */}
            {showConfirmationOverlay && setups && setups.length > 0 && (
                <EntryConfirmationOverlay
                    setup={setups[0]}
                    analysis={analysis}
                    position="top-right"
                />
            )}

            {/* Chart Legend */}
            {showLegend && <ChartLegend position="bottom-left" symbol={analysis?.symbol} />}

            {/* Help Overlay */}
            {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
        </div>
    );
};

export default Chart;

