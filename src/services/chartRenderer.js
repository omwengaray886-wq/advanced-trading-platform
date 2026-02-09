/**
 * Chart Renderer Service
 * Draws annotations on TradingView Lightweight Charts
 */

const TF_COLORS = {
    '4h': '#1e3a8a', // Dark Blue
    '1h': '#3b82f6', // Light Blue
    '15m': '#10b981', // Green
    '5m': '#facc15', // Yellow
    'default_bull': '#10b981',
    'default_bear': '#ef4444'
};

/**
 * Universal Visual System Palette (Phase 21)
 */
const ZONE_PALETTE = {
    'DEMAND_ZONE': { color: '#1DB954', icon: '⬆' },
    'SUPPLY_ZONE': { color: '#E63946', icon: '⬇' },
    'ORDER_BLOCK_BULLISH': { color: '#0B8457', icon: '🧱⬆' },
    'ORDER_BLOCK_BEARISH': { color: '#8B0000', icon: '🧱⬇' },
    'FAIR_VALUE_GAP_BULLISH': { color: '#00C2FF', icon: '⚡⬆' },
    'FAIR_VALUE_GAP_BEARISH': { color: '#FF9F1C', icon: '⚡⬇' },
    'LIQUIDITY_ZONE': { color: '#8E44AD', icon: '👁️' },
    'BOS_ZONE': { color: '#2979FF', icon: '🔓' },
    'CHOCH_ZONE': { color: '#F4D03F', icon: '🔄' },
    'PREMIUM_ZONE': { color: '#FFCDD2', icon: '🔴' },
    'DISCOUNT_ZONE': { color: '#C8E6C9', icon: '🟢' },
    'CONFLUENCE_ZONE': { color: '#FFD700', icon: '⭐' },
    'NEWS_SHOCK': { color: '#EF4444', icon: '⚠️' },
    'DEFAULT': { color: '#CBD5E1', icon: '?' }
};

const OPACITY_MAP = {
    'fresh': 0.8,
    'tested': 0.55,
    'weak': 0.35,
    'invalid': 0.1
};

/**
 * Get visual mapping for a zone (Phase 21)
 */
function getZoneVisuals(zone) {
    const type = zone.type.toUpperCase();
    let paletteKey = type;

    // Handle direction-specific keys
    if (type === 'ORDER_BLOCK') {
        paletteKey = zone.metadata?.direction === 'BULLISH' ? 'ORDER_BLOCK_BULLISH' : 'ORDER_BLOCK_BEARISH';
    } else if (type === 'FAIR_VALUE_GAP') {
        paletteKey = zone.metadata?.direction === 'BULLISH' ? 'FAIR_VALUE_GAP_BULLISH' : 'FAIR_VALUE_GAP_BEARISH';
    } else if (type === 'PREMIUM_DISCOUNT_ZONE') {
        paletteKey = zone.metadata?.isDiscount ? 'DISCOUNT_ZONE' : 'PREMIUM_ZONE';
    } else if (type === 'STRUCTURE_ZONE' || type === 'BOS_ZONE') {
        paletteKey = 'BOS_ZONE';
    } else if (type === 'CHOCH_ZONE') {
        paletteKey = 'CHOCH_ZONE';
    }

    const visual = ZONE_PALETTE[paletteKey] || ZONE_PALETTE.DEFAULT;
    const state = zone.state || 'fresh';
    const opacity = OPACITY_MAP[state] || 0.4;

    // Convert HEX to RGBA
    const hex = visual.color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;

    // Check if HTF (H4 or 1D)
    const isHTF = ['4H', '1D', '1W'].includes(zone.timeframe?.toUpperCase());

    return {
        color: rgba,
        hex: hex,
        icon: visual.icon,
        lineStyle: zone.state === 'pending' ? 1 : 0, // 1 = Dashed
        lineWidth: zone.confidence >= 0.8 ? 2 : 1,
        isHTF
    };
}

/**
 * Draw trendline on chart
 * @param {Object} chart - TradingView chart instance
 * @param {Trendline} trendline - Trendline annotation
 */
