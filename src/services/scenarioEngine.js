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
     * Generate probabilistic scenarios
     */
    static generateScenarios(marketState, setups, fundamentals) {
        const primarySetup = setups[0];
        const proximity = fundamentals?.proximityAnalysis;

        // 1. Detect Waiting Conditions (Phase 40)
        const waitingCondition = this.detectWaitingCondition(marketState, fundamentals);
        const isWaiting = waitingCondition !== null;

        let upProb = 0.33, downProb = 0.33, rangeProb = 0.34;

        if (isWaiting) {
            // Skew towards Range/Neutral if waiting
            rangeProb = 0.60;
            upProb = 0.20;
            downProb = 0.20;
        } else if (marketState.obligations?.state === 'NO_OBLIGATION') {
            // New Layer 1: Obligation Gating
            // If the market has no unfinished business, we do not predict direction.
            rangeProb = 0.8;
            upProb = 0.1;
            downProb = 0.1;
            waitingCondition = "NO OBLIGATION";
            isWaiting = true;
        } else if (primarySetup || marketState.obligations?.primaryObligation) {
            const obligation = marketState.obligations?.primaryObligation;

            // Determine Bias Source: Obligation (Why) > Setup (How)
            // If we have a strong obligation, it dictates the "True Intent"
            let biasDirection = 'NEUTRAL';
            let conviction = 50;

            if (primarySetup) {
                biasDirection = primarySetup.direction === 'LONG' ? 'BULLISH' : 'BEARISH';
                conviction = primarySetup.quantScore || 50;
            }

            // Layer 3: Intent vs Manipulation
            // If Obligation contradicts Setup, we might have a Manipulation Phase
            if (obligation) {
                const obligationDir = obligation.type.includes('BUY_SIDE') ? 'BULLISH' : 'BEARISH'; // Buy Side Liq is above -> Bullish Magnet

                if (biasDirection !== 'NEUTRAL' && biasDirection !== obligationDir) {
                    // CONFLICT: Setup says Down, Magnet says Up (or vice versa)
                    // This is likely a "Judas Swing" / Manipulation
                    // We stick to the Obligation (True Intent) but warn of manipulation
                } else if (biasDirection === 'NEUTRAL') {
                    // No setup, but strong magnet -> Pure Intent prediction
                    biasDirection = obligationDir;
                    conviction = obligation.urgency;
                }
            }

            const isBullish = biasDirection === 'BULLISH';
            const globalBias = marketState.mtf?.globalBias || 'NEUTRAL';

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
                downProb = 0.80 - baseProb; // Remainder goes to opposing
            } else {
                downProb = baseProb;
                upProb = 0.80 - baseProb;
            }

            // Ensure Range probability is at least 20%
            rangeProb = 1.0 - (upProb + downProb);

            // ... (News logic follows)

            // News Hazard Adjustment
            if (newsImpact > 0) {
                // ... existing news logic ...
                const newsBias = proximity.event.getDirectionalBias();
                if (newsBias !== 'NEUTRAL') {
                    const isNewsAligned = (newsBias === 'BULLISH' && isBullish) || (newsBias === 'BEARISH' && !isBullish);
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

        // Layer 5: Confidence Calibration (Anti-Overconfidence)
        // Cap probability at 75% to maintain long-term trust
        upProb = Math.min(upProb, 0.75);
        downProb = Math.min(downProb, 0.75);

        // Re-normalize range prob
        if (upProb + downProb > 0.85) {
            // If both are high (rare), reduce them proportionally
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
        const expiresAt = Date.now() + (marketState.timeframe === '1H' ? 3600000 : 14400000); // 1h or 4h expiry

        const primary = {
            ...scenarios[0],
            type: scenarios[0].direction.toUpperCase(),
            bias: scenarios[0].direction === 'up' ? 'LONG' : scenarios[0].direction === 'down' ? 'SHORT' : 'NEUTRAL',
            label: isWaiting ? `WAITING: ${waitingCondition}` : `Primary: ${scenarios[0].label}`,
            description: isWaiting ? 'Market is in a waiting state. Execution not recommended.' : `Highest probability path (${(scenarios[0].probability * 100).toFixed(0)}%) based on current ${marketState.phase}.`,
            style: isWaiting ? 'DOTTED' : 'SOLID', // Waiting is always dotted
            isWaiting: isWaiting,
            expiresAt: expiresAt
        };

        const secondary = {
            ...scenarios[1],
            type: scenarios[1].direction.toUpperCase(),
            bias: scenarios[1].direction === 'up' ? 'LONG' : scenarios[1].direction === 'down' ? 'SHORT' : 'NEUTRAL',
            label: `Secondary: ${scenarios[1].label}`, // Renamed from Alternate
            description: `Pivot path if ${scenarios[0].direction} structure fails.`,
            style: 'DASHED'
        };

        // --- Confirmation Logic ---
        primary.isConfirmed = this.checkConfirmation(marketState, primary);
        secondary.isConfirmed = this.checkConfirmation(marketState, secondary);

        // Update styles if not waiting
        if (!isWaiting) {
            primary.style = primary.isConfirmed ? 'SOLID' : 'DASHED'; // Primary Solid if confirmed
            secondary.style = 'DOTTED'; // Secondary always Dotted/Dashed
        }

        return { primary, secondary, alternate: secondary, all: scenarios, isWaiting, waitingCondition };
    }

    /**
     * Detect if market is in a "Waiting" state
     */
    static detectWaitingCondition(marketState, fundamentals) {
        // 1. News Waiting
        if (fundamentals?.proximityAnalysis?.isImminent) {
            return "NEWS PENDING";
        }
        // 2. Low Volatility / Chop
        if (marketState.volatility === 'LOW' && marketState.regime === 'RANGING') {
            return "LOW VOLATILITY";
        }
        // 3. No Setup / Low Confidence
        // Passed via marketState if updated previously, or inferred here
        return null;
    }

    /**
     * Check if a scenario is confirmed by recent price action
     */
    static checkConfirmation(marketState, scenario) {
        if (scenario.bias === 'NEUTRAL') return true;

        const isBullish = scenario.bias === 'LONG';

        // 1. Check for recent retest
        const hasRetest = (marketState.retests || []).some(r =>
            r.direction === (isBullish ? 'BULLISH' : 'BEARISH')
        );

        // 2. Check for recent sweep
        const hasSweep = marketState.liquiditySweep && (
            (isBullish && marketState.liquiditySweep.type === 'BULLISH_SWEEP') ||
            (!isBullish && marketState.liquiditySweep.type === 'BEARISH_SWEEP')
        );

        // 3. Check for structural shift (CHoCH or BOS in alignment)
        // marketState.currentTrend is 'BULLISH'/'BEARISH', scenario.bias is 'LONG'/'SHORT'
        const hasStructure = (marketState.currentTrend === 'BULLISH' && scenario.bias === 'LONG') ||
            (marketState.currentTrend === 'BEARISH' && scenario.bias === 'SHORT');

        // confirmed if we have a retest OR sweep OR strong structure alignment
        return hasRetest || hasSweep || (hasStructure && scenario.probability > 0.7);
    }

    /**
     * Map scenarios to visual path JSON for the frontend
     */
    static getVisualScenarios(scenarios, currentPrice, annotations = [], volProfile = null, setups = [], orderBook = null) {
        const visual = [];
        const primarySetup = setups[0];
        const secondarySetup = setups[1];

        if (scenarios.primary) {
            visual.push({
                id: `scenario_primary_${Date.now()}`,
                type: 'SCENARIO_PATH',
                style: scenarios.primary.style || 'BOLD',
                direction: scenarios.primary.bias,
                points: this.generatePathway(currentPrice, scenarios.primary, annotations, volProfile, primarySetup, orderBook),
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
                points: this.generatePathway(currentPrice, scenarios.alternate, annotations, volProfile, secondarySetup, orderBook),
                label: scenarios.alternate.label,
                probability: scenarios.alternate.probability
            });
        }

        return visual;
    }

    /**
     * Generate multi-point trajectory
     * [Current -> Pullback/Pivot -> Target]
     */
    static generatePathway(currentPrice, scenario, annotations, volProfile, setup, orderBook) {
        const points = [{ price: currentPrice, type: 'START', timeOffset: 0 }];
        const isBullish = scenario.bias === 'LONG';

        // 1. Find Pivot/Pullback point (e.g. Order Block or POC)
        let pivotPrice = null;

        if (scenario.bias !== 'NEUTRAL') {
            // Method A: Use Specific Setup Entry (Most Accurate)
            if (setup && setup.entryZone && setup.direction === scenario.bias) {
                pivotPrice = setup.entryZone.optimal;
            }
            // Method B: Fallback to Confluence/POC/OB
            else {
                // Priority 1: Confluence Zone
                const confluence = annotations.find(a => a.type === 'CONFLUENCE_ZONE');
                if (confluence) {
                    pivotPrice = (confluence.coordinates.top + confluence.coordinates.bottom) / 2;
                }
                // Priority 2: Institutional POC
                else if (volProfile) {
                    // If price is far from POC, expect test of POC
                    if (Math.abs(currentPrice - volProfile.poc) / currentPrice > 0.005) {
                        pivotPrice = volProfile.poc;
                    }
                }
                // Priority 3: Order Block
                else {
                    const ob = annotations.find(a => a.type === 'ORDER_BLOCK' && (isBullish ? a.direction === 'BULLISH' : a.direction === 'BEARISH'));
                    if (ob) pivotPrice = (ob.coordinates.top + ob.coordinates.bottom) / 2;
                }
            }
        }

        if (pivotPrice && ((isBullish && pivotPrice < currentPrice) || (!isBullish && pivotPrice > currentPrice))) {
            points.push({ price: pivotPrice, type: 'PIVOT', label: 'Entry', barsOffset: 5 });
        }


        // 2. Target Point (Refined by Liquidity Attraction in Phase 48)
        let target = setup?.targets?.[0]?.price || (isBullish ? currentPrice * 1.02 : currentPrice * 0.98);

        if (orderBook) {
            const clusters = LiquidityMapService.findClusters(orderBook);
            const relevantWalls = isBullish ? clusters.sellClusters : clusters.buyClusters;
            const biggestWall = relevantWalls.sort((a, b) => b.quantity - a.quantity)[0];

            if (biggestWall) {
                const wallDist = Math.abs(biggestWall.price - currentPrice) / currentPrice;
                if (wallDist < 0.03) { // Gravitate if within 3%
                    target = biggestWall.price;
                }
            }
        }

        points.push({ price: target, type: 'TARGET', label: 'Target', barsOffset: 15 });

        return points;
    }
}
