/**
 * Fundamental Analyzer
 * Integrates economic events and fundamental context into technical analysis
 */

import { EconomicEvent } from '../models/EconomicEvent.js';
import { EventImpact } from '../models/EventImpact.js';

export class FundamentalAnalyzer {
    /**
     * Analyze fundamental context for a symbol
     * @param {string} symbol - Trading pair
     * @param {string} assetClass - Asset class type
     * @returns {Object} - Fundamental analysis
     */
    analyzeFundamentals(symbol, assetClass) {
        const events = this.getRelevantEvents(symbol, assetClass);
        const impact = this.calculateOverallImpact(events, assetClass);
        const alignment = this.checkTechnicalAlignment(impact);
        const proximityAnalysis = this.analyzeProximity(events);

        return {
            events,
            impact,
            alignment,
            proximityAnalysis,
            summary: this.generateSummary(events, impact, assetClass)
        };
    }

    /**
     * Get relevant economic events for symbol
     * @param {string} symbol - Trading pair
     * @param {string} assetClass - Asset class
     * @returns {Array} - Relevant events
     */
    getRelevantEvents(symbol, assetClass) {
        // In production, this would fetch from a real calendar API
        // For now, return mock events based on asset class

        const now = Date.now();
        const events = [];

        if (assetClass === 'FOREX') {
            // Forex events
            if (symbol.includes('USD')) {
                events.push(
                    new EconomicEvent({
                        asset: 'USD',
                        type: 'INTEREST_RATE_DECISION',
                        description: 'FOMC Meeting',
                        timestamp: now + 86400000 * 2,
                        impact: 'HIGH',
                        bias: 'HAWKISH',
                        volatilityExpected: 'HIGH'
                    }),
                    new EconomicEvent({
                        asset: 'USD',
                        type: 'NON_FARM_PAYROLLS',
                        description: 'Non-Farm Payrolls',
                        timestamp: now + 86400000 * 5,
                        impact: 'VERY_HIGH',
                        bias: 'HAWKISH',
                        volatilityExpected: 'HIGH'
                    })
                );
            }
            if (symbol.includes('EUR')) {
                events.push(
                    new EconomicEvent({
                        asset: 'EUR',
                        type: 'INTEREST_RATE_DECISION',
                        description: 'ECB Interest Rate Decision',
                        timestamp: now + 86400000 * 3,
                        impact: 'VERY_HIGH',
                        bias: 'NEUTRAL',
                        volatilityExpected: 'MEDIUM'
                    })
                );
            }
        } else if (assetClass === 'CRYPTO') {
            // Crypto fundamental events
            if (symbol.includes('BTC')) {
                events.push(
                    new EconomicEvent({
                        asset: 'BTC',
                        type: 'ETF_FLOW',
                        description: 'Bitcoin ETF Inflows',
                        timestamp: now,
                        impact: 'HIGH',
                        bias: 'RISK_ON',
                        volatilityExpected: 'MEDIUM'
                    }),
                    new EconomicEvent({
                        asset: 'BTC',
                        type: 'CRYPTO_SUPPLY',
                        description: 'Halving Cycle Post-Effect',
                        timestamp: now - 86400000 * 180,
                        impact: 'MEDIUM',
                        bias: 'BULLISH',
                        volatilityExpected: 'LOW'
                    })
                );
            }
        }

        return events;
    }

    /**
     * Calculate overall fundamental impact
     * @param {Array} events - Economic events
     * @param {string} assetClass - Asset class
     * @returns {Object} - Impact analysis
     */
    calculateOverallImpact(events, assetClass) {
        if (events.length === 0) {
            return {
                direction: 'NEUTRAL',
                strength: 0,
                confidence: 0.5,
                timeHorizon: 'NONE'
            };
        }

        // Calculate composite impact
        const scores = events.map(e => {
            // We only need the impact score here, so technical bias doesn't matter yet
            // passing 'NEUTRAL' as placeholder
            const calc = new EventImpact(e, 'NEUTRAL');
            return calc.calculateImpact();
        });

        // Aggregate scores
        const avgDirection = scores.reduce((sum, s) => sum + s.directionScore, 0) / scores.length;
        const maxStrength = Math.max(...scores.map(s => s.strength));
        const avgConfidence = scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length;

        return {
            direction: avgDirection > 0.2 ? 'BULLISH' : avgDirection < -0.2 ? 'BEARISH' : 'NEUTRAL',
            strength: maxStrength,
            confidence: avgConfidence,
            timeHorizon: this.determineTimeHorizon(events),
            weight: this.getFundamentalWeight(assetClass)
        };
    }

