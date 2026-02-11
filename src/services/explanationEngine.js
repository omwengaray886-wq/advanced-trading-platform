/**
 * Explanation Engine
 * Generates structured explanations with visual-logic binding
 */

import { Explanation } from '../models/Explanation.js';
import { AssetClassAdapter } from '../services/assetClassAdapter.js';

export class ExplanationEngine {
    /**
     * Generate complete explanation from analysis
     * @param {Object} analysis - Analysis orchestrator output
     * @param {string} mode - 'BEGINNER' or 'ADVANCED'
     * @returns {Explanation} - Structured explanation
     */
    generateExplanation(analysis, mode = 'ADVANCED') {
        const explanation = new Explanation(analysis, mode);

        // Get asset-specific context
        const assetContext = AssetClassAdapter.getExplanationContext(analysis.assetClass || 'FOREX');

        // Build Executive Narrative (Phase 68: Synthesis)
        explanation.sections.executiveNarrative = this.buildExecutiveNarrative(analysis, mode);

        // Build explanation sections using the 7-step Zone Mapping Flow (Phase 20)
        explanation.sections.htfBias = this.buildHTFBias(analysis, assetContext, mode);
        explanation.sections.strategicIntent = this.buildStrategicIntent(analysis, mode);
        explanation.sections.newsShock = this.buildNewsShockRationale(analysis, mode);
        explanation.sections.liquidityContext = this.buildLiquidityContext(analysis, mode);
        explanation.sections.divergenceContext = this.buildDivergenceRationale(analysis, mode);
        explanation.sections.activeRoadmap = this.buildActiveRoadmap(analysis, mode);
        explanation.sections.entryLogic = this.buildZoneEntryLogic(analysis, mode);
        explanation.sections.invalidationConditions = this.buildZoneInvalidation(analysis, mode);
        explanation.sections.targets = this.buildZoneTargets(analysis, mode);
        explanation.sections.professionalTruth = this.buildProfessionalTruth(analysis, mode);
        explanation.sections.riskManagement = this.buildRiskManagement(analysis, mode);
        explanation.sections.edgeAnalysis = this.buildEdgeAnalysis(analysis, mode);
        explanation.sections.macroContext = this.buildMacroContext(analysis, mode);
        explanation.sections.portfolioImpact = this.buildPortfolioImpact(analysis, mode);
        explanation.sections.bayesianNarrative = this.buildBayesianNarrative(analysis, mode);
        explanation.sections.selfCritique = this.buildSelfCritique(analysis, mode);

        // ... legacy / supporting sections ...
        explanation.sections.fundamentals = analysis.fundamentals?.summary || 'No major fundamental events detected.';
        explanation.sections.institutionalFactors = this.buildInstitutionalFactors(analysis, mode);

        // Link explanation to setup annotations
        if (analysis.setups && analysis.setups.length > 0) {
            analysis.setups.forEach(setup => {
                if (setup.annotations) {
                    setup.annotations.forEach(annotation => {
                        if (annotation.setLinkedExplanation) {
                            annotation.setLinkedExplanation(explanation.id);
                        }
                    });
                }
            });
        }

        return explanation;
    }

    /**
     * Build Executive Narrative Synthesis (Phase 68)
     */
    buildExecutiveNarrative(analysis, mode = 'ADVANCED') {
        const state = analysis.marketState;
        const trend = state.trend.direction;
        const bias = state.mtf?.globalBias || 'NEUTRAL';
        const setup = analysis.setups?.[0];

        let narrative = `Analysis indicates a **${trend}** institutional flow, currently aligned with the ${bias.toLowerCase()} higher-timeframe structure. `;

        if (state.mtfBiasAligned) {
            narrative += `This creates a **High-Probability Fractal Sync**, meaning both local and higher-timeframe money flows are pushing in the same direction. `;
        } else {
            narrative += `Note that we are trading against the higher-timeframe bias, so we require stricter entry confirmation. `;
        }

        if (state.smtDivergence) {
            narrative += `Smart Money Divergence (SMT) is visible, suggesting institutional accumulation/distribution is active. `;
        }

        if (setup) {
            const confidence = Math.round((setup.directionalConfidence || 0) * 100);
            narrative += `\n\n**Strategy Focus:** We are tracking a **${setup.strategy}** setup with a **${confidence}%** algorithmic confidence score.`;
        }

        return narrative;
    }

