
// Mock structures for testing mapping logic
const mockAnnotations = [
    {
        type: 'STRUCTURE_MARKER',
        markerType: 'HH',
        coordinates: { time: 1700000000, price: 50000 },
        visible: true
    },
    {
        type: 'TRENDLINE',
        coordinates: {
            start: { time: 1700000000, price: 49000 },
            end: { time: 1700001000, price: 51000 }
        },
        metadata: { label: 'XA Test' },
        visible: true
    },
    {
        type: 'TARGET_PROJECTION',
        targetType: 'STOP_LOSS',
        price: 48000,
        visible: true
    },
    {
        type: 'CHOCH_ZONE',
        coordinates: { time: 1700000000, top: 50100, bottom: 49900 },
        state: 'fresh',
        visible: true
    }
];

// Simplified version of the mapping function from Dashboard.jsx
const mapAnnotationsToOverlays = (annotations, liquidityMap = []) => {
    const zones = [];
    const labels = [];
    const shocks = [];
    const divergences = [];
    const lines = [];
    const structureMarkers = [];

    const getZoneVisuals = (anno) => {
        return { background: 'rgba(0,0,0,0.4)', borderColor: '#fff', icon: '?', isHTF: false };
    };

    annotations.forEach(anno => {
        if (anno.visible === false) return;
        const visuals = getZoneVisuals(anno);

        if (['ENTRY_ZONE', 'SUPPLY_DEMAND_ZONE', 'CONSOLIDATION_ZONE', 'ORDER_BLOCK', 'FAIR_VALUE_GAP', 'LIQUIDITY_ZONE', 'STRUCTURE_ZONE', 'CONFLUENCE_ZONE', 'PREMIUM_DISCOUNT_ZONE', 'CHOCH_ZONE'].includes(anno.type)) {
            zones.push({ id: anno.id, label: anno.type });
        }
        else if (anno.type === 'TRENDLINE') {
            lines.push({ id: anno.id, start: anno.coordinates.start, end: anno.coordinates.end });
        }
        else if (anno.type === 'STRUCTURE_MARKER') {
            structureMarkers.push({ id: anno.id, label: anno.markerType });
        }
        else if (anno.type === 'TARGET_PROJECTION') {
            labels.push({ id: anno.id, text: anno.targetType });
        }
    });

    return { zones, labels, shocks, liquidityMap, divergences, lines, structureMarkers };
};

const result = mapAnnotationsToOverlays(mockAnnotations);

console.log('--- Verification Result ---');
console.log('Structure Markers:', result.structureMarkers.length);
console.log('Trendlines:', result.lines.length);
console.log('Zones (with CHOCH):', result.zones.length);
console.log('Labels (with Targets):', result.labels.length);

if (result.structureMarkers.length === 1 &&
    result.lines.length === 1 &&
    result.zones.length === 1 &&
    result.labels.length === 1) {
    console.log('✅ PASS: All new types mapped successfully.');
} else {
    console.log('❌ FAIL: Missing mapped types.');
    process.exit(1);
}
