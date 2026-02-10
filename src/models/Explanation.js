/**
 * Explanation Model
 * Structured explanation linked to chart annotations
 */
export class Explanation {
    constructor(analysis = {}, mode = 'ADVANCED') {
        this.id = this.generateId();
        this.timestamp = Date.now();
        this.mode = mode;
        this.sections = this.buildSections(analysis);
        this.linkedAnnotations = this.extractAnnotationIds(analysis.annotations || []);
        this.confidence = analysis.overallConfidence || 0.5;
    }

    generateId() {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `EXP-${timestamp}-${random}`;
    }

    buildSections(analysis) {
        // Initialize empty sections - ExplanationEngine will populate these
        return {
            executiveNarrative: '',
            htfBias: '',
            regime: '',
            strategyRationale: '',
            levelSignificance: '',
            entryReasoning: '',
            riskLogic: '',
            alternativeScenario: '',
            whyLongExists: '',
            whyShortExists: '',
            entryLogic: '',
            riskManagement: '',
            invalidationConditions: '',
            alternativeScenarios: '',
            fundamentals: '',
            institutionalFactors: '',
            macroContext: '',
            portfolioImpact: '',
            bayesianNarrative: ''
        };
    }

    buildHTFBias(marketState) {
        const trend = marketState.trend.direction;
        const strength = marketState.trend.strength;
        const strengthPct = (strength * 100).toFixed(0);

        if (this.mode === 'BEGINNER') {
            return `The general market direction is ${trend.toLowerCase()}. ` +
                `This is a ${strength > 0.6 ? 'strong' : 'developing'} move. ` +
                `We prefer looking for trades that go with this ${trend.toLowerCase()} flow.`;
        }

        return `The market is currently ${trend.toLowerCase()} with ${strength > 0.7 ? 'strong' : strength > 0.5 ? 'moderate' : 'weak'
            } momentum. Current trend strength: ${strengthPct}%.`;
    }

    buildRegimeExplanation(marketState) {
        const regime = marketState.regime;
        const volatility = marketState.volatility;
        const volLevel = (typeof volatility === 'string' ? volatility : volatility?.volatilityState?.level) || 'MODERATE';

        if (this.mode === 'BEGINNER') {
            return `The market is currently ${regime === 'TRENDING' ? 'moving smoothly' : 'bouncing around'}. ` +
                `It is ${(volLevel === 'HIGH' || volLevel === 'EXTREME') ? 'very jumpy right now' : 'relatively calm'}.`;
        }

        return `Price is in a ${regime.toLowerCase()} regime with ${volLevel.toLowerCase()} volatility. ` +
            `This condition suggests ${this.getRegimeImplication(regime)}.`;
    }

    getRegimeImplication(regime) {
        switch (regime) {
            case 'TRENDING':
                return 'directional price movement with pullback opportunities';
            case 'RANGING':
                return 'mean-reversion strategies at range boundaries';
            case 'TRANSITIONAL':
                return 'potential trend change or breakout setup';
            default:
                return 'unclear market direction';
        }
    }

    buildStrategyRationale(analysis) {
        const strategy = analysis.selectedStrategy || { name: 'Unknown', suitability: 0, description: 'No strategy description available.' };
        const suitability = ((strategy.suitability || 0) * 100).toFixed(0);

        return `${strategy.name} selected (${suitability}% market fit). ` +
            `${strategy.description || ''}. ` +
            this.buildAlternatives(analysis.alternativeStrategies || []);
    }

    buildAlternatives(alternatives) {
        if (alternatives.length === 0) return '';

        const topAlt = alternatives[0];
        return `Alternative: ${topAlt.name} (${(topAlt.suitability * 100).toFixed(0)}%)`;
    }

    buildLevelSignificance(analysis) {
        const entryZone = analysis.annotations.find(a => a.type === 'ENTRY_ZONE');
        const demandZone = analysis.annotations.find(a =>
            a.type === 'SUPPLY_DEMAND_ZONE' && a.zoneType === 'DEMAND'
        );
        const supplyZone = analysis.annotations.find(a =>
            a.type === 'SUPPLY_DEMAND_ZONE' && a.zoneType === 'SUPPLY'
        );

        if (demandZone) {
            return `Entry zone at ${entryZone?.coordinates.bottom.toFixed(5)} - ${entryZone?.coordinates.top.toFixed(5)} ` +
                `represents a previous ${demandZone.fresh ? 'untested' : 'validated'} demand area ` +
                `where institutional buyers previously accumulated positions.`;
        }

        if (supplyZone) {
            return `Entry zone represents a ${supplyZone.fresh ? 'fresh' : 'tested'} supply area ` +
                `where selling pressure previously emerged.`;
        }

        return 'Entry zone identified at key structural level.';
    }

    buildAlternativeScenario(analysis) {
        const direction = analysis.marketState?.trend?.direction || 'NEUTRAL';
        const stopLoss = analysis.riskParameters?.stopLoss;

        if (!stopLoss) return 'Maintain standard risk management protocols.';

        return `If price breaks ${direction === 'BULLISH' ? 'below' : 'above'} ${stopLoss.toFixed(5)}, ` +
            `the setup is invalidated and we expect ${direction === 'BULLISH' ? 'bearish' : 'bullish'} continuation. ` +
            `Monitor for re-entry opportunities after structure confirmation.`;
    }

    extractAnnotationIds(annotations) {
        return annotations.map(a => a.id);
    }

    toJSON() {
        return {
            id: this.id,
            timestamp: this.timestamp,
            mode: this.mode,
            sections: this.sections,
            linkedAnnotations: this.linkedAnnotations,
            confidence: this.confidence
        };
    }
}