    /**
     * Build HTF bias explanation
     */
    buildHTFBias(analysis, assetContext, mode = 'ADVANCED') {
        const trend = analysis.marketState.trend;
        const strength = Math.round(trend.strength * 100);
        const alignment = analysis.marketState.fractalAlignment;

        if (mode === 'BEGINNER') {
            return `The general ${analysis.symbol} direction is ${trend.direction.toLowerCase()}. We consider this a ${strength > 60 ? 'very healthy' : 'steady'} move.`;
        }

        let explanation = `${assetContext}The ${analysis.timeframe} timeframe shows a ${trend.direction.toLowerCase()} bias with ${strength}% trend strength. `;

        if (alignment?.aligned) {
            explanation += `**Fractal Synchronicity detected!** LTF and HTF are aligned in a ${alignment.trend} expansion. ${alignment.rationale} `;
        }

        // Add fundamental context
        if (analysis.fundamentals?.impact?.direction && analysis.fundamentals.impact.direction !== 'NEUTRAL') {
            const fundDir = analysis.fundamentals.impact.direction.toLowerCase();
            const aligned = analysis.fundamentalAlignment;
            explanation += `Fundamentals are ${aligned ? 'aligned' : 'conflicting'}, showing ${fundDir} pressure. `;

            if (!aligned) {
                explanation += '⚠️ Technical-fundamental divergence requires caution.';
            }
        }

        return explanation;
    }

    /**
     * Build regime explanation
     */
    buildRegime(analysis) {
        const vol = analysis.marketState.volatility;
        const volLevel = (typeof vol === 'string' ? vol : vol?.volatilityState?.level) || 'MODERATE';
        return `Market is in a ${analysis.marketState.regime.toLowerCase()} state with ${volLevel.toLowerCase()} volatility.`;
    }

    /**
     * Build strategy rationale with fundamental alignment
     */
    buildStrategyRationale(analysis) {
        if (!analysis.setups || analysis.setups.length === 0) return 'No primary strategy identified.';
        const best = analysis.setups[0];
        const suitability = Math.round(best.suitability * 100);
        let explanation = `**${best.strategy}** selected (${suitability}% market fit). `;

        // Prioritize the new deep technical rationale
        if (best.detailedRationale) {
            explanation += `${best.detailedRationale} `;
        } else if (best.rationale) {
            explanation += `${best.rationale} `;
        }

        explanation += `This setup is aligned with the **${best.institutionalTheme || 'Institutional Flow'}** narrative and optimized for ${analysis.marketState.regime.toLowerCase()} conditions.`;

        // Add fundamental context if not already in rationale
        if (analysis.fundamentals && !explanation.includes('fundamental')) {
            const fundSummary = analysis.fundamentals.summary;
            explanation += ` ${fundSummary}`;
        }

        return explanation;
    }

    /**
     * Build level significance explanation
     */
    buildLevelSignificance(analysis) {
        if (!analysis.setups || analysis.setups.length === 0) return 'Analyzing structural walls...';
        const setup = analysis.setups[0];

        let explanation = `SIGNAL ACTIVE: The price is currently reacting to an institutional level at ${setup.entryZone?.optimal ? setup.entryZone.optimal.toFixed(5) : 'N/A'}. `;
        explanation += `Structural invalidation is placed at ${setup.stopLoss ? setup.stopLoss.toFixed(5) : 'N/A'} (Pivot Wall + ATR buffer). `;

        if (setup.targets && setup.targets.length > 0) {
            setup.targets.forEach((t, i) => {
                explanation += `Target ${i + 1} (${t.label || 'Major Pool'}) at ${t.price ? t.price.toFixed(5) : 'N/A'} is the primary algorithmic attractor for this session. `;
            });
        }

        return explanation;
    }

