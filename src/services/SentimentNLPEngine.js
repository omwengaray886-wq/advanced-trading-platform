/**
 * Sentiment NLP Engine (Alpha Expansion Phase 1)
 * 
 * Performs weighted linguistic analysis on market headlines to detect
 * institutional bias, retail sentiment, and monetary policy signals.
 */
export class SentimentNLPEngine {
    constructor() {
        // High-conviction keywords with weights (-1.0 to 1.0)
        this.weights = {
            // MONETARY POLICY (Hawkish vs Dovish)
            "HIKE": -0.8,
            "TIGHTENING": -0.7,
            "HAWKISH": -0.9,
            "INFLATION": -0.4,
            "SURGE": -0.3,
            "PIVOT": 0.6,
            "CUT": 0.8,
            "EASING": 0.7,
            "DOVISH": 0.9,
            "STIMULUS": 0.6,

            // MARKET PSYCHOLOGY (Panic vs Accumulation)
            "CRASH": -0.9,
            "BLOOD": -0.8,
            "PANIC": -0.7,
            "LIQUIDATED": -0.6,
            "DUMP": -0.7,
            "INFLOW": 0.7,
            "HODL": 0.4,
            "WHALE": 0.6,
            "ACCUMULATION": 0.8,
            "BULLISH": 0.5,

            // REGULATORY & ADOPTION (FUD vs Institutional)
            "ETF": 0.9,
            "ADOPTION": 0.8,
            "INSTITUTIONAL": 0.7,
            "LICENSE": 0.5,
            "LEGAL TENDER": 0.9,
            "SEC": -0.5,
            "BAN": -0.9,
            "INVESTIGATION": -0.6,
            "FUD": -0.4,
            "LAWSUIT": -0.5
        };

        // Entity Importance Multipliers (Who said it?)
        this.entities = {
            "POWELL": 3.0, // Fed Chair - Maximum Impact
            "FED": 2.5,
            "SEC": 2.5,
            "LAGARDE": 2.0, // ECB
            "ELON": 1.5,
            "MUSK": 1.5,
            "BLACKROCK": 2.2,
            "GRAYSCALE": 1.8,
            "BINANCE": 1.5,
            "CZ": 1.2,
            "TREASURY": 2.0,
            "CHINA": 1.8 // Regulatory changes
        };

        // Context Modifiers (Is it a rumor or law?)
        this.contexts = {
            "RUMOR": 0.4, // Reduce impact
            "SOURCE SAYS": 0.5,
            "OFFICIAL": 1.5, // Amplify impact
            "CONFIRMS": 1.3,
            "BREAKING": 1.2,
            "ANALYSIS": 0.3, // Op-ed
            "OPINION": 0.2
        };
    }

    /**
     * Scores a single headline
     * @param {string} title 
     * @returns {Object} { score: number, bias: string, confidence: number }
     */
    scoreHeadline(title) {
        if (!title) return { score: 0, bias: 'NEUTRAL', confidence: 0 };

        const upperTitle = title.toUpperCase();

        // 1. Keyword Scoring
        let totalScore = 0;
        let matchCount = 0;

        Object.keys(this.weights).forEach(keyword => {
            if (upperTitle.includes(keyword)) {
                totalScore += this.weights[keyword];
                matchCount++;
            }
        });

        // 2. Entity Multiplier
        let entityMultiplier = 1.0;
        let detectedEntity = null;
        Object.keys(this.entities).forEach(entity => {
            if (upperTitle.includes(entity)) {
                if (this.entities[entity] > entityMultiplier) {
                    entityMultiplier = this.entities[entity];
                    detectedEntity = entity;
                }
            }
        });

        // 3. Context Modifier
        let contextModifier = 1.0;
        let detectedContext = 'Standard';
        Object.keys(this.contexts).forEach(ctx => {
            if (upperTitle.includes(ctx)) {
                contextModifier = this.contexts[ctx];
                detectedContext = ctx;
            }
        });

        // Calculate Final Score
        const baseScore = matchCount > 0 ? (totalScore / Math.sqrt(matchCount)) : 0;
        // Clamp between -1 and 1, applying multipliers to the magnitude/confidence, not strict cap breach
        let finalScore = baseScore * entityMultiplier * contextModifier;

        // Hard clamp for normalized output
        finalScore = Math.max(-1, Math.min(1, finalScore));

        let detectedBias = 'NEUTRAL';
        if (finalScore >= 0.15) detectedBias = 'BULLISH';
        else if (finalScore <= -0.15) detectedBias = 'BEARISH';

        // Additional context-specific labels
        let specificBias = detectedBias;
        if (upperTitle.match(/FED|FOMC|RATE|PIVOT|POWELL/)) {
            specificBias = finalScore > 0 ? 'DOVISH_PIVOT' : 'HAWKISH_SHOCK';
        } else if (upperTitle.match(/SEC|BAN|LAWSUIT/)) {
            specificBias = 'REGULATORY_FUD';
        } else if (upperTitle.match(/ETF|INSTITUTIONAL|INFLOW/)) {
            specificBias = 'INSTITUTIONAL_ADOPTION';
        }

        return {
            score: parseFloat(finalScore.toFixed(2)),
            bias: detectedBias,
            label: specificBias,
            confidence: Math.min(0.99, (0.4 + (matchCount * 0.1)) * entityMultiplier),
            entity: detectedEntity,
            context: detectedContext
        };
    }

    /**
     * Scores an array of headlines to get a collective bias
     * @param {Array} headlines 
     */
    aggregateSentiment(headlines) {
        if (!headlines || headlines.length === 0) return { score: 0, bias: 'NEUTRAL' };

        const scores = headlines.map(h => this.scoreHeadline(h.title));
        const avgScore = scores.reduce((acc, s) => acc + s.score, 0) / scores.length;

        let collectiveBias = 'NEUTRAL';
        if (avgScore >= 0.15) collectiveBias = 'BULLISH';
        else if (avgScore <= -0.15) collectiveBias = 'BEARISH';

        return {
            score: parseFloat(avgScore.toFixed(2)),
            bias: collectiveBias,
            sampleSize: headlines.length,
            dominantBias: this._getDominantLabel(scores)
        };
    }

    _getDominantLabel(scores) {
        const counts = {};
        scores.forEach(s => {
            counts[s.label] = (counts[s.label] || 0) + 1;
        });
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'NEUTRAL');
    }
}

export const sentimentNLPEngine = new SentimentNLPEngine();
