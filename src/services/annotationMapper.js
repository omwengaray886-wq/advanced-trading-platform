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
        const lastCandleTime = context.lastCandleTime || Date.now() / 1000;
        const timeframe = context.timeframe || '1H';

        // Timeframe to seconds mapping
        const TF_INTERVALS = {
            '1m': 60, '5m': 300, '15m': 900, '30m': 1800, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800
        };
        const interval = TF_INTERVALS[timeframe.toLowerCase()] || 3600;
        const futureTime = lastCandleTime + (interval * 20); // 20 bars projection default

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
            }
            return config;
        };

        annotations.forEach(anno => {
            const visuals = getVisuals(anno);
            const coords = anno.coordinates || {};

            // 1. Box Zones
            if ([
                'ENTRY_ZONE', 'SUPPLY_DEMAND_ZONE', 'CONSOLIDATION_ZONE',
                'ORDER_BLOCK', 'FAIR_VALUE_GAP', 'LIQUIDITY_ZONE',
                'STRUCTURE_ZONE', 'CONFLUENCE_ZONE', 'PREMIUM_DISCOUNT_ZONE', 'CHOCH_ZONE', 'FVG', 'TRAP_ZONE'
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
                    x1: startTime,
                    x2: coords.endTime || futureTime,
                    y1: y1,
                    y2: y2,
                    color: visuals.background,
                    borderColor: visuals.borderColor,
                    label: `${visuals.icon} ${anno.type.replace('_ZONE', '').replace('_', ' ')}`,
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
                        start: { time: coords.time, price: coords.price },
                        end: { time: futureTime, price: coords.price },
                        color: visuals.borderColor,
                        width: 1,
                        dashed: true,
                        label: anno.markerType
                    });
                }

                overlays.structureMarkers.push({
                    id: anno.id,
                    time: coords.time,
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
                    x: lastCandleTime + (interval * 10), // 10 bars ahead
                    y: coords.price,
                    text: isSL ? '🛑 STOP LOSS' : `🎯 TP ${anno.getTargetNumber ? anno.getTargetNumber() : ''}`,
                    color: color,
                    direction: 'right'
                });

                // Add horizontal line projection
                overlays.lines.push({
                    id: `${anno.id}-line`,
                    start: { time: lastCandleTime, price: coords.price },
                    end: { time: futureTime, price: coords.price },
                    color: color,
                    width: 1,
                    dashed: true
                });
            }


            // 5. Divergences
            else if (anno.type === 'DIVERGENCE') {
                overlays.divergences.push({
                    id: anno.id,
                    time: coords.time,
                    y: coords.price,
                    label: anno.metadata.label,
                    color: anno.metadata.direction === 'BULLISH' ? '#10b981' : '#ef4444'
                });
            }

            // 6. News Shocks
            else if (anno.type === 'NEWS_SHOCK') {
                overlays.shocks.push({
                    id: anno.id,
                    time: coords.time,
                    impact: anno.impact,
                    label: `${anno.impact} IMPACT: ${anno.title}`,
                    color: anno.impact === 'HIGH' ? '#ef4444' : '#f59e0b',
                    isImminent: anno.isImminent ? anno.isImminent() : false,
                    corridor: anno.metadata.corridor
                });
            }

            // 7. Scenario Paths
            else if (anno.type === 'SCENARIO_PATH') {
                const mappedPoints = anno.points.map((p, idx) => {
                    const barOffset = p.barsOffset !== undefined ? p.barsOffset : (p.timeOffset ? (p.timeOffset * 300 / interval) : idx * 5);
                    return {
                        time: lastCandleTime + (barOffset * interval),
                        price: p.price,
                        label: p.label
                    };
                });

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
        });

        return overlays;
    }
}
