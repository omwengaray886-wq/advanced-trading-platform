/**
 * Event Blocker
 * Prevents trades during high-impact economic events
 */

export class EventBlocker {
    constructor() {
        this.blockedWindows = new Map(); // key: symbol, value: { start, end, reason }
    }

    /**
     * Check if trading should be blocked for a symbol
     * @param {string} symbol - Trading pair
     * @param {Array} upcomingEvents - Economic calendar events
     * @param {number} bufferMinutes - Buffer time before/after event (default: 30min)
     * @returns {Object} { isBlocked: boolean, reason: string, nextClearTime: Date }
     */
    checkEventBlock(symbol, upcomingEvents, bufferMinutes = 30) {
        if (!upcomingEvents || upcomingEvents.length === 0) {
            return { isBlocked: false, reason: null, nextClearTime: null };
        }

        const now = new Date();
        const bufferMs = bufferMinutes * 60 * 1000;

        // Filter events relevant to this symbol
        const relevantEvents = this.filterRelevantEvents(symbol, upcomingEvents);

        for (const event of relevantEvents) {
            const eventTime = new Date(event.date || event.time);
            const blockStart = new Date(eventTime.getTime() - bufferMs);
            const blockEnd = new Date(eventTime.getTime() + bufferMs);

            if (now >= blockStart && now <= blockEnd) {
                const minutesUntilClear = Math.ceil((blockEnd - now) / 60000);

                return {
                    isBlocked: true,
                    reason: `❌ EVENT BLOCK: ${event.event || event.title} in ${this.getTimeToEvent(now, eventTime)}`,
                    event: event.event || event.title,
                    eventTime,
                    nextClearTime: blockEnd,
                    minutesUntilClear,
                    tier: event.impact || 'HIGH'
                };
            }

            // Check upcoming events within next 2 hours (warning only)
            if (eventTime > now && eventTime <= new Date(now.getTime() + 2 * 60 * 60 * 1000)) {
                return {
                    isBlocked: false,
                    isWarning: true,
                    reason: `⚠️ UPCOMING EVENT: ${event.event || event.title} in ${this.getTimeToEvent(now, eventTime)}`,
                    event: event.event || event.title,
                    eventTime,
                    minutesUntilEvent: Math.ceil((eventTime - now) / 60000),
                    tier: event.impact || 'HIGH'
                };
            }
        }

        return { isBlocked: false, reason: null, nextClearTime: null };
    }

    /**
     * Filter events relevant to a specific symbol
     * @param {string} symbol - Trading pair
     * @param {Array} events - All events
     * @returns {Array} Filtered events
     */
    filterRelevantEvents(symbol, events) {
        // Map symbols to relevant currencies/indices
        const assetMap = {
            'EURUSD': ['USD', 'EUR', 'US', 'EURO'],
            'GBPUSD': ['USD', 'GBP', 'US', 'UK'],
            'USDJPY': ['USD', 'JPY', 'US', 'JAPAN'],
            'XAUUSD': ['USD', 'GOLD', 'US'],
            'BTCUSDT': ['CRYPTO', 'BITCOIN', 'BTC', 'US'],
            'ETHUSDT': ['CRYPTO', 'ETHEREUM', 'ETH', 'US'],
            'SPX': ['US', 'SP500', 'STOCK'],
            'NDX': ['US', 'NASDAQ', 'STOCK'],
            'DXY': ['USD', 'DOLLAR', 'US']
        };

        const relevantKeywords = assetMap[symbol] || ['US', 'GLOBAL'];

        return events.filter(e => {
            const eventText = `${e.event || e.title || ''} ${e.country || ''}`.toUpperCase();

            // Tier 1 events (NFP, CPI, FOMC) affect ALL assets
            const tier1Events = ['NFP', 'PAYROLL', 'CPI', 'FOMC', 'FEDERAL RESERVE', 'INTEREST RATE'];
            if (tier1Events.some(k => eventText.includes(k))) {
                return true;
            }

            // Otherwise check if event matches symbol keywords
            return relevantKeywords.some(keyword => eventText.includes(keyword));
        });
    }

    /**
     * Get human-readable time to event
     * @param {Date} now - Current time
     * @param {Date} eventTime - Event time
     * @returns {string} e.g., "15 minutes", "2 hours"
     */
    getTimeToEvent(now, eventTime) {
        const diffMs = eventTime - now;
        const diffMins = Math.abs(Math.floor(diffMs / 60000));

        if (diffMins === 0) return 'NOW';
        if (diffMins < 60) return `${diffMins} minutes`;

        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;

        if (remainingMins === 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        return `${diffHours}h ${remainingMins}m`;
    }

    /**
     * Get all high-impact events in the next window
     * @param {Array} events - All upcoming events
     * @param {number} windowHours - Lookahead window (default: 24hrs)
     * @returns {Array} High-impact events within window
     */
    getHighImpactEvents(events, windowHours = 24) {
        const now = new Date();
        const future = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

        return events.filter(e => {
            const eventTime = new Date(e.date || e.time);
            return e.impact === 'HIGH' && eventTime >= now && eventTime <= future;
        });
    }
}

// Singleton instance
export const eventBlocker = new EventBlocker();
