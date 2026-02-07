export class NewsService {
    constructor() {
        this.mockEvents = [
            { time: Math.floor(Date.now() / 1000) - 86400, event: 'FOMC Interest Rate Decision', impact: 'HIGH', currency: 'USD' },
            { time: Math.floor(Date.now() / 1000) - 172800, event: 'Non-Farm Payrolls', impact: 'HIGH', currency: 'USD' },
            { time: Math.floor(Date.now() / 1000) - 259200, event: 'CPI Data Release', impact: 'HIGH', currency: 'USD' },
            { time: Math.floor(Date.now() / 1000) + 3600, event: 'Core PCE Price Index', impact: 'HIGH', currency: 'USD' },
        ];
    }

    /**
     * Get news events for a symbol and timeframe
     */
    getEvents(symbol, startTime, endTime) {
        return this.mockEvents.filter(e => e.time >= startTime && e.time <= endTime);
    }

    /**
     * Get upcoming high-impact shocks (Phase 22)
     */
    getUpcomingShocks(windowHours = 24) {
        const now = Math.floor(Date.now() / 1000);
        const windowSeconds = windowHours * 3600;

        return this.mockEvents.filter(e =>
            e.impact === 'HIGH' &&
            e.time >= now &&
            e.time <= now + windowSeconds
        );
    }
}

export const newsService = new NewsService();
