/**
 * Scenario Engine
 * Predicts likely price movements based on MTF alignment, formations, and news.
 */
import { LiquidityMapService } from './LiquidityMapService.js';

export class ScenarioEngine {
    /**
     * Generate scenarios for a given market state and detected setups
     * @param {Object} marketState - Current market analysis
     * @param {Array} setups - Detected trade setups
     * @param {Object} fundamentals - News and fundamental context
     * @returns {Object} - Primary and Alternate scenarios
     */
    /**
     * Helper to normalize directional strings
     * @private
     */
    static _normalizeDirection(d) {
        if (!d) return 'NEUTRAL';
        const upper = d.toUpperCase();
        if (upper === 'LONG' || upper === 'BULLISH' || upper === 'UP') return 'BULLISH';
        if (upper === 'SHORT' || upper === 'BEARISH' || upper === 'DOWN') return 'BEARISH';
        return 'NEUTRAL';
    }

    /**
     * Generate probabilistic scenarios
     */
    static generateScenarios(marketState, setups, fundamentals, performanceStats = null) {
        const primarySetup = setups[0];
        const proximity = fundamentals?.proximityAnalysis;

        // 1. Detect Waiting Conditions (Phase 40)
        let waitingCondition = this.detectWaitingCondition(marketState, fundamentals);
        let isWaiting = waitingCondition !== null;

        let upProb = 0.33, downProb = 0.33, rangeProb = 0.34;

        if (isWaiting) {
            // Skew towards Range/Neutral if waiting
            rangeProb = 0.60;
            upProb = 0.20;
            downProb = 0.20;
        } else if (marketState.obligations?.state === 'NO_OBLIGATION') {
            // New Layer 1: Obligation Gating
            rangeProb = 0.8;
            upProb = 0.1;
            downProb = 0.1;
            waitingCondition = "NO OBLIGATION";
            isWaiting = true;
        } else if (primarySetup || marketState.obligations?.primaryObligation) {
            const obligation = marketState.obligations?.primaryObligation;

            // Determine Bias Source: Obligation (Why) > Setup (How)
            let biasDirection = 'NEUTRAL';
            let conviction = 50;

            if (primarySetup) {
                biasDirection = this._normalizeDirection(primarySetup.direction);
                conviction = primarySetup.quantScore || 50;
            }

            // Layer 3: Intent vs Manipulation
            if (obligation) {
                const obligationDir = obligation.price > marketState.currentPrice ? 'BULLISH' : 'BEARISH';

                if (biasDirection !== 'NEUTRAL' && biasDirection !== obligationDir) {
                    // CONFLICT: Setup says Down, Magnet says Up (or vice versa)
                    // This is likely a "Judas Swing" / Manipulation
                } else if (biasDirection === 'NEUTRAL') {
                    // No setup, but strong magnet -> Pure Intent prediction
                    biasDirection = obligationDir;
                    conviction = obligation.urgency;
                }
            }

            const isBullish = biasDirection === 'BULLISH';
            const globalBias = this._normalizeDirection(marketState.mtf?.globalBias);

            // Check trend alignment
            const isTrendAligned = globalBias === biasDirection;
            const isCounterTrend = globalBias !== 'NEUTRAL' && !isTrendAligned;

            // Base probabilities
            let baseProb = 0.5;

            // Adjust based on alignment
            if (isTrendAligned) {
                baseProb = 0.65; // High confidence for trend trades
            } else if (isCounterTrend) {
                // Penalize counter-trend bias
                baseProb = conviction > 75 ? 0.55 : 0.35;
            }

            // Layer 4: Time Pressure & Urgency (Boost)
            if (obligation?.urgency > 80) {
                baseProb += 0.15; // Massive boost for high urgency
            }

            const newsImpact = proximity?.isImminent ? (proximity.minutesToEvent < 30 ? 0.3 : 0.1) : 0;

            if (isBullish) {
                upProb = baseProb;
                downProb = 0.80 - baseProb;
            } else {
                downProb = baseProb;
                upProb = 0.80 - baseProb;
            }

            // Ensure Range probability is at least 20%
            rangeProb = 1.0 - (upProb + downProb);

            // News Hazard Adjustment
            if (newsImpact > 0) {
                const newsBias = this._normalizeDirection(proximity.event.getDirectionalBias?.() || 'NEUTRAL');
                if (newsBias !== 'NEUTRAL') {
                    const isNewsAligned = newsBias === biasDirection;
                    if (!isNewsAligned) {
                        if (isBullish) { upProb -= newsImpact; downProb += newsImpact; }
                        else { downProb -= newsImpact; upProb += newsImpact; }
                    } else {
                        if (isBullish) upProb += (newsImpact / 2); else downProb += (newsImpact / 2);
                    }
                }
                rangeProb = 1.0 - upProb - downProb;
            }
        } else {
            rangeProb = 0.7;
            upProb = 0.15;
            downProb = 0.15;
        }

        // Layer 5: Confidence Calibration
        upProb = Math.min(upProb, 0.75);
        downProb = Math.min(downProb, 0.75);

        // Reality Calibration
        if (performanceStats && primarySetup) {
            const stats = performanceStats[primarySetup.name];
            if (stats && stats.winRate < 0.45) {
                const isBullish = this._normalizeDirection(primarySetup.direction) === 'BULLISH';
                if (isBullish) upProb *= (stats.winRate / 0.45);
                else downProb *= (stats.winRate / 0.45);
            }
        }

        // Re-normalize range prob
        if (upProb + downProb > 0.85) {
            const factor = 0.85 / (upProb + downProb);
            upProb *= factor;
            downProb *= factor;
        }
        rangeProb = 1.0 - (upProb + downProb);

        // Normalize
        const total = upProb + downProb + rangeProb;
        upProb /= total; downProb /= total; rangeProb /= total;

        const scenarios = [
            { direction: 'up', probability: parseFloat(upProb.toFixed(2)), label: 'Bullish Expansion' },
            { direction: 'down', probability: parseFloat(downProb.toFixed(2)), label: 'Bearish Expansion' },
            { direction: 'range', probability: parseFloat(rangeProb.toFixed(2)), label: 'Consolidation' }
        ].sort((a, b) => b.probability - a.probability);

        // Layer 6: Prediction Expiry
        const expiresAt = Date.now() + (marketState.timeframe === '1H' ? 3600000 : 14400000);

        const primary = {
            ...scenarios[0],
            type: scenarios[0].direction.toUpperCase(),
            bias: scenarios[0].direction === 'up' ? 'LONG' : scenarios[0].direction === 'down' ? 'SHORT' : 'NEUTRAL',
            label: isWaiting ? `WAITING: ${waitingCondition}` : `Primary: ${scenarios[0].label}`,
            description: isWaiting ? 'Market is in a waiting state.' : `Highest probability path (${(scenarios[0].probability * 100).toFixed(0)}%) based on current ${marketState.phase}.`,
            style: isWaiting ? 'DOTTED' : 'SOLID',
            isWaiting: isWaiting,
            expiresAt: expiresAt
        };

        const secondary = {
            ...scenarios[1],
            type: scenarios[1].direction.toUpperCase(),
            bias: scenarios[1].direction === 'up' ? 'LONG' : scenarios[1].direction === 'down' ? 'SHORT' : 'NEUTRAL',
            label: `Secondary: ${scenarios[1].label}`,
            description: `Pivot path if ${scenarios[0].direction} structure fails.`,
            style: 'DASHED'
        };

        // --- Confirmation Logic ---
        primary.isConfirmed = this.checkConfirmation(marketState, primary, setups);
        secondary.isConfirmed = this.checkConfirmation(marketState, secondary, setups);

        if (!isWaiting) {
            primary.style = primary.isConfirmed ? 'SOLID' : 'DASHED';
            secondary.style = 'DOTTED';
        }

        return { primary, secondary, alternate: secondary, all: scenarios, isWaiting, waitingCondition };
    }