    /**
     * Build alternative scenario
     */
    buildAlternativeScenario(analysis, mode = 'ADVANCED') {
        if (!analysis.setups || analysis.setups.length < 2) {
            return mode === 'BEGINNER' ? 'No other likely paths at this time.' : 'No clear alternative setups at this time.';
        }

        const alt = analysis.setups[1];
        const suitability = Math.round(alt.suitability * 100);

        if (mode === 'BEGINNER') {
            return `If this doesn't work out, we'll look at the ${alt.strategy} setup next.`;
        }

        return `If current setup fails, consider Setup B: ${alt.strategy} (${suitability}% fit). Market could shift to ${alt.direction.toLowerCase()} momentum.`;
    }

    /**
     * Build strategy selected summary
     */
    buildStrategySelected(analysis, mode = 'ADVANCED') {
        if (!analysis.setups || analysis.setups.length === 0) return 'No primary strategy identified.';
        const best = analysis.setups[0];
        const state = analysis.marketState;

        if (mode === 'BEGINNER') {
            let msg = `We've chosen the ${best.strategy} as our main plan. `;
            if (state.consolidations?.length > 0) msg += "Price is currently in a sideways range, waiting for a breakout. ";
            if (state.retests?.length > 0) msg += "We are seeing the price test a previous level again, which is a good sign for confirmation. ";
            return msg;
        }

        let explanation = `Primary strategy identified: **${best.strategy}**. This setup is optimized for ${state.regime.toLowerCase()} conditions and has been vetted for capital efficiency. `;

        if (state.consolidations?.length > 0) {
            explanation += `System detected **sideways consolidation** (Accumulation), suggesting a high-volatility expansion is imminent. `;
        }

        if (state.retests?.length > 0) {
            const retest = state.retests[0];
            explanation += `Setup is currently confirmed by a **${retest.direction} retest** of the ${retest.zoneType}, validating institutional defense of the level. `;
        }

        return explanation;
    }

    /**
     * Build entry logic (Execution Timing)
     */
    buildEntryLogic(analysis, mode = 'ADVANCED') {
        if (!analysis.setups || analysis.setups.length === 0) return 'No entry logic available.';
        const setup = analysis.setups[0];
        const entryPrice = setup.entryZone?.optimal ? setup.entryZone.optimal.toFixed(4) : 'N/A';

        if (mode === 'BEGINNER') {
            return `**Action:** Monitor price action around **${entryPrice}**. If you see a strong move away from this level in our direction, that's your signal.`;
        }

        return `**Execution Protocol:** Awaiting institutional displacement at **${entryPrice}**. \n1. **Limit Order**: Permissible if price tests the level with low volume.\n2. **Stop Order**: Use if awaiting a breakout confirmation above the zone.\n3. **Confirmation**: Look for 1m/5m structure shift (CHoCH) inside the zone.`;
    }

    /**
     * Build risk management for small accounts
     */
    buildRiskManagement(analysis, mode = 'ADVANCED') {
        if (!analysis.setups || analysis.setups.length === 0) return 'General risk management principles apply.';
        const setup = analysis.setups[0];

        if (mode === 'BEGINNER') {
            const sizeMsg = setup.suggestedSize > 0 ? `Your recommended size for this trade is **${setup.suggestedSize}**. ` : '';
            return `${sizeMsg}Keep your total risk low (**${setup.capitalTag}**). We'll target the first profit level to secure your capital early.`;
        }

        const rr = setup.rr ? setup.rr.toFixed(1) : '2.0';
        return `Setup is tagged as **${setup.capitalTag}**. Risk no more than 1-2% of total equity. Use Target 1 (${rr}:1 R:R) to secure profits early. Avoid moving stops until Target 1 is hit.`;
    }