export function drawTrendline(chart, trendline) {
    if (!trendline.visible) return null;

    const tfColor = TF_COLORS[trendline.timeframe?.toLowerCase()] || (trendline.getDirection() === 'BULLISH' ? TF_COLORS.default_bull : TF_COLORS.default_bear);

    const series = chart.addLineSeries({
        color: tfColor,
        lineWidth: 2,
        lineStyle: 0, // Solid
        priceLineVisible: false,
    });

    series.setData([
        { time: trendline.coordinates.start.time, value: trendline.coordinates.start.price },
        { time: trendline.coordinates.end.time, value: trendline.coordinates.end.price }
    ]);

    return { id: trendline.id, series, type: 'line' };
}

/**
 * Draw structure marker on chart
 * @param {Object} chart - TradingView chart instance
 * @param {StructureMarker} marker - Structure marker annotation  
 */
export function drawStructureMarker(chart, marker) {
    if (!marker.visible) return null;

    const tfColor = TF_COLORS[marker.timeframe?.toLowerCase()] || marker.getColor();

    // Phase 53: Enhanced CHoCH Visualization
    if (marker.markerType === 'CHOCH') {
        // Draw dashed price line for CHoCH
        const chochColor = marker.metadata?.direction === 'BULLISH' ? '#10b981' : '#ef4444';

        return {
            id: marker.id,
            type: 'price_line',
            priceLine: {
                price: marker.coordinates.price,
                color: chochColor,
                lineWidth: 2,
                lineStyle: 2, // Dashed
                axisLabelVisible: true,
                title: `🔄 CHoCH ${marker.metadata?.direction || ''}`,
            }
        };
    }

    const markerData = {
        time: marker.coordinates.time,
        position: marker.isBullish() ? 'belowBar' : 'aboveBar',
        color: tfColor,
        shape: 'circle',
        text: marker.markerType,
        size: marker.significance === 'high' ? 2 : 1
    };

    return { id: marker.id, data: markerData, type: 'marker' };
}

/**
 * Draw entry zone
 * @param {Object} chart - TradingView chart instance
 * @param {EntryZone} entryZone - Entry zone annotation
 */
export function drawEntryZone(chart, entryZone) {
    if (!entryZone.visible || entryZone.status === 'INVALIDATED') return null;

    const color = entryZone.direction === 'LONG' ?
        'rgba(34, 197, 94, 0.25)' :
        'rgba(239, 68, 68, 0.25)';

    return {
        id: entryZone.id,
        type: 'entry_zone',
        color,
        boundaries: { top: entryZone.coordinates.top, bottom: entryZone.coordinates.bottom },
        status: entryZone.status
    };
}

/**
 * Draw target projection (Stop Loss or Take Profit)
 * @param {Object} chart - TradingView chart instance
 * @param {TargetProjection} target - Target projection annotation
 */
export function drawTargetProjection(chart, target) {
    if (!target.visible) return null;

    const color = target.isStopLoss() ? '#ef4444' : '#10b981';
    const lineStyle = target.isStopLoss() ? 2 : 1; // Dashed for SL, dotted for TP

    const priceLine = {
        price: target.coordinates.price,
        color: color,
        lineWidth: 1,
        lineStyle: lineStyle,
        axisLabelVisible: true,
        title: target.getLabel(),
    };

    return {
        id: target.id,
        type: 'price_line',
        priceLine
    };
}

/**
 * Draw liquidity zone
 * @param {Object} chart - TradingView chart instance
 * @param {LiquidityZone} liquidityZone - Liquidity zone annotation
 */
export function drawLiquidityZone(chart, liquidityZone) {
    if (!liquidityZone.visible) return null;

    const bounds = liquidityZone.getBounds();
    const color = liquidityZone.touched ?
        'rgba(245, 158, 11, 0.15)' :
        'rgba(245, 158, 11, 0.30)';

    return {
        id: liquidityZone.id,
        type: 'liquidity_zone',
        color,
        boundaries: bounds,
        zoneType: liquidityZone.zoneType
    };
}