    /**
     * Check if a scenario is confirmed by market conditions
     * @param {Object} marketState
     * @param {Object} scenario
     * @param {Array} setups
     * @returns {boolean}
     */
    static checkConfirmation(marketState, scenario, setups) {
        if (!marketState || !scenario) return false;

        const bias = this._normalizeDirection(scenario.bias);
        const trend = this._normalizeDirection(marketState.trend?.direction);
        const mtfBias = this._normalizeDirection(marketState.mtf?.globalBias);

        // 1. alignment with global bias
        if (bias === mtfBias) return true;

        // 2. alignment with current trend (if strong)
        if (bias === trend && marketState.trend?.strength > 60) return true;

        // 3. alignment with a high-quality setup
        const matchingSetup = setups.find(s =>
            this._normalizeDirection(s.direction) === bias &&
            s.quantScore > 60
        );
        if (matchingSetup) return true;

        return false;
    }

    /**
     * Detect if market is in a "Waiting" state
     */
    static detectWaitingCondition(marketState, fundamentals) {
        if (fundamentals?.proximityAnalysis?.isImminent) return "NEWS PENDING";
        if (marketState.volatility === 'LOW' && marketState.regime === 'RANGING') return "LOW VOLATILITY";
        return null;
    }

    /**
     * Map scenarios to visual path JSON for the frontend
     */
    static getVisualScenarios(scenarios, marketState, annotations = [], volProfile = null, setups = [], orderBook = null) {
        const visual = [];
        const currentPrice = marketState.currentPrice;
        const primarySetup = setups[0];
        const secondarySetup = setups.length > 1 ? setups[1] : null;

        if (scenarios.primary) {
            visual.push({
                id: `scenario_primary_${Date.now()}`,
                type: 'SCENARIO_PATH',
                style: scenarios.primary.style || 'BOLD',
                direction: scenarios.primary.bias,
                points: this.generatePathway(marketState, scenarios.primary, annotations, volProfile, primarySetup, orderBook),
                label: scenarios.primary.label,
                probability: scenarios.primary.probability,
                isWaiting: scenarios.isWaiting
            });
        }

        if (scenarios.alternate) {
            visual.push({
                id: `scenario_alternate_${Date.now()}`,
                type: 'SCENARIO_PATH',
                style: scenarios.alternate.style || 'DASHED',
                direction: scenarios.alternate.bias,
                points: this.generatePathway(marketState, scenarios.alternate, annotations, volProfile, secondarySetup, orderBook),
                label: scenarios.alternate.label,
                probability: scenarios.alternate.probability
            });
        }

        return visual;
    }

