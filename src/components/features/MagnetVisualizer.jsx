import React, { useMemo } from 'react';

/**
 * MagnetVisualizer
 * Visualizes Market Obligations (Liquidity Pools & Gaps) as magnetic levels.
 * Phase 52: Market Obligation / Magnet Theory
 */
const MagnetVisualizer = ({ marketState, visible }) => {
    // 1. Safety Checks
    if (!visible || !marketState || !marketState.obligations) return null;

    const { obligations, primaryObligation } = marketState.obligations;

    // 2. Memoize Renderables to prevent flicker
    const magnets = useMemo(() => {
        if (!obligations) return [];
        return obligations;
    }, [obligations]);

    // 3. Render
    return (
        <div className="magnet-overlay" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
            {magnets.map((mag, i) => {
                const isPrimary = primaryObligation && mag.price === primaryObligation.price;
                const opacity = isPrimary ? 0.9 : Math.max(0.3, mag.urgency / 100);
                const color = mag.type.includes('BUY_SIDE') || mag.type.includes('BULLISH') ? '#00ff00' : '#ff0000';

                // Position logic would normally map price to Y-pixels here. 
                // Since this is an abstraction, we assume a parent renders these based on price props in a real chart via Context
                // For this component, we return a data-marker for the Chart Canvas to pick up, 
                // OR we presume this is part of a larger React Canvas overlay.

                // Note: Actual implementation depends on Chart.js or HTML overlay. 
                // Assuming HTML Overlay for now (like standard DOM elements on top of chart)
                // We'll pass the data down, this component might just be a logical container or state provider
                // in a real app. But let's act as if we are rendering semantic markers.

                return (
                    <div
                        key={`mag-${i}`}
                        className="magnet-line"
                        data-price={mag.price}
                        data-type={mag.type}
                        style={{
                            display: 'none', // Controlled by Chart Canvas usually
                            borderColor: color,
                            opacity: opacity
                        }}
                    />
                );
            })}
        </div>
    );
};

export const MagnetVisualizerPlugin = {
    id: 'magnetVisualizer',
    afterDraw: (chart, args, options) => {
        const { ctx, chartArea: { top, bottom, left, right, width, height }, scales: { x, y } } = chart;
        const marketState = options.marketState;

        if (!marketState || !marketState.obligations || !marketState.obligations.obligations) return;

        const { obligations, primaryObligation } = marketState.obligations;
        const now = Date.now();

        ctx.save();

        obligations.forEach(mag => {
            const yPos = y.getPixelForValue(mag.price);
            if (yPos < top || yPos > bottom) return;

            const isPrimary = primaryObligation && mag.price === primaryObligation.price;
            const urgencyColor = mag.type.includes('BUY') || mag.type.includes('BULLISH') ?
                `rgba(0, 255, 0, ${isPrimary ? 0.8 : 0.4})` :
                `rgba(255, 0, 0, ${isPrimary ? 0.8 : 0.4})`;

            // Draw Magnet Line (Dashed, Pulsing effect simulated by static opacity for now)
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = isPrimary ? 2 : 1;
            ctx.strokeStyle = urgencyColor;
            ctx.moveTo(left, yPos);
            ctx.lineTo(right, yPos);
            ctx.stroke();

            // Draw Label
            if (isPrimary) {
                ctx.font = 'bold 10px Inter';
                ctx.fillStyle = urgencyColor;
                ctx.fillText(`🧲 MAGNET (${mag.urgency})`, right - 80, yPos - 5);
            }
        });

        ctx.restore();
    }
};

export default MagnetVisualizerPlugin;