    /**
     * Build invalidation conditions
     */
    buildInvalidationConditions(analysis, mode = 'ADVANCED') {
        const structuralLevel = analysis.marketState.trend.direction === 'BULLISH' ? 'Swing Low' : 'Swing High';
        const stop = analysis.setups?.[0]?.stopLoss ? analysis.setups[0].stopLoss.toFixed(5) : 'the stop level';

        if (mode === 'BEGINNER') {
            return `If the price goes past ${stop}, we'll close the trade to keep our account safe and wait for a better time.`;
        }

        return `Setup is invalidated if price closes below the projected stop area (${stop}) or if a counter-trend structure shift (${structuralLevel} breach) occurs before entry.`;
    }

    /**
     * Create chat-style explanation from structured sections
     * @param {Explanation} explanation - Explanation object
     * @returns {Array} - Array of chat messages
     */
    toChatFormat(explanation) {
        const messages = [];

        messages.push({ role: 'assistant', section: 'htfBias', content: '📊 **1. Market Context**\n\n' + explanation.sections.htfBias });
        messages.push({ role: 'assistant', section: 'strategicIntent', content: '🏛️ **2. Institutional Intent**\n\n' + explanation.sections.strategicIntent });
        if (explanation.sections.newsShock) {
            messages.push({ role: 'assistant', section: 'newsShock', content: '⚠️ **MACRO SHOCK ALERT**\n\n' + explanation.sections.newsShock });
        }
        if (explanation.sections.liquidityContext) {
            messages.push({ role: 'assistant', section: 'liquidityContext', content: '🌊 **Order Book Depth**\n\n' + explanation.sections.liquidityContext });
        }
        if (explanation.sections.divergenceContext) {
            messages.push({ role: 'assistant', section: 'divergenceContext', content: '⚡ **Institutional Divergence (SMT)**\n\n' + explanation.sections.divergenceContext });
        }
        messages.push({ role: 'assistant', section: 'activeRoadmap', content: '🗺️ **3. Active Roadmap**\n\n' + explanation.sections.activeRoadmap });
        messages.push({ role: 'assistant', section: 'entryLogic', content: '🎯 **4. Entry Confirmation Logic**\n\n' + explanation.sections.entryLogic });
        messages.push({ role: 'assistant', section: 'invalidationConditions', content: '⚠️ **5. Invalidation (The "Idea Kill" Level)**\n\n' + explanation.sections.invalidationConditions });
        messages.push({ role: 'assistant', section: 'targets', content: '🏁 **6. Target Objectives**\n\n' + explanation.sections.targets });

        if (explanation.sections.macroContext) {
            messages.push({ role: 'assistant', section: 'macroContext', content: '🌐 **Macro Context (COT & Correlation)**\n\n' + explanation.sections.macroContext });
        }
        if (explanation.sections.portfolioImpact) {
            messages.push({ role: 'assistant', section: 'portfolioImpact', content: '💼 **Portfolio & Stress Impact**\n\n' + explanation.sections.portfolioImpact });
        }
        if (explanation.sections.bayesianNarrative) {
            messages.push({ role: 'assistant', section: 'bayesianNarrative', content: '📊 **Bayesian Strategy Reliability**\n\n' + explanation.sections.bayesianNarrative });
        }

        messages.push({ role: 'assistant', section: 'professionalTruth', content: '🧠 **7. Professional Truth & Responsibility**\n\n' + explanation.sections.professionalTruth });

        return messages;
    }

    /**
     * Build psychology explanation
     */
    buildPsychology(analysis) {
        const regime = analysis.marketState.regime;

        if (regime === 'TRENDING') {
            return `**Mindset:** "the trend is your friend." Institutions are driving this move. Do not try to fight it by picking a top/bottom. Flow with the smart money.`;
        } else if (regime === 'RANGING') {
            return `**Mindset:** "Buy low, sell high." The market is efficient right now. Avoid trading in the middle of the range where noise is highest. Wait for the extremes.`;
        }
        return `**Mindset:** "Patience pays." The market is deciding its next move. Preserving capital is better than forcing a trade in uncertain conditions.`;
    }

