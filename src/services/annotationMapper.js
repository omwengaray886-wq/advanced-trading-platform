/**
 * Annotation Mapper Service
 * Unifies visual mapping for all institutional analysis types across the platform.
 */

export class AnnotationMapper {
    /**
     * Map raw annotations to visual overlay items for the Chart component.
     * @param {Array} annotations - Array of ChartAnnotation objects
     * @param {Object} context - { lastCandleTime, futureOffset }
     * @returns {Object} - { zones, labels, shocks, liquidityMap, divergences, lines, structureMarkers, paths }
     */
    static mapToOverlays(annotations, context = {}) {
        const lastCandleTime = Math.floor(context.lastCandleTime || Date.now() / 1000);
        const timeframe = context.timeframe || '1h';

        // Timeframe to seconds mapping
        const TF_INTERVALS = {
            '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800
        };
        const interval = TF_INTERVALS[timeframe.toLowerCase()] || 3600;
        const futureTime = Math.floor(lastCandleTime + (interval * 20)); // 20 bars projection default

        const overlays = {
            zones: [],
            labels: [],
            shocks: [],
            liquidityMap: [],
            divergences: [],
            lines: [],
            structureMarkers: [],
            paths: []
        };

        if (!annotations || !Array.isArray(annotations)) return overlays;

        const TF_COLORS = {
            '4h': '#1e3a8a', // Dark Blue
            '1h': '#3b82f6', // Light Blue
            '15m': '#10b981', // Green
            '5m': '#facc15', // Yellow
            'default': '#3b82f6'
        };

        const getVisuals = (anno) => {
            const tfKey = anno.timeframe?.toLowerCase();
            const baseColor = TF_COLORS[tfKey] || TF_COLORS.default;

            const config = {
                background: `rgba(${parseInt(baseColor.slice(1, 3), 16) || 59}, ${parseInt(baseColor.slice(3, 5), 16) || 130}, ${parseInt(baseColor.slice(5, 7), 16) || 246}, 0.2)`,
                borderColor: baseColor,
                icon: '📊',
                isHTF: ['4H', '1D', '1W'].includes(anno.timeframe)
            };

            switch (anno.type) {
                case 'SUPPLY_DEMAND_ZONE':
                    const isDemand = anno.zoneType === 'DEMAND';
                    config.background = isDemand ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
                    config.borderColor = isDemand ? '#10b981' : '#ef4444';
                    config.icon = isDemand ? '📥' : '📤';
                    break;
                case 'ENTRY_ZONE':
                    config.background = 'rgba(234, 179, 8, 0.15)'; // Softer Gold
                    config.borderColor = '#fbbf24'; // Warning Gold
                    // Add distinct gradient-like feel via border/shadow in UI, here we set base props
                    config.icon = '⚡ ENTRY';
                    break;
                case 'ORDER_BLOCK':
                    const isBullishOB = anno.direction === 'BULLISH';
                    config.background = isBullishOB ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                    config.icon = '🧱';
                    break;
                case 'FAIR_VALUE_GAP':
                    config.background = `rgba(${parseInt(baseColor.slice(1, 3), 16)}, ${parseInt(baseColor.slice(3, 5), 16)}, ${parseInt(baseColor.slice(5, 7), 16)}, 0.15)`;
                    config.icon = '🔲';
                    break;
                case 'LIQUIDITY_ZONE':
                    config.icon = '🧲';
                    config.background = 'rgba(167, 139, 250, 0.1)';
                    config.borderColor = '#a78bfa';
                    break;
                case 'CONFLUENCE_ZONE':
                    config.icon = '🎯';
                    config.borderColor = '#f472b6'; // Pink
                    break;
                case 'TRAP_ZONE':
                    const isBullTrap = anno.trapType === 'BULL_TRAP' || anno.trapType === 'LONG_TRAP';
                    config.background = isBullTrap ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)';
                    config.borderColor = isBullTrap ? '#ef4444' : '#f59e0b';
                    config.icon = '🪤';
                    break;
                case 'DARK_POOL':
                    config.background = 'rgba(139, 92, 246, 0.25)'; // Deep Purple
                    config.borderColor = '#8b5cf6';
                    config.icon = '👓'; // Stealth icon
                    break;
                case 'VOLATILITY_CORRIDOR':
                    config.background = 'rgba(94, 234, 212, 0.15)'; // Teal
                    config.borderColor = '#5eead4';
                    config.icon = '📊';
                    break;
                case 'ORDER_BOOK_WALL':
                    config.background = 'rgba(249, 115, 22, 0.25)'; // Orange
                    config.borderColor = '#f97316';
                    config.icon = '🧱';
                    break;
                case 'INSTITUTIONAL_LEVEL':
                    const isSupp = anno.levelType === 'SUPPORT' || anno.levelType === 'DEMAND';
                    config.borderColor = isSupp ? '#10b981' : '#ef4444';
                    config.icon = '🏛️';
                    break;
                case 'INVALIDATION_ZONE':
                    config.background = 'rgba(239, 68, 68, 0.3)';
                    config.borderColor = '#ef4444';
                    config.icon = '🚫';
                    break;
            }

            return config;
        };