    /**
     * Generate multi-point trajectory
     */
    static generatePathway(marketState, scenario, annotations, volProfile, setup, orderBook) {
        const currentPrice = marketState.currentPrice;
        const points = [{ price: currentPrice, type: 'START', timeOffset: 0 }];
        const normalizedBias = this._normalizeDirection(scenario.bias);
        const isBullish = normalizedBias === 'BULLISH';

        let pivotPrice = null;

        if (normalizedBias !== 'NEUTRAL') {
            if (setup && setup.entryZone && this._normalizeDirection(setup.direction) === normalizedBias) {
                pivotPrice = setup.entryZone.optimal;
            } else {
                const confluence = annotations.find(a => a.type === 'CONFLUENCE_ZONE');
                if (confluence) {
                    pivotPrice = (confluence.coordinates.top + confluence.coordinates.bottom) / 2;
                } else if (volProfile) {
                    if (Math.abs(currentPrice - volProfile.poc) / currentPrice > 0.005) {
                        pivotPrice = volProfile.poc;
                    }
                } else {
                    const ob = annotations.find(a => a.type === 'ORDER_BLOCK' && this._normalizeDirection(a.direction) === normalizedBias);
                    if (ob) pivotPrice = (ob.coordinates.top + ob.coordinates.bottom) / 2;
                }
            }
        }

        if (pivotPrice && ((isBullish && pivotPrice < currentPrice) || (!isBullish && pivotPrice > currentPrice))) {
            // Dynamic barsOffset based on velocity
            const velocity = marketState.velocity || 1.0;
            const pivotOffset = Math.max(3, Math.min(10, Math.round(5 / velocity)));

            // Check for Manipulation (Judas Swing)
            const isManipulated = marketState.liquiditySweep &&
                ((isBullish && marketState.liquiditySweep.type === 'BEARISH_SWEEP') ||
                    (!isBullish && marketState.liquiditySweep.type === 'BULLISH_SWEEP'));

            if (isManipulated) {
                // Add a fake-out point in the opposite direction first
                const sweepPrice = marketState.liquiditySweep.price;
                points.push({
                    price: sweepPrice,
                    type: 'PIVOT',
                    label: 'Manipulation',
                    barsOffset: Math.round(pivotOffset / 2),
                    style: 'DOTTED'
                });
            }

            points.push({ price: pivotPrice, type: 'PIVOT', label: 'Entry', barsOffset: pivotOffset });
        }

        let target = setup?.targets?.[0]?.price || (isBullish ? currentPrice * 1.02 : currentPrice * 0.98);

        if (orderBook) {
            const clusters = LiquidityMapService.findClusters(orderBook);
            const relevantWalls = isBullish ? clusters.sellClusters : clusters.buyClusters;
            const biggestWall = relevantWalls.sort((a, b) => b.quantity - a.quantity)[0];

            if (biggestWall) {
                const wallDist = Math.abs(biggestWall.price - currentPrice) / currentPrice;
                if (wallDist < 0.03) {
                    target = biggestWall.price;
                }
            }
        }

        const velocity = marketState.velocity || 1.0;
        const targetOffset = Math.max(8, Math.min(25, Math.round(15 / velocity)));

        points.push({ price: target, type: 'TARGET', label: 'Target', barsOffset: targetOffset });

        return points;
    }
}
