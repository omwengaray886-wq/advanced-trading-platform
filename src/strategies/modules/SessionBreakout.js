import { StrategyBase } from '../StrategyBase.js';
import { EntryZone } from '../../models/annotations/EntryZone.js';
import { TargetProjection } from '../../models/annotations/TargetProjection.js';

/**
 * Session Breakout Strategy
 * 
 * Capitalizes on the volatility injection at London and NY Opens.
 * Uses the range of the pre-session (e.g., Asian Range for London) as a reference.
 */
export class SessionBreakout extends StrategyBase {
    constructor() {
        super(
            'Session Open Breakout',
            'Breakout strategy for London and New York opens using pre-market range.'
        );
    }

    evaluate(marketState, direction = 'LONG') {
        const session = marketState.session;
        if (!session || !session.active) return 0;

        // Only active during the first 2 hours of a session
        const isActiveSessionOpen = session.killzone === 'LONDON_OPEN' || session.killzone === 'NY_OPEN';

        if (!isActiveSessionOpen) return 0.1;

        // Check momentum
        const momentum = marketState.trend.momentum || 'NEUTRAL';

        if (direction === 'LONG') {
            return momentum === 'BULLISH' ? 0.85 : 0.4;
        } else {
            return momentum === 'BEARISH' ? 0.85 : 0.4;
        }
    }

    generateAnnotations(candles, marketState, direction = 'LONG') {
        const annotations = [];

        // We need a defined range to break out OF.
        // Assuming AnalysisOrchestrator calculates `marketState.session.openRange` or similar? 
        // If not, we can calculate a simple "Last 4 hours" high/low

        // Simplified Logic: Breakout of the last 4H High/Low
        const calcRange = (secs) => {
            const count = Math.ceil(secs / (marketState.timeframeSeconds || 3600)); // approx
            const recent = candles.slice(-Math.max(4, count));
            const highs = recent.map(c => c.high);
            const lows = recent.map(c => c.low);
            return { high: Math.max(...highs), low: Math.min(...lows) };
        };

        const range = calcRange(4 * 3600); // 4 Hour range

        const entryPrice = direction === 'LONG' ? range.high : range.low;
        const currentPrice = marketState.currentPrice;

        // If breakout happened or is close
        const atr = this.calculateATR(candles);
        if (Math.abs(currentPrice - entryPrice) < atr) {
            annotations.push(new EntryZone(
                entryPrice + (atr * 0.1),
                entryPrice - (atr * 0.1),
                direction === 'LONG' ? 'LONG' : 'SHORT',
                {
                    id: 'session-breakout',
                    note: `${marketState.session.active} Session Breakout`,
                    confidence: 0.8
                }
            ));

            const stop = direction === 'LONG' ? range.low : range.high; // Or mid-range
            annotations.push(new TargetProjection(stop, 'STOP_LOSS', { label: 'Range Fail' }));

            const risk = Math.abs(entryPrice - stop);
            annotations.push(new TargetProjection(
                direction === 'LONG' ? entryPrice + (risk * 2) : entryPrice - (risk * 2),
                'TARGET_1',
                { label: 'Expansion' }
            ));
        }

        return annotations;
    }

    getEntryLogic(analysis) {
        return 'Volatility expansion at session open breaking pre-market range.';
    }

    getInvalidationLogic(analysis) { return ''; }
    getRiskParameters(analysis) { return {}; }
}