    /**
     * Build trade management explanation
     */
    buildTradeManagement(analysis) {
        const rr = analysis.riskParameters?.targets?.[0]?.riskReward || 2;
        return `Secure 50% of the position at Target 1 (${rr}:1 R:R). Move Stop Loss to break even once price reaches halfway to Target 1. Trailing stops are recommended if momentum continues past Target 2.`;
    }

    /**
     * Build educational insight
     */
    buildEducation(analysis) {
        if (!analysis.setups || analysis.setups.length === 0) return 'Practice sound risk management.';
        const strategyName = analysis.setups[0].strategy;
        if (strategyName.includes('Gartley')) {
            return 'Pro Tip: Gartley patterns require high precision. If the D-point is overshot by more than 0.5%, the Fibonacci symmetry is compromised and the trade should be voided.';
        }
        if (strategyName.includes('Order Block')) {
            return 'Pro Tip: Order blocks are most effective when they coincide with a "Fair Value Gap" or "Imbalance". Look for displacement in the price move.';
        }
        return `Pro Tip: When trading ${strategyName}, always wait for a 1-hour candle close to confirm the entry. Emotional "jump-ins" are the primary cause of retail losses.`;
    }

    /**
     * Get visual description of a zone for AI sync (Phase 21)
     */
    getVisualDescription(zone) {
        if (!zone) return 'the identified zone';

        const type = zone.type.toLowerCase().replace('_zone', '');
        const colorName = zone.allowedDirection === 'LONG' ? 'green' :
            zone.allowedDirection === 'SHORT' ? 'red' : 'blue';

        const icons = {
            'demand_zone': '⬆ (Demand)',
            'supply_zone': '⬇ (Supply)',
            'order_block': '🧱 (Order Block)',
            'fair_value_gap': '⚡ (Fair Value Gap)',
            'liquidity_zone': '👁️ (Liquidity Pool)',
            'confluence_zone': '⭐ (Confluence)'
        };

        const icon = icons[type] || icons[zone.type.toLowerCase()] || 'the';
        return `${colorName} ${type.replace('_', ' ')} zone marked with ${icon}`;
    }

    /**
     * Build Strategic Intent (Step 2 of Mapping)
     */
    buildStrategicIntent(analysis, mode) {
        const setup = analysis.setups?.[0];
        const annotations = setup?.annotations || [];
        const zone = annotations.find(a => a.intent && a.intent !== 'unknown');

        if (!zone) return "Analyzing institutional footprints for strategic accumulation or distribution.";

        const visualRef = this.getVisualDescription(zone);
        return `Identifying **${zone.intent}** signature. Price is currently interacting with the ${visualRef}. Our mapping suggests ${zone.allowedDirection === 'LONG' ? 'buy-side defense' : 'sell-side defense'} is the active institutional theme.`;
    }

    /**
     * Build Active Roadmap (Step 3 of Mapping)
     */
    buildActiveRoadmap(analysis, mode) {
        const scenarios = analysis.marketState.scenarios;
        if (!scenarios?.primary) return "Monitoring price action for displacement.";

        const isConfirmed = scenarios.primary.isConfirmed;
        let roadmap = isConfirmed ?
            `The projected pathway indicates a **${scenarios.primary.label}**. ` :
            `A **${scenarios.primary.label}** is possible, but price must first confirm the breakout. Until then, this path remains **unconfirmed**. `;

        roadmap += `Expect price to respect identified pivot levels while moving toward the expansion objective. This is not a direct move; we anticipate structured liquidity searches.`;

        // Inject News Shock Volatility Warning
        const newsShocks = (analysis.setups?.[0]?.annotations || []).filter(a => a.type === 'NEWS_SHOCK');
        if (newsShocks.some(s => s.isImminent())) {
            roadmap += ` \n\n⚠️ **VOLATILITY WARNING**: Imminent macro data release detected. The volatility corridor (shaded red/orange) suggests structured price action may be disrupted. High-frequency liquidity expansion is expected.`;
        }

        return roadmap;
    }