    /**
     * Check if fundamentals align with technical bias
     * @param {Object} impact - Fundamental impact
     * @returns {Object} - Alignment analysis
     */
    checkTechnicalAlignment(impact) {
        return {
            aligned: false, // Will be set by orchestrator
            conflictLevel: 'NONE',
            recommendation: impact.strength > 0.7 ?
                'Strong fundamentals support this setup' :
                'Fundamentals are neutral, rely on technicals'
        };
    }

    /**
     * Determine time horizon for fundamental impact
     * @param {Array} events - Economic events
     * @returns {string} - Time horizon
     */
    determineTimeHorizon(events) {
        const urgentEvents = events.filter(e => {
            const timeToEvent = e.timestamp - Date.now();
            return timeToEvent < 86400000 * 3; // Within 3 days
        });

        if (urgentEvents.length > 0) return 'SHORT_TERM';
        return 'MEDIUM_TERM';
    }

    /**
     * Get fundamental weight based on asset class
     * @param {string} assetClass - Asset class
     * @returns {number} - Weight (0-1)
     */
    getFundamentalWeight(assetClass) {
        return {
            FOREX: 0.7,
            CRYPTO: 0.4,
            INDICES: 0.8,
            STOCKS: 0.9
        }[assetClass] || 0.5;
    }

    /**
     * Generate fundamental summary
     * @param {Array} events - Economic events
     * @param {Object} impact - Impact analysis
     * @param {string} assetClass - Asset class
     * @returns {string} - Summary text
     */
    generateSummary(events, impact, assetClass) {
        if (events.length === 0) {
            return 'No significant fundamental events expected in the near term.';
        }

        const direction = impact.direction.toLowerCase();
        const strength = impact.strength > 0.7 ? 'strong' : impact.strength > 0.5 ? 'moderate' : 'weak';

        let summary = `Fundamentals show ${strength} ${direction} bias. `;

        const upcomingEvents = events.filter(e => e.timestamp > Date.now());
        if (upcomingEvents.length > 0) {
            const nextEvent = upcomingEvents[0];
            summary += `Key event: ${nextEvent.event} (${nextEvent.impact} impact). `;
        }

        if (assetClass === 'CRYPTO') {
            summary += 'Monitor on-chain flows and funding rates for confirmation.';
        } else if (assetClass === 'FOREX') {
            summary += 'Watch for central bank rhetoric and economic data releases.';
        }

        return summary;
    }

    /**
     * Analyze proximity of high-impact events
     */
    analyzeProximity(events) {
        const now = Date.now();
        const highImpactEvents = events.filter(e => e.impact === 'HIGH' || e.impact === 'VERY_HIGH');

        if (highImpactEvents.length === 0) return null;

        const nextEvent = highImpactEvents
            .filter(e => e.timestamp > now)
            .sort((a, b) => a.timestamp - b.timestamp)[0];

        if (!nextEvent) return null;

        const minutesToEvent = (nextEvent.timestamp - now) / (1000 * 60);

        return {
            event: nextEvent,
            minutesToEvent,
            isImminent: minutesToEvent < 120, // 2 hours
            isDistant: minutesToEvent < 1440 // 24 hours
        };
    }

    /**
     * Adjust technical confidence based on fundamentals
     */
    adjustConfidence(technicalConfidence, fundamentals, aligned) {
        if (!fundamentals || fundamentals.impact.direction === 'NEUTRAL') {
            return technicalConfidence;
        }

        const fundamentalWeight = fundamentals.impact.weight;

        if (aligned) {
            // Fundamentals support technicals - boost confidence
            const boost = fundamentals.impact.strength * fundamentalWeight * 0.15;
            return Math.min(technicalConfidence + boost, 0.95);
        } else {
            // Fundamentals conflict - reduce confidence
            const penalty = fundamentals.impact.strength * fundamentalWeight * 0.20;
            return Math.max(technicalConfidence - penalty, 0.30);
        }
    }
}
