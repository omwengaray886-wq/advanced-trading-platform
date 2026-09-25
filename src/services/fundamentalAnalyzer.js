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
     * @param {Object} realData - Real data from newsService/calendar
     * @returns {Object} - Fundamental analysis
     */
    analyzeFundamentals(symbol, assetClass, realData = {}) {
        const events = realData.events || this.getRelevantEvents(symbol, assetClass);
        const news = realData.news || [];

        const impact = this.calculateOverallImpact(events, assetClass, news);
        const alignment = this.checkTechnicalAlignment(impact);
        const proximityAnalysis = this.analyzeProximity(events);

        return {
            events,
            news,
            impact,
            alignment,
            proximityAnalysis,
            summary: this.generateSummary(events, impact, assetClass)
        };
    }

    /**
     * Get fallback events if real data is missing
     */
    getRelevantEvents(symbol, assetClass) {
        return []; // No longer using mock events by default
    }

    /**
     * Calculate overall fundamental impact
     * @param {Array} events - Economic events
     * @param {string} assetClass - Asset class
     * @param {Array} news - Recent news headlines
     * @returns {Object} - Impact analysis
     */
    calculateOverallImpact(events, assetClass, news = []) {
        if (events.length === 0 && news.length === 0) {
            return {
                direction: 'NEUTRAL',
                strength: 0,
                confidence: 0.5,
                timeHorizon: 'NONE'
            };
        }

        // Calculate composite impact for events
        const scores = events.map(e => {
            // Assign Tier if not already present
            if (!e.tier) {
                e.tier = this._determineTier(e.type || e.event);
            }

            const calc = new EventImpact(e, 'NEUTRAL');
            const score = calc.calculateImpact();

            // Tier 1 Boost
            if (e.tier === 'TIER 1') {
                score.strength = Math.min(score.strength * 1.5, 1.2);
                score.confidence = Math.min(score.confidence + 0.2, 0.95);
            }

            return score;
        });

        // News headlines impact mapping
        const newsBias = news.reduce((acc, n) => {
            if (n.sentiment === 'BULLISH') acc += 0.1;
            if (n.sentiment === 'BEARISH') acc -= 0.1;
            return acc;
        }, 0);

        // Aggregate scores
        const eventDirection = scores.length > 0 ? (scores.reduce((sum, s) => sum + s.directionScore, 0) / scores.length) : 0;
        const avgDirection = (eventDirection * 0.7) + (newsBias * 0.3);
        const maxStrength = Math.max(...(scores.map(s => s.strength) || [0]), Math.abs(newsBias));
        const avgConfidence = scores.length > 0 ? (scores.reduce((sum, s) => sum + s.confidence, 0) / scores.length) : 0.6;

        // Calculate News Advice (Phase 5)
        const activeBiases = events.filter(e => e.isReleased()).map(e => e.getTradingBias()).filter(b => b !== 'NEUTRAL');
        let newsAdvice = 'NORMAL';
        if (activeBiases.length > 0) {
            const bullishCount = activeBiases.filter(b => b === 'BULLISH').length;
            const bearishCount = activeBiases.filter(b => b === 'BEARISH').length;
            if (bullishCount > bearishCount) newsAdvice = 'BUY';
            else if (bearishCount > bullishCount) newsAdvice = 'SELL';
        }

        return {
            direction: avgDirection > 0.15 ? 'BULLISH' : avgDirection < -0.15 ? 'BEARISH' : 'NEUTRAL',
            strength: Math.min(maxStrength, 1.2),
            confidence: avgConfidence,
            newsAdvice,
            timeHorizon: this.determineTimeHorizon(events),
            weight: this.getFundamentalWeight(assetClass)
        };
    }

    /**
     * Determine Tier based on event type
     * @private
     */
    _determineTier(type) {
        if (!type) return 'TIER 3';
        const t = type.toUpperCase();
        if (['PAYROLL', 'NFP', 'CPI', 'FOMC', 'RATE', 'GDP'].some(k => t.includes(k))) return 'TIER 1';
        if (['ECB', 'BOE', 'BOJ', 'PPI', 'UNEMPLOYMENT', 'RETAIL'].some(k => t.includes(k))) return 'TIER 2';
        return 'TIER 3';
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
        if (events.length === 0) return 'MEDIUM_TERM';
        const urgentEvents = events.filter(e => {
            const timeToEvent = (e.timestamp * 1000) - Date.now();
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
        const weights = {
            FOREX: 0.7,
            CRYPTO: 0.4,
            INDICES: 0.8,
            STOCKS: 0.9,
            METALS: 0.75
        };
        return weights[assetClass] || 0.5;
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
        const strength = impact.strength > 0.9 ? 'critical' : impact.strength > 0.7 ? 'strong' : impact.strength > 0.5 ? 'moderate' : 'weak';

        let summary = `Fundamentals show ${strength} ${direction} focus. `;

        const tier1 = events.filter(e => e.tier === 'TIER 1');
        if (tier1.length > 0) {
            summary += `Action driven by Tier 1 ${tier1[0].type || tier1[0].event}. `;
            if (tier1[0].actual) {
                summary += `Result: ${tier1[0].actual} vs ${tier1[0].forecast || 'N/A'}. `;
            }
        } else {
            const upcomingEvents = events.filter(e => e.timestamp * 1000 > Date.now());
            if (upcomingEvents.length > 0) {
                const nextEvent = upcomingEvents[0];
                summary += `Key upcoming: ${nextEvent.type || nextEvent.event} (${nextEvent.impact} impact). `;
            }
        }

        if (assetClass === 'CRYPTO') {
            summary += 'Sentiment leads; watch funding for over-extension.';
        } else if (assetClass === 'FOREX' || assetClass === 'METALS') {
            summary += 'Monitor yields and central bank liquidity windows.';
        }

        return summary;
    }

    /**
     * Analyze proximity of high-impact events
     */
    analyzeProximity(events) {
        const now = Date.now();
        const highImpactEvents = events.filter(e => e.impact === 'HIGH' || e.impact === 'VERY_HIGH' || e.tier === 'TIER 1');

        if (highImpactEvents.length === 0) return null;

        const nextEvent = highImpactEvents
            .filter(e => (e.timestamp * 1000) > now)
            .sort((a, b) => a.timestamp - b.timestamp)[0];

        if (!nextEvent) return null;

        const minutesToEvent = ((nextEvent.timestamp * 1000) - now) / (1000 * 60);

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