    /**
     * Build News Shock rationale
     */
    buildNewsShockRationale(analysis, mode) {
        const shockAnno = (analysis.setups?.[0]?.annotations || []).find(a => a.type === 'NEWS_SHOCK');
        if (!shockAnno) return null;

        const timeRemaining = Math.max(0, Math.floor((shockAnno.coordinates.time - Date.now() / 1000) / 60));

        if (shockAnno.isImminent()) {
            return `CRITICAL: **${shockAnno.eventTitle}** release in **${timeRemaining} minutes**. Professional guidance: Reduce exposure or tighten SL. This is a high-magnitude liquidity event that overrides local technical setups.`;
        }

        return `Upcoming fundamental event: **${shockAnno.eventTitle}** (${shockAnno.impact} Impact). Mapping is tracking this as a future liquidity expansion point.`;
    }

    /**
     * Build Liquidity Context (Phase 24)
     */
    buildLiquidityContext(analysis, mode) {
        if (!analysis.liquidityMap || analysis.liquidityMap.length === 0) return null;

        const majorWalls = analysis.liquidityMap.filter(l => l.intensity > 0.85);
        if (majorWalls.length === 0) return "Order book depth is currently distributed. No significant institutional walls detected.";

        const wallStrings = majorWalls.map(w => `**${w.side} Wall** at ${w.price ? w.price.toFixed(2) : 'N/A'}`).join(', ');
        return `Depth analysis has identified major **Institutional Walls** at: ${wallStrings}. These levels represent significant "Liquidity Magnets" and areas of high-interest intent. Price is likely to seek or be defended at these clusters.`;
    }

    /**
     * Build Divergence rationale (Phase 25)
     */
    buildDivergenceRationale(analysis, mode) {
        if (!analysis.divergences || analysis.divergences.length === 0) return null;

        const mainDiv = analysis.divergences[0];
        const type = mainDiv.dir === 'BULLISH' ? 'Accumulation' : 'Distribution';
        const confluence = analysis.smtConfluence || 0;
        const siblings = analysis.divergences.map(d => d.metadata.sibling).join(', ');

        return `**Inter-market Divergence (SMT)** detected! There is a "Cracking of Correlation" between ${analysis.symbol} and **${siblings}** (Basket Confluence: **${confluence}%**). This signals institutional **${type}** at play. When symmetrical assets fail to verify each other's pivots, Smart Money is likely exerting hidden pressure to trap retail traders.`;
    }

    /**
     * Build Entry Logic (Step 4 of Mapping)
     */
    buildZoneEntryLogic(analysis, mode) {
        const setup = analysis.setups?.[0];
        const scenarios = analysis.marketState?.scenarios;
        const annotations = setup?.annotations || [];
        const zone = annotations.find(a => a.entryModels?.length > 0);

        if (!zone) return "Wait for institutional rejection signal.";

        const models = zone.entryModels.join(' OR ');
        const visualRef = this.getVisualDescription(zone);
        const isConfirmed = scenarios?.primary?.isConfirmed;

        const entryOptimal = setup?.entryZone?.optimal ? setup.entryZone.optimal.toFixed(5) : 'n/a';
        let msg = `Execution in the ${visualRef} is allowed **ONLY IF** confirmation occurs at the optimal entry level of **${entryOptimal}**. `;
        if (isConfirmed) {
            msg = `Execution in the ${visualRef} is **NOW VALID** as institutional confirmation has been detected at **${entryOptimal}**. `;
        }

        return msg + `Valid institutional entry models include: **${models}**. Professional discipline requires waiting for the lower-timeframe shift.`;
    }

