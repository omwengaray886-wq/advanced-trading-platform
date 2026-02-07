/**
 * Zone Mapper Service
 * Codifies institutional intent and trading rules for diverse zone types.
 */
export class ZoneMapper {
    /**
     * Map a raw zone to a rich institutional object
     * @param {Object} zone - The raw annotation/zone object
     * @param {Object} marketContext - Current market state (bias, equilibrium etc)
     * @returns {Object} - Enriched zone properties
     */
    static mapZone(zone, marketContext) {
        const type = zone.type.toUpperCase();
        const mapping = {
            intent: 'Neutral',
            allowedDirection: 'BOTH',
            entryModels: [],
            invalidationRule: 'Structural Break',
            targets: []
        };

        switch (type) {
            case 'DEMAND_ZONE':
            case 'VALUE_AREA_LOW':
                mapping.intent = 'Accumulation / Buy-side Defense';
                mapping.allowedDirection = 'LONG';
                mapping.entryModels = ['LTF CHoCH', 'Liquidity Sweep', 'Partial FVG Fill'];
                mapping.invalidationRule = 'Close below zone low';
                mapping.targets = ['Nearest Liquidity Highs', 'Opposing Supply'];
                break;

            case 'SUPPLY_DEMAND_ZONE':
                if (zone.metadata?.side === 'DEMAND') {
                    mapping.intent = 'Accumulation';
                    mapping.allowedDirection = 'LONG';
                    mapping.entryModels = ['LTF CHoCH'];
                    mapping.invalidationRule = 'Break of zone low';
                } else {
                    mapping.intent = 'Distribution';
                    mapping.allowedDirection = 'SHORT';
                    mapping.entryModels = ['LTF Bearish CHoCH'];
                    mapping.invalidationRule = 'Break of zone high';
                }
                break;

            case 'SUPPLY_ZONE':
            case 'VALUE_AREA_HIGH':
                mapping.intent = 'Distribution / Sell-side Defense';
                mapping.allowedDirection = 'SHORT';
                mapping.entryModels = ['LTF Bearish CHoCH', 'Liquidity Sweep', 'FVG Rejection'];
                mapping.invalidationRule = 'Close above zone high';
                mapping.targets = ['Nearest Liquidity Lows', 'Opposing Demand'];
                break;

            case 'ORDER_BLOCK':
                const isBullish = zone.metadata?.direction === 'BULLISH';
                mapping.intent = isBullish ? 'Institutional Accumulation' : 'Institutional Distribution';
                mapping.allowedDirection = isBullish ? 'LONG' : 'SHORT';
                mapping.entryModels = ['Direct Tap + LTF confirmation'];
                mapping.invalidationRule = isBullish ? 'Close below OB low' : 'Close above OB high';
                break;

            case 'FAIR_VALUE_GAP':
                const isBullishGap = zone.metadata?.direction === 'BULLISH';
                mapping.intent = isBullishGap ? 'Liquidity Attraction (Bullish)' : 'Liquidity Attraction (Bearish)';
                mapping.allowedDirection = isBullishGap ? 'LONG' : 'SHORT';
                mapping.entryModels = ['50% (Equilibrium) Fill', 'Touch of Consequent Encroachment'];
                mapping.invalidationRule = isBullishGap ? 'Full fill and close below' : 'Full fill and close above';
                break;

            case 'LIQUIDITY_ZONE':
                mapping.intent = 'Target Liquidity / Stop Hunt Area';
                mapping.allowedDirection = 'NEUTRAL'; // Liquidity are targets, not entries directly
                mapping.entryModels = ['Reversal after Sweep + CHoCH'];
                mapping.targets = ['Next Liquidity Pool'];
                break;

            case 'PREMIUM_DISCOUNT_ZONE':
                const isDiscount = zone.metadata?.isDiscount;
                mapping.intent = isDiscount ? 'Bullish Discount Area' : 'Bearish Premium Area';
                mapping.allowedDirection = isDiscount ? 'LONG' : 'SHORT';
                mapping.invalidationRule = 'Shift in equilibrium';
                break;
        }

        // Apply Premium/Discount Overrides
        if (marketContext.priceLocation === 'PREMIUM' && mapping.allowedDirection === 'LONG') {
            mapping.allowedDirection = 'NONE'; // Professional rule: No buys in Premium
        }
        if (marketContext.priceLocation === 'DISCOUNT' && mapping.allowedDirection === 'SHORT') {
            mapping.allowedDirection = 'NONE'; // Professional rule: No sells in Discount
        }

        // DYNAMIC ROLE REINTERPRETATION (Phase 40)
        this.assignDynamicRole(mapping, zone, marketContext.currentPrice);

        return mapping;
    }

    /**
     * Phase 40: Zone Role Reinterpretation Engine
     * Dynamically updates zone intent based on live price action.
     */
    static assignDynamicRole(mapping, zone, currentPrice) {
        const { top, bottom } = zone.coordinates;
        const isDemand = mapping.allowedDirection === 'LONG';

        // Default Role
        mapping.role = 'NEUTRAL';

        if (zone.state === 'BROKEN_FLIPPED') {
            mapping.role = 'INVALIDATION_FLIP';
            mapping.intent = isDemand ? 'Flipped to Resistance' : 'Flipped to Support';
            mapping.allowedDirection = isDemand ? 'SHORT' : 'LONG';
            return;
        }

        if (zone.state === 'FULLY_MITIGATED') {
            mapping.role = 'EXHAUSTED';
            mapping.intent = 'Likely to break';
            return;
        }

        // Demand Logic
        if (mapping.allowedDirection === 'LONG') {
            if (currentPrice > top) {
                mapping.role = 'DEFENSE'; // Support below price
            } else if (currentPrice < bottom) {
                mapping.role = 'BREAKTHROUGH'; // Price lost the level
                mapping.allowedDirection = 'NONE'; // Don't buy a lost level (unless flipped)
            } else {
                mapping.role = 'REACTION'; // Inside zone
            }
        }
        // Supply Logic
        else if (mapping.allowedDirection === 'SHORT') {
            if (currentPrice < bottom) {
                mapping.role = 'DEFENSE'; // Resistance above price
            } else if (currentPrice > top) {
                mapping.role = 'BREAKTHROUGH'; // Price conquered the level
                mapping.allowedDirection = 'NONE';
            } else {
                mapping.role = 'REACTION';
            }
        }
    }
}