        annotations.forEach(anno => {
            const visuals = getVisuals(anno);
            const coords = anno.coordinates || {};

            // 1. Box Zones
            if ([
                'ENTRY_ZONE', 'SUPPLY_DEMAND_ZONE', 'CONSOLIDATION_ZONE',
                'ORDER_BLOCK', 'FAIR_VALUE_GAP', 'LIQUIDITY_ZONE', 'LIQUIDITY_SWEEP_ZONE',
                'STRUCTURE_ZONE', 'CONFLUENCE_ZONE', 'PREMIUM_DISCOUNT_ZONE', 'CHOCH_ZONE', 'FVG', 'TRAP_ZONE',
                'DARK_POOL', 'VOLATILITY_CORRIDOR', 'ORDER_BOOK_WALL', 'NEWS_IMPACT_ZONE', 'INVALIDATION_ZONE'
            ].includes(anno.type)) {


                const startTime = coords.startTime || coords.time || (lastCandleTime - (interval * 10));

                // Handle different coordinate structures
                let y1 = coords.bottom;
                let y2 = coords.top;

                if (anno.type === 'LIQUIDITY_ZONE' && coords.price) {
                    const halfWidth = (coords.width || 0.001) / 2;
                    y1 = coords.price - halfWidth;
                    y2 = coords.price + halfWidth;
                } else if (anno.type === 'STRUCTURE_ZONE' && coords.center) {
                    y1 = coords.bottom;
                    y2 = coords.top;
                }

                overlays.zones.push({
                    id: anno.id,
                    x1: Math.floor(startTime),
                    x2: Math.floor(coords.endTime || futureTime),
                    y1: y1,
                    y2: y2,
                    color: visuals.background,
                    borderColor: visuals.borderColor,
                    label: anno.type === 'ENTRY_ZONE' ? visuals.icon : `${visuals.icon} ${anno.type.replace('_ZONE', '').replace('_', ' ')}`,
                    isHTF: visuals.isHTF,
                    isConfluence: anno.type === 'CONFLUENCE_ZONE',
                    state: anno.state,
                    role: anno.type === 'TRAP_ZONE' ? 'INVALIDATION_FLIP' : (anno.role || anno.intent || 'NEUTRAL') // Trap zones use dashed border
                });

                // DEBUG: Log entry zones
                if (anno.type === 'ENTRY_ZONE') {
                    console.log('[AnnotationMapper] ENTRY_ZONE:', { id: anno.id, y1, y2, x1: startTime, x2: coords.endTime || futureTime });
                }
            }

            // 2. Trendlines (Diagonal)
            else if (anno.type === 'TRENDLINE') {
                overlays.lines.push({
                    id: anno.id,
                    start: anno.coordinates.start,
                    end: anno.coordinates.end,
                    color: visuals.borderColor,
                    width: 2,
                    dashed: anno.metadata.strength === 'weak'
                });
            }

            // 3. Structure Markers (HH, LL, BOS, CHOCH)
            else if (anno.type === 'STRUCTURE_MARKER') {
                const isBullish = ['HH', 'HL', 'BOS'].includes(anno.markerType);

                if (['BOS', 'CHOCH'].includes(anno.markerType)) {
                    overlays.lines.push({
                        id: anno.id,
                        start: { time: Math.floor(coords.time), price: coords.price },
                        end: { time: Math.floor(futureTime), price: coords.price },
                        color: visuals.borderColor,
                        width: 1,
                        dashed: true,
                        label: anno.markerType
                    });
                }

                overlays.structureMarkers.push({
                    id: anno.id,
                    time: Math.floor(coords.time),
                    price: coords.price,
                    type: anno.markerType,
                    label: anno.markerType, // UI expects label
                    isBullish: isBullish,   // UI expects isBullish
                    color: visuals.borderColor
                });
            }

            // 4. Target Projections (Stop Loss, Take Profit)
            else if (anno.type === 'TARGET_PROJECTION') {
                const isSL = anno.projectionType === 'STOP_LOSS';
                const color = isSL ? '#ef4444' : '#10b981';

                overlays.labels.push({
                    id: anno.id,
                    x: Math.floor(lastCandleTime + (interval * 10)), // 10 bars ahead
                    y: coords.price,
                    text: isSL ? '🛑 STOP LOSS' : `🎯 TP ${anno.getTargetNumber ? anno.getTargetNumber() : ''}`,
                    color: color,
                    direction: 'right'
                });

                // Add horizontal line projection
                overlays.lines.push({
                    id: `${anno.id}-line`,
                    start: { time: Math.floor(lastCandleTime), price: coords.price },
                    end: { time: Math.floor(futureTime), price: coords.price },
                    color: color,
                    width: 1,
                    dashed: true
                });
            }

            // 5. Magnet Lines (Phase 52)
            else if (anno.type === 'MAGNET_LINE') {
                // Visual Line
                overlays.lines.push({
                    id: anno.id || `magnet-${anno.price}`,
                    start: { time: Math.floor(lastCandleTime - (interval * 50)), price: anno.price },
                    end: { time: Math.floor(futureTime), price: anno.price },
                    color: anno.color,
                    width: anno.urgency > 70 ? 2 : 1,
                    dashed: true,
                    opacity: 0.7
                });

                // Label at the end
                overlays.labels.push({
                    id: `lbl-${anno.id || anno.price}`,
                    x: Math.floor(futureTime - (interval * 2)),
                    y: anno.price,
                    text: anno.label,
                    color: anno.color,
                    direction: 'right',
                    style: { left: Math.floor(futureTime), top: anno.price } // Fallback for some renderers
                });
            }

            // 5.5 Institutional Levels
            else if (anno.type === 'INSTITUTIONAL_LEVEL') {
                overlays.lines.push({
                    id: anno.id || `inst-${anno.coordinates.price}`,
                    start: { time: Math.floor(lastCandleTime - (interval * 100)), price: anno.coordinates.price },
                    end: { time: Math.floor(futureTime), price: anno.coordinates.price },
                    color: visuals.borderColor,
                    width: anno.isMajor ? 2 : 1,
                    dashed: !anno.isMajor,
                    label: anno.metadata?.label || (anno.getLabel ? anno.getLabel() : 'INST LEVEL')
                });
            }



            // 5. Divergences
            else if (anno.type === 'DIVERGENCE') {
                overlays.divergences.push({
                    id: anno.id,
                    time: Math.floor(coords.time),
                    y: coords.price,
                    label: anno.metadata.label,
                    color: anno.metadata.direction === 'BULLISH' ? '#10b981' : '#ef4444'
                });
            }

            // 6. News Shocks
            else if (anno.type === 'NEWS_SHOCK') {
                overlays.shocks.push({
                    id: anno.id,
                    time: Math.floor(coords.time || anno.timestamp),
                    impact: anno.impact,
                    label: `${anno.impact} IMPACT: ${anno.eventTitle || anno.title}`,
                    color: anno.impact === 'HIGH' ? '#ef4444' : '#f59e0b',
                    isImminent: (typeof anno.isImminent === 'function') ? anno.isImminent() : false,
                    corridor: anno.volatilityCorridor || anno.metadata?.corridor
                });
            }

            // 7. Scenario Paths
            else if (anno.type === 'SCENARIO_PATH') {
                if (!anno.points || !Array.isArray(anno.points)) return;

                const mappedPoints = anno.points.map((p, idx) => {
                    const barOffset = p.barsOffset !== undefined ? p.barsOffset : (p.timeOffset ? (p.timeOffset * 300 / interval) : idx * 5);
                    const calculatedTime = Math.floor(lastCandleTime + (barOffset * interval));

                    // Safety: Skip points with invalid time or price
                    if (isNaN(calculatedTime) || isNaN(p.price)) return null;

                    return {
                        time: calculatedTime,
                        price: p.price,
                        label: p.label
                    };
                }).filter(p => p !== null);

                if (mappedPoints.length < 2) return; // Skip invalid paths

                overlays.paths.push({
                    id: anno.id,
                    points: mappedPoints,
                    color: anno.direction === 'LONG' ? '#10b981' : anno.direction === 'SHORT' ? '#ef4444' : '#94a3b8',
                    style: anno.style || 'SOLID', // Pass SOLID/DASHED/DOTTED
                    direction: anno.direction,
                    isWaiting: anno.isWaiting,
                    probability: anno.probability || anno.metadata?.probability || 70 // Pass conviction for visual scaling
                });

                // DEBUG: Log scenario paths
                console.log('[AnnotationMapper] SCENARIO_PATH:', {
                    id: anno.id,
                    style: anno.style,
                    pointCount: mappedPoints.length,
                    firstPoint: mappedPoints[0],
                    lastPoint: mappedPoints[mappedPoints.length - 1]
                });
            }

            // 8. Volume Profile (Phase 48)
            else if (anno.type === 'VOLUME_PROFILE') {
                // 1. Map Buckets to Liquidity Map (Histogram)
                if (anno.buckets) {
                    anno.buckets.forEach((bucket, idx) => {
                        // Total Volume Strip
                        /* 
                        // Split view (Optional - for now using total volume as NEUTRAL/GRAY or split?)
                        // Using 'ASK' for total for now to show as Red/Orange or we can add a 'VOL' type to Chart.jsx later.
                        // For now, let's try to simulate Bid/Ask split if available, otherwise just total.
                        */

                        // Scale intensity relative to the Point of Control (POC) which has relVol = 1.0 (100% width)
                        // effectiveIntensity = (partVolume / totalBucketVolume) * bucket.relVol

                        const totalVol = bucket.volume;
                        if (totalVol > 0 && bucket.relVol) {
                            // Up Volume (Green/Bid)
                            if (bucket.upVolume > 0) {
                                overlays.liquidityMap.push({
                                    id: `vp-${anno.id}-${idx}-up`,
                                    price: bucket.center,
                                    volume: bucket.upVolume,
                                    intensity: (bucket.upVolume / totalVol) * bucket.relVol,
                                    side: 'BID'
                                });
                            }
                            // Down Volume (Red/Ask)
                            if (bucket.downVolume > 0) {
                                overlays.liquidityMap.push({
                                    id: `vp-${anno.id}-${idx}-down`,
                                    price: bucket.center,
                                    volume: bucket.downVolume,
                                    intensity: (bucket.downVolume / totalVol) * bucket.relVol,
                                    side: 'ASK'
                                });
                            }
                        }
                    });
                }

                // 2. Map Key Levels (POC, VAH, VAL)
                if (anno.poc) {
                    overlays.lines.push({
                        id: `vp-poc-${anno.id}`,
                        start: { time: lastCandleTime, price: anno.poc },
                        end: { time: futureTime, price: anno.poc },
                        color: '#ef4444', // Red for POC
                        width: 2,
                        dashed: false,
                        label: 'POC'
                    });

                    overlays.labels.push({
                        id: `vp-lbl-poc-${anno.id}`,
                        x: futureTime,
                        y: anno.poc,
                        text: 'POC',
                        color: '#ef4444',
                        direction: 'left'
                    });
                }

                if (anno.vah) {
                    overlays.lines.push({
                        id: `vp-vah-${anno.id}`,
                        start: { time: lastCandleTime, price: anno.vah },
                        end: { time: futureTime, price: anno.vah },
                        color: '#3b82f6', // Blue
                        width: 1,
                        dashed: true
                    });
                }

                if (anno.val) {
                    overlays.lines.push({
                        id: `vp-val-${anno.id}`,
                        start: { time: lastCandleTime, price: anno.val },
                        end: { time: futureTime, price: anno.val },
                        color: '#3b82f6', // Blue
                        width: 1,
                        dashed: true
                    });
                }
            }

            // 10. Target Projections (SL/TP)
            else if (anno.type === 'TARGET_PROJECTION') {
                const label = anno.metadata?.label || (anno.getLabel ? anno.getLabel() : 'Target');
                const color = anno.metadata?.color || anno.color || '#3b82f6';

                overlays.lines.push({
                    id: anno.id,
                    start: { time: lastCandleTime, price: anno.coordinates.price },
                    end: { time: futureTime, price: anno.coordinates.price },
                    color: color,
                    width: 2,
                    dashed: anno.projectionType === 'STOP_LOSS',
                    label: label
                });

                overlays.labels.push({
                    id: `lbl-${anno.id}`,
                    x: futureTime,
                    y: anno.coordinates.price,
                    text: label,
                    color: color,
                    direction: 'left',
                    style: { left: futureTime, top: anno.coordinates.price }
                });
            }
        });