/**
 * Render all annotations on chart
 * @param {Object} chart - TradingView chart instance
 * @param {Array} annotations - Array of all annotations
 * @returns {Array} - Rendered annotation references
 */
export function renderAllAnnotations(chart, annotations) {
    const rendered = [];

    annotations.forEach(annotation => {
        let result = null;

        switch (annotation.type) {
            case 'TRENDLINE':
                result = drawTrendline(chart, annotation);
                break;
            case 'STRUCTURE_MARKER':
                result = drawStructureMarker(chart, annotation);
                break;
            case 'SUPPLY_DEMAND_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'ENTRY_ZONE':
                result = drawEntryZone(chart, annotation);
                break;
            case 'TARGET_PROJECTION':
                result = drawTargetProjection(chart, annotation);
                break;
            case 'LIQUIDITY_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'FAIR_VALUE_GAP':
                result = drawBoxZone(chart, annotation);
                break;
            case 'ORDER_BLOCK':
                result = drawBoxZone(chart, annotation);
                break;
            case 'PREMIUM_DISCOUNT_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'STRUCTURE_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'SR_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'CONSOLIDATION_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'RETEST_ZONE':
                result = drawMarker(chart, annotation, 'hexagon', '#FFD700');
                break;
            case 'LIQUIDITY_SWEEP_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'SESSION_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'NEWS_IMPACT_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'TIME_BASED_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'CONFLUENCE_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'INVALIDATION_ZONE':
                result = drawBoxZone(chart, annotation);
                break;
            case 'VOLUME_PROFILE':
                result = drawVolumeProfile(chart, annotation);
                break;
            case 'SCENARIO_PATH':
                result = drawScenarioPath(chart, annotation);
                break;
            case 'ORDER_FLOW_HEATMAP':
                result = drawHeatmap(chart, annotation);
                break;
            case 'NEWS_SHOCK':
                result = drawNewsShock(chart, annotation);
                break;
        }

        if (result) {
            rendered.push(result);
        }
    });

    return rendered;
}

/**
 * Generic Box/Zone Drawing (Refactored for Phase 21 Visual System)
 */
export function drawBoxZone(chart, zone) {
    if (!zone.visible) return null;

    const visuals = getZoneVisuals(zone);
    const coords = zone.coordinates;

    const data = [
        { time: coords.startTime || coords.time, value: coords.top },
        { time: coords.startTime || coords.time, value: coords.bottom }
    ];
    if (coords.endTime) {
        data.push({ time: coords.endTime, value: coords.top });
        data.push({ time: coords.endTime, value: coords.bottom });
    }

    // Special logic for HTF double-borders (simulated with slightly offset thick line)
    const isHTF = visuals.isHTF;
    const isConfluence = zone.type === 'CONFLUENCE_ZONE';

    return {
        id: zone.id,
        type: 'zone',
        color: visuals.color,
        hex: visuals.hex,
        icon: visuals.icon,
        data,
        boundaries: { top: coords.top, bottom: coords.bottom },
        lineWidth: visuals.lineWidth,
        lineStyle: visuals.lineStyle,
        isHTF: isHTF,
        isConfluence: isConfluence,
        label: `${visuals.icon} ${zone.type.replace('_ZONE', '').replace('_', ' ')} (${zone.timeframe || 'LTF'})`
    };
}

/**
 * Draw Marker helper
 */
export function drawMarker(chart, annotation, shape, color) {
    if (!annotation.visible) return null;
    const data = {
        time: annotation.coordinates.time,
        position: 'inBar',
        color: color,
        shape: shape,
        text: annotation.type.replace('_ZONE', '').replace('_MARKER', ''),
        size: 2
    };
    return { id: annotation.id, data, type: 'marker' };
}

/**
 * Clear all annotations from chart
 * @param {Object} chart - TradingView chart instance
 * @param {Array} renderedAnnotations - Previously rendered annotations
 */