    /**
     * Build Zone Invalidation (Step 5 of Mapping)
     */
    buildZoneInvalidation(analysis, mode) {
        const setup = analysis.setups?.[0];
        const annotations = setup?.annotations || [];
        const zone = annotations.find(a => a.invalidationRule);
        const stop = setup?.stopLoss ? setup.stopLoss.toFixed(5) : 'unconfirmed level';

        const entryOptimal = setup?.entryZone?.optimal ? setup.entryZone.optimal.toFixed(5) : 'n/a';
        const rule = zone?.invalidationRule || 'structural failure';
        return `This idea is **INVALID** if ${rule} (Projected Level: ${stop}). If price breaches this structural wall, the current institutional thesis is considered "dead" at **${stop}** and we must exit to preserve capital.`;
    }

    /**
     * Build Zone Targets (Step 6 of Mapping)
     */
    buildZoneTargets(analysis, mode) {
        const setup = analysis.setups?.[0];
        if (!setup?.targets || setup.targets.length === 0) return "Targeting nearest liquidity pools.";

        const targets = setup.targets.map(t => `${t.label} at ${t.price ? t.price.toFixed(5) : 'N/A'}`).join(', ');
        return `Logical objectives for this move are the **${targets}**. These represent areas where opposing liquidity is likely concentrated, acting as "magnets" for institutional profit-taking.`;
    }

    /**
     * Build Professional Truth (Step 7 of Mapping)
     */
    buildProfessionalTruth(analysis, mode) {
        const confidence = ((analysis.overallConfidence || 0) * 100).toFixed(0);
        return `**System Confidence: ${confidence}%**\n\nRemember: We deal in probabilities, not certainties. This setup allows you to risk a small amount to potentially gain a much larger amount. If the market invalidates the setup, we accept the small loss as the "cost of doing business" and wait for the next high-probability opportunity.`;
    }

    /**
     * Build Edge Analysis (Phase 51)
     */
    buildEdgeAnalysis(analysis, mode) {
        const pred = analysis.prediction;
        const setup = analysis.setups?.[0];
        if (!pred || pred.bias === 'NO_EDGE') return null;

        let msg = `### 📊 Edge Analysis v2\n`;
        msg += `**Prediction ID:** \`${pred.id}\` (Auditable)\n`;
        msg += `**Edge Score:** \`${pred.edgeScore}/10\` (${pred.edgeLabel})\n\n`;

        // Phase 54: Bayesian Credibility Display
        if (setup?.bayesianStats) {
            const bayes = setup.bayesianStats;
            msg += `**Bayesian Credibility:** \`${bayes.credibility}\` (Prior: ${(bayes.prior * 100).toFixed(0)}%, Posterior: ${(bayes.posterior * 100).toFixed(0)}%)\n`;
            if (bayes.isSuppressed) {
                msg += `⚠️ **Strategy Suppressed** due to recent underperformance.\n`;
            }
            msg += `\n`;
        }

        msg += `**Confidence Breakdown:**\n`;
        pred.confidenceBreakdown.positives.forEach(p => msg += `✅ ${p}\n`);
        pred.confidenceBreakdown.risks.forEach(r => msg += `⚠️ ${r}\n`);

        msg += `\n**Strategic Horizons:**\n`;
        msg += `• Immediate: ${pred.horizons.immediate}\n`;
        msg += `• Session: ${pred.horizons.session}\n`;
        msg += `• HTF: ${pred.horizons.htf}\n`;

        return msg;
    }

    /**
     * Build Self-Critique / Post-Mortem (Phase 51)
     */
    buildSelfCritique(analysis, mode) {
        // In a real system, we'd pull the outcome of the PREVIOUS prediction from PredictionTracker
        // For now, we use current market friction to provide "pre-mortem" caution or "recent fail" context.
        const marketState = analysis.marketState;

        if (marketState.regime === 'RANGING') {
            return `**System Pre-Mortem:** In ranging conditions, "fakeouts" are 40% more likely. The primary failure mode here would be a liquidity sweep of the invalidation level before the actual move expands.`;
        }

        if (analysis.prediction?.bias === 'WAIT_CONFLICT') {
            return `**Logic Consistency Check:** Analysis suspended because HTF (${marketState.mtf?.globalBias}) and LTF (${marketState.trend?.direction}) are currently at war. Consistency requires waiting for synchronization to avoid "chop."`;
        }

        return null;
    }

