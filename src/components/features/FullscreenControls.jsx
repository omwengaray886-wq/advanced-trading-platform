import React from 'react';
import { Clock, TrendingUp, Layers, Camera, Layout, Minus, Square, Type } from 'lucide-react';

/**
 * Advanced controls bar for fullscreen chart
 */
export default function FullscreenControls({
    timeframe,
    onTimeframeChange,
    indicators,
    onToggleIndicator,
    onScreenshot,
    activeDrawTool,
    onSelectDrawTool
}) {
    const timeframes = ['1m', '5m', '15m', '30m', '1H', '2H', '4H', 'D', 'W'];

    const drawTools = [
        { id: 'trendline', label: 'Trendline', icon: TrendingUp },
        { id: 'horizontal', label: 'H-Line', icon: Minus },
        { id: 'rectangle', label: 'Rectangle', icon: Square },
        { id: 'text', label: 'Text', icon: Type }
    ];

    const indicatorOptions = [
        { id: 'volumeProfile', label: 'Volume Profile' },
        { id: 'sessionZones', label: 'Session Zones' },
        { id: 'liquidityHeatmap', label: 'Liquidity Heatmap' },
        { id: 'institutionalLevels', label: 'Institutional Levels' }
    ];

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap'
        }}>
            {/* Timeframe Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="rgba(255,255,255,0.5)" />
                <div style={{
                    display: 'flex',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '4px',
                    borderRadius: '8px',
                    gap: '4px'
                }}>
                    {timeframes.map(tf => (
                        <button
                            key={tf}
                            onClick={() => onTimeframeChange(tf)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: timeframe === tf ? 'rgba(37, 99, 235, 0.3)' : 'transparent',
                                color: timeframe === tf ? 'white' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

            {/* Drawing Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>DRAW</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {drawTools.map(tool => {
                        const Icon = tool.icon;
                        return (
                            <button
                                key={tool.id}
                                onClick={() => onSelectDrawTool(tool.id)}
                                title={tool.label}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '6px',
                                    border: activeDrawTool === tool.id ? '1px solid rgba(37, 99, 235, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                                    background: activeDrawTool === tool.id ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255,255,255,0.05)',
                                    color: activeDrawTool === tool.id ? '#3b82f6' : 'rgba(255,255,255,0.6)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Icon size={16} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

            {/* Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="rgba(255,255,255,0.5)" />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {indicatorOptions.map(indicator => (
                        <button
                            key={indicator.id}
                            onClick={() => onToggleIndicator(indicator.id)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: indicators[indicator.id] ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                                color: indicators[indicator.id] ? '#10b981' : 'rgba(255,255,255,0.6)',
                                cursor: 'pointer',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                transition: 'all 0.2s'
                            }}
                        >
                            {indicator.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

            {/* Screenshot */}
            <button
                onClick={onScreenshot}
                style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.8)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
                <Camera size={14} />
                SCREENSHOT
            </button>
        </div>
    );
}