export function clearAnnotations(chart, renderedAnnotations) {
    renderedAnnotations.forEach(annotation => {
        if (annotation.series) {
            chart.removeSeries(annotation.series);
        }
    });
}

/**
 * Draw Volume Profile Histogram
 */
export function drawVolumeProfile(chart, profile) {
    if (!profile.visible) return null;

    return {
        id: profile.id,
        type: 'volume_profile',
        side: profile.side,
        poc: profile.poc,
        vah: profile.vah,
        val: profile.val,
        buckets: profile.buckets.map(b => ({
            low: b.low,
            high: b.high,
            relVol: b.relVol,
            upColor: 'rgba(34, 197, 94, 0.3)',
            downColor: 'rgba(239, 68, 68, 0.3)',
            upVolume: b.upVolume,
            downVolume: b.downVolume
        }))
    };
}

/**
 * Draw Predictive Scenario Path
 */
export function drawScenarioPath(chart, scenario) {
    if (!scenario.visible) return null;

    // Dynamic Visual Confidence (Phase 37)
    // Scale thickness based on probability (0.2 -> 1px, 0.8 -> 4px)
    const prob = scenario.probability || 0.5;
    const lineWidth = Math.max(1, Math.min(5, Math.round(prob * 6)));

    let lineStyle = 0; // Solid
    if (scenario.style === 'DASHED') lineStyle = 2;
    if (scenario.style === 'DOTTED' || scenario.isConfirmed === false) lineStyle = 1;

    // Adjust opacity and glow for unconfirmed/low-confidence (Phase 37)
    const baseOpacity = scenario.isConfirmed ? 0.85 : 0.35;
    const confidenceModifier = prob > 0.6 ? 1.0 : 0.7;
    const finalOpacity = baseOpacity * confidenceModifier;
    const finalColor = color.replace('0.6', finalOpacity.toFixed(2));

    return {
        id: scenario.id,
        type: 'scenario_path',
        points: scenario.points,
        color,
        lineWidth,
        lineStyle,
        label: scenario.label,
        probability: scenario.probability,
    };
}

/**
 * Draw Order Flow Heatmap
 */
export function drawHeatmap(chart, heatmap) {
    if (!heatmap.visible) return null;

    return {
        id: heatmap.id,
        type: 'heatmap',
        data: heatmap.heatmap.map(layer => ({
            low: layer.low,
            high: layer.high,
            intensity: layer.intensity,
            // Color mapping: Intensity 0 -> subtle Blue, Intensity 1 -> Yellow/Cyan
            color: layer.dominance > 0
                ? `rgba(0, 255, 255, ${layer.intensity * 0.3})` // Cyan for Buy stacked
                : `rgba(255, 215, 0, ${layer.intensity * 0.3})`   // Gold for Sell stacked
        })),
        walls: heatmap.walls
    };
}
/**
 * Draw News Shock Visualizer (Phase 22)
 * Renders a vertical line and a volatility corridor
 */
export function drawNewsShock(chart, shock) {
    if (!shock.visible) return null;

    const isHigh = shock.impact === 'HIGH';
    const color = isHigh ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)';
    const corridorColor = isHigh ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)';

    return {
        id: shock.id,
        type: 'news_shock',
        time: shock.coordinates.time,
        color,
        label: `${shock.impact} IMPACT: ${shock.eventTitle}`,
        impact: shock.impact,
        isImminent: shock.isImminent(),
        corridor: {
            start: shock.volatilityCorridor.startTime,
            end: shock.volatilityCorridor.endTime,
            color: corridorColor
        }
    };
}
/**
 * Draw Liquidity Map Heatmap (Phase 24)
 * Renders horizontal strips with intensity-based opacity.
 */
export function drawLiquidityMap(chart, mapItems) {
    if (!mapItems || mapItems.length === 0) return [];

    return mapItems.map(item => ({
        id: item.id,
        type: 'liquidity_strip',
        price: item.price,
        color: item.getVisualColor(),
        intensity: item.intensity,
        label: `${item.side} Wall: ${item.volume.toLocaleString()}`,
        side: item.side
    }));
}