    /**
     * Build Macro Context (Phase 70)
     */
    buildMacroContext(analysis, mode = 'ADVANCED') {
        const state = analysis.marketState;
        const cot = state.cot;
        const commodityCorr = state.commodityCorr;
        const macroCorr = state.macroCorrelation;

        if (!cot && !commodityCorr && !macroCorr) return null;

        let msg = '';
        if (cot) {
            msg += `**COT Positioning:** High Institutional ${cot.bias} conviction (${cot.reason}). `;
        }

        if (commodityCorr && commodityCorr.score > 0.6) {
            msg += `**Commodity Correlation:** Strong ${commodityCorr.direction} pressure from ${commodityCorr.influencer}. `;
        }

        if (macroCorr && macroCorr.status !== 'NEUTRAL') {
            msg += `**Macro Bias:** ${macroCorr.status} (${macroCorr.bias} focus). `;
        }

        return msg || 'Equilibrium across macro drivers.';
    }

    /**
     * Build Portfolio Impact (Phase 70)
     */
    buildPortfolioImpact(analysis, mode = 'ADVANCED') {
        const stress = analysis.stressMetrics;
        const health = analysis.portfolioHealth;

        if (!stress && !health) return null;

        let msg = '';
        if (stress?.var) {
            msg += `**Portfolio VaR:** ${stress.var.totalVaR ? stress.var.totalVaR.toFixed(2) : 'N/A'} (${stress.var.varPct ? stress.var.varPct.toFixed(1) : '0'}%). `;
        }

        if (health?.isConcentrated) {
            msg += `⚠️ **CONCENTRATION RISK:** ${health.reason}. `;
        }

        if (stress?.shocks?.flashCrash) {
            const shock = stress.shocks.flashCrash;
            msg += `**Stress Test:** In a Flash Crash (-5%), portfolio drawdown estimated at ${shock.estimatedDrawdown ? shock.estimatedDrawdown.toFixed(2) : 'N/A'}. `;
        }

        return msg || 'No significant portfolio-level hazards detected.';
    }

    /**
     * Build Bayesian Narrative (Phase 70)
     */
    buildBayesianNarrative(analysis, mode = 'ADVANCED') {
        const setup = analysis.setups?.[0];
        const bayes = setup?.bayesianStats;

        if (!bayes) return null;

        const reliability = (bayes.posterior ? (bayes.posterior * 100).toFixed(1) : '0.0');
        const prior = (bayes.prior ? (bayes.prior * 100).toFixed(1) : '0.0');
        const shift = (bayes.posterior !== undefined && bayes.prior !== undefined ? ((bayes.posterior - bayes.prior) * 100).toFixed(1) : '0.0');

        let msg = `The **${setup.strategy}** has a **${reliability}%** probability of success in the current ${analysis.marketState.regime} regime. `;
        msg += `Compared to its baseline accuracy of ${prior}%, we see a **${shift > 0 ? '+' : ''}${shift}%** contextual edge shift. `;

        if (bayes.isSuppressed) {
            msg += `⚠️ **ALERT:** Strategy is currently below its optimal performance threshold and is being suppressed in automated execution.`;
        } else if (bayes.credibility === 'PREMIUM') {
            msg += `✅ This is currently a **Premium-Grade** institutional setup.`;
        }

        return msg;
    }

    /**
     * Build Institutional Factors summary
     */
    buildInstitutionalFactors(analysis, mode) {
        const vol = analysis.marketState.volatility;
        const volLevel = (typeof vol === 'string' ? vol : vol?.volatilityState?.level) || 'MODERATE';
        const volume = analysis.marketState.volumeAnalysis?.isInstitutional ? 'High' : 'Normal';
        return `Liquidity state is ${volLevel.toLowerCase()} with ${volume.toLowerCase()} institutional volume participation. Cross-asset correlation is ${analysis.fundamentalAlignment ? 'aligned' : 'shifting'}.`;
    }
}
