import React, { useEffect, useRef } from 'react';

export const PatternMatcher = ({ patterns, currentPrice }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!patterns || !patterns.bestMatch || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw "Ghost" Pattern
        // The match gives us a historical segment. We need to normalize it to fit the current view?
        // Actually, for this MVP, we'll just draw a stylized representation of the PREDICTION.

        const prediction = patterns.prediction; // BULLISH / BEARISH
        const confidence = patterns.confidence || 0;

        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, prediction === 'BULLISH' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Text
        ctx.font = '12px Inter';
        ctx.fillStyle = '#888';
        ctx.fillText('AI FRACTAL MATCH', 10, 20);

        ctx.font = 'bold 16px Inter';
        ctx.fillStyle = prediction === 'BULLISH' ? '#00E396' : '#FF4560';
        ctx.fillText(`${prediction} (${(confidence * 100).toFixed(0)}%)`, 10, 40);

        // Draw mini stick figure graph
        ctx.beginPath();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;

        // Mock path based on prediction
        let x = 10, y = 80;
        ctx.moveTo(x, y);

        if (prediction === 'BULLISH') {
            ctx.lineTo(x + 30, y + 10); // Dip
            ctx.lineTo(x + 60, y - 30); // Rip
            ctx.lineTo(x + 90, y - 10); // Retest
            ctx.lineTo(x + 130, y - 50); // Moon
        } else {
            ctx.lineTo(x + 30, y - 10); // Pop
            ctx.lineTo(x + 60, y + 30); // Drop
            ctx.lineTo(x + 90, y + 10); // Retest
            ctx.lineTo(x + 130, y + 50); // Doom
        }
        ctx.stroke();

        // Label
        ctx.fillStyle = '#666';
        ctx.font = '10px Inter';
        ctx.fillText('Projected Path (DTW)', 10, 100);

    }, [patterns]);

    if (!patterns) return null;

    return (
        <div className="pattern-matcher-widget" style={{
            background: 'rgba(20,20,30,0.5)',
            border: '1px solid #333',
            borderRadius: '8px',
            marginBottom: '10px'
        }}>
            <canvas ref={canvasRef} width={200} height={120} />
        </div>
    );
};