        // 9. Phase 2 Features: Icebergs & Tape (from marketState)
        if (context.marketState) {
            // A. Icebergs (Hidden Liquidity)
            if (context.marketState.icebergs && Array.isArray(context.marketState.icebergs)) {
                context.marketState.icebergs.forEach((iceberg, idx) => {
                    // Visual Line
                    overlays.lines.push({
                        id: `iceberg-${idx}`,
                        start: { time: Math.floor(lastCandleTime - (interval * 50)), price: iceberg.price },
                        end: { time: Math.floor(futureTime), price: iceberg.price },
                        color: '#3b82f6', // Institutional Blue
                        width: 2,
                        dashed: true,
                        opacity: 0.8
                    });

                    // Label at the end
                    overlays.labels.push({
                        id: `lbl-iceberg-${idx}`,
                        x: Math.floor(futureTime - (interval * 2)),
                        y: iceberg.price,
                        text: `🧊 ICEBERG (${iceberg.volume})`,
                        color: '#3b82f6',
                        direction: 'left',
                        style: { left: Math.floor(futureTime), top: iceberg.price }
                    });
                });
            }

            // B. Tape Aggressiveness (HUD Label)
            if (context.marketState.tape && context.marketState.tape.isIgnition) {
                overlays.labels.push({
                    id: 'tape-ignition',
                    x: lastCandleTime,
                    y: context.marketState.candles ? context.marketState.candles[context.marketState.candles.length - 1].high : 0,
                    text: '🚀 MOMENTUM IGNITION',
                    subtext: `Accel: ${context.marketState.tape.acceleration.toFixed(1)}x`,
                    color: '#f59e0b', // Amber/Orange
                    direction: 'up'
                });
            }

            // C. Event Risk (Macro Shocks)
            if (context.marketState.eventRisk && context.marketState.eventRisk.closestEvent) {
                const event = context.marketState.eventRisk.closestEvent;
                overlays.shocks.push({
                    id: `event-${event.timestamp}`,
                    time: Math.floor(event.timestamp / 1000),
                    impact: event.impact,
                    label: `📅 ${event.title} (${context.marketState.eventRisk.level})`,
                    color: event.impact === 'CRITICAL' || context.marketState.eventRisk.score > 75 ? '#ef4444' : '#f59e0b',
                    isImminent: (event.timestamp - Date.now()) < 3600000, // < 1 hour
                    corridor: null
                });
            }
        }

        return overlays;
    }
}
