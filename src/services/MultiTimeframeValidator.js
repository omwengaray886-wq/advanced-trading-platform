/**
 * Multi-Timeframe Validator
 * Validates trade setups across multiple timeframes and calculates confluence scores
 */

import { newsShockEngine } from './newsShockEngine.js';
import { EdgeScoringEngine } from './EdgeScoringEngine.js';
import { TradeManagementEngine } from './TradeManagementEngine.js';

class MultiTimeframeValidator {
    /**
     * Validate a setup across multiple timeframe analyses
     * @param {Array} timeframeResults - Array of {tf, analysis} objects
     * @returns {Promise<Object|null>} Validated signal or null
     */
    static async validate(timeframeResults) {
        if (!timeframeResults || timeframeResults.length === 0) {
            return null;
        }

        const symbol = timeframeResults[0].analysis?.symbol;
        if (!symbol) return null;

        // Filter out timeframes without setups or analysis
        const validResults = timeframeResults.filter(r =>
            r.analysis?.setups && r.analysis.setups.length > 0
        );

        // Institutional Requirement: Need at least 4 TFs for global signal (Higher conviction)
        if (validResults.length < 4) {
            return null;
        }

        // Determine HTF Bias (4H, 1D)
        const htfAnalyses = validResults.filter(r => ['4h', 'd', '1d', 'w', '1w'].includes(r.tf.toLowerCase()));
        let globalBias = 'NEUTRAL';

        if (htfAnalyses.length > 0) {
            const highConfidenceHTF = htfAnalyses.find(r => r.analysis.probabilities?.bias !== 'NEUTRAL');
            globalBias = highConfidenceHTF?.analysis.probabilities?.bias || 'NEUTRAL';
        }

        // Group setups by direction
        const longTFs = validResults.filter(r => r.analysis.setups.some(s => s.direction === 'LONG'));
        const shortTFs = validResults.filter(r => r.analysis.setups.some(s => s.direction === 'SHORT'));

        // Directional Consensus enforcing HTF Alignment
        let dominantDirection = null;
        let relevantSetups = [];

        if (longTFs.length >= 4 && (globalBias === 'LONG' || globalBias === 'NEUTRAL')) {
            dominantDirection = 'LONG';
            relevantSetups = longTFs;
        } else if (shortTFs.length >= 4 && (globalBias === 'SHORT' || globalBias === 'NEUTRAL')) {
            dominantDirection = 'SHORT';
            relevantSetups = shortTFs;
        } else {
            return null; // Failed directional consensus or HTF conflict
        }

        // Calculate Advanced confluence score
        const confluence = this.calculateAdvancedConfluence(relevantSetups, dominantDirection, symbol);

        // Apply News Shock Penalty
        const shock = await newsShockEngine.getActiveShock(symbol);
        if (shock) {
            const penalty = shock.severity === 'HIGH' ? 40 : 20;
            confluence.score -= penalty;
            confluence.breakdown.push(`[NEWS HAZARD] -${penalty} pts: ${shock.message}`);
        }

        // Premium Threshold: 75% for Global Channel
        if (confluence.score < 75) {
            return null;
        }

        // Build the institutional grade signal
        return this.buildInstitutionalSignal(relevantSetups, dominantDirection, confluence);
    }

    /**
     * Advanced Confluence Scoring (Phase 53 + Phase 2 Enhancement)
     */
    static calculateAdvancedConfluence(setups, direction, symbol) {
        let score = 0;
        const breakdown = [];
        const confirmedTFs = setups.map(s => s.tf);

        // 1. Timeframe Density (25 pts) - Reduced to make room for weighted scoring
        const count = setups.length;
        if (count >= 8) { score += 25; breakdown.push(`Absolute Consensus (${count} TFs)`); }
        else if (count >= 6) { score += 18; breakdown.push(`Strong Consensus (${count} TFs)`); }
        else { score += 10; breakdown.push(`Standard Consensus (${count} TFs)`); }

        // 2. PHASE 2 NEW: Weighted Timeframe Scoring (25 pts)
        // Higher timeframes get more weight: Weekly=5, Daily=4, 4H=3, 1H=2, 15M=1
        const timeframeWeights = {
            '1w': 5, 'w': 5,
            '1d': 4, 'd': 4,
            '4h': 3, '4H': 3,
            '1h': 2, 'h': 2,
            '15m': 1, '15M': 1, '5m': 1, '5M': 1, '1m': 1
        };

        let weightedSum = 0;
        let maxPossibleWeight = 0;

        setups.forEach(s => {
            const weight = timeframeWeights[s.tf] || 1;
            const setup = s.analysis.setups.find(st => st.direction === direction);
            const isAligned = setup && setup.direction === direction;

            if (isAligned) {
                weightedSum += weight;
            }
            maxPossibleWeight += weight;
        });

        const weightedScore = (weightedSum / maxPossibleWeight) * 25;
        score += weightedScore;
        breakdown.push(`Weighted TF Score: +${weightedScore.toFixed(1)} pts (HTFs prioritized)`);

        // 3. PHASE 2 NEW: Divergence Detection & Penalty (-30 pts)
        // Detect HTF/LTF conflicts
        const htfSetups = setups.filter(s => ['1w', 'w', '1d', 'd', '4h', '4H'].includes(s.tf));
        const ltfSetups = setups.filter(s => ['1h', 'h', '15m', '15M', '5m', '5M', '1m'].includes(s.tf));

        if (htfSetups.length > 0 && ltfSetups.length > 0) {
            // Get HTF dominant direction
            const htfLong = htfSetups.filter(s => s.analysis.setups.some(st => st.direction === 'LONG')).length;
            const htfShort = htfSetups.filter(s => s.analysis.setups.some(st => st.direction === 'SHORT')).length;
            const htfBias = htfLong > htfShort ? 'LONG' : (htfShort > htfLong ? 'SHORT' : 'NEUTRAL');

            // Get LTF dominant direction
            const ltfLong = ltfSetups.filter(s => s.analysis.setups.some(st => st.direction === 'LONG')).length;
            const ltfShort = ltfSetups.filter(s => s.analysis.setups.some(st => st.direction === 'SHORT')).length;
            const ltfBias = ltfLong > ltfShort ? 'LONG' : (ltfShort > ltfLong ? 'SHORT' : 'NEUTRAL');

            if (htfBias !== 'NEUTRAL' && ltfBias !== 'NEUTRAL' && htfBias !== ltfBias) {
                score -= 30;
                breakdown.push(`⚠️ HTF/LTF DIVERGENCE: HTF ${htfBias} vs LTF ${ltfBias} (-30 pts)`);
            } else if (htfBias === direction && ltfBias === direction) {
                score += 10;
                breakdown.push(`✅ Perfect HTF/LTF Alignment (+10 pts)`);
            }
        }

        // 4. POI Cluster Alignment (25 pts)
        const clusterBonus = this.calculatePOIConfluence(setups, direction);
        if (clusterBonus > 0) {
            score += clusterBonus;
            breakdown.push(`Institutional POI Cluster Alignment (+${clusterBonus} pts)`);
        } else {
            score -= 10;
            breakdown.push('Lack of price-level POI convergence (-10 pts)');
        }

        // 5. Alpha-Weighted Scoring (15 pts) - Reduced from 20 to balance
        // Average the Edge scores of all confirming TFs
        const avgEdge = setups.reduce((sum, s) => {
            const setup = s.analysis.setups.find(st => st.direction === direction);
            return sum + (setup?.edgeScore || 0);
        }, 0) / setups.length;

        if (avgEdge >= 8.0) { score += 15; breakdown.push('Premium Edge Alpha'); }
        else if (avgEdge >= 6.5) { score += 8; breakdown.push('Standard Edge Alpha'); }

        // 6. Institutional Footprint (10 pts) - Reduced from 20 to balance
        const institutionalTFs = setups.filter(s =>
            s.analysis.marketState?.volumeAnalysis?.isInstitutional ||
            s.analysis.marketState?.smtConfluence > 70
        );
        if (institutionalTFs.length >= setups.length * 0.7) {
            score += 10;
            breakdown.push('Deep Institutional Footprint');
        } else if (institutionalTFs.length >= setups.length * 0.4) {
            score += 5;
            breakdown.push('Moderate Institutional Footprint');
        }

        return {
            score: Math.min(100, Math.max(0, score)),
            breakdown,
            confirmedTimeframes: confirmedTFs,
            avgEdge
        };
    }

    /**
     * Calculate price-level POI convergence
     */
    static calculatePOIConfluence(setups, direction) {
        const zones = setups.map(s => {
            const setup = s.analysis.setups.find(st => st.direction === direction);
            return setup?.entryZone || { optimal: setup?.entry };
        }).filter(z => z && z.optimal);

        if (zones.length < 2) return 0;

        // Check for overlaps within 0.5% radius (Institutional Sensitivity)
        let clusterMax = 0;
        for (let i = 0; i < zones.length; i++) {
            let matches = 0;
            for (let j = 0; j < zones.length; j++) {
                const diff = Math.abs(zones[i].optimal - zones[j].optimal) / zones[i].optimal;
                if (diff < 0.005) matches++;
            }
            clusterMax = Math.max(clusterMax, matches);
        }

        const ratio = clusterMax / setups.length;
        if (ratio >= 0.8) return 30;
        if (ratio >= 0.5) return 20;
        if (ratio >= 0.3) return 10;
        return 0;
    }

    /**
     * Build Institutional Grade Signal
     */
    static buildInstitutionalSignal(setups, direction, confluence) {
        // Use HTF or highest scoring setup as base
        const sortedSetups = [...setups].sort((a, b) => {
            const scoreA = a.analysis.setups.find(s => s.direction === direction)?.edgeScore || 0;
            const scoreB = b.analysis.setups.find(s => s.direction === direction)?.edgeScore || 0;
            return scoreB - scoreA;
        });

        const bestResult = sortedSetups[0];
        const setup = bestResult.analysis.setups.find(s => s.direction === direction);

        return {
            symbol: bestResult.analysis.symbol,
            direction,
            entry: setup.entryZone?.optimal || setup.entry,
            targets: setup.targets || [],
            stop: setup.stop,
            rr: setup.rr,

            // Confluence Data
            confluenceScore: confluence.score,
            confluenceBreakdown: confluence.breakdown,
            confirmedTimeframes: confluence.confirmedTimeframes,
            avgEdgeAlpha: confluence.avgEdge,

            // Context
            strategy: setup.strategy?.name || 'Institutional Alignment',
            explanation: setup.explanation,
            publishedAt: Date.now(),
            expiresAt: Date.now() + (12 * 60 * 60 * 1000), // 12h for global signals
            status: 'ACTIVE',
            isInstitutionalGrade: true
        };
    }

    static shouldInvalidate(signal, currentPrice) {
        if (!signal || !currentPrice) return false;
        if (signal.direction === 'LONG' && currentPrice <= signal.stop) return true;
        if (signal.direction === 'SHORT' && currentPrice >= signal.stop) return true;
        return Date.now() > signal.expiresAt;
    }

    static updateSignalStatus(signal, currentPrice, candles) {
        // 1. Check Hard Invalidation
        if (this.shouldInvalidate(signal, currentPrice)) {
            signal.status = (currentPrice <= signal.stop || currentPrice >= signal.stop) ? 'STOPPED_OUT' : 'EXPIRED';
            return signal;
        }

        // 2. Check targets
        if (signal.targets && signal.targets.length > 0) {
            const hitTargets = signal.targets.filter(t =>
                signal.direction === 'LONG' ? currentPrice >= t : currentPrice <= t
            );
            if (hitTargets.length > 0) {
                signal.status = `HIT_TP${hitTargets.length}`;
            }
        }

        // 3. Dynamic Trade Management (Trailing Stops & Partial TP)
        if (candles && candles.length > 20) {
            // A. Trailing Stop Calculation
            // We use the TIGHTER of the current trailing stop or the new calculated one
            // But never loosen it.
            const currentTrailing = signal.trailingStop || signal.stop;
            const advice = TradeManagementEngine.getTrailingStopAdvice(candles, signal.direction, currentTrailing);

            if (advice && advice.shouldUpdate) {
                // Ensure we are locking in profit (moving in favor)
                const isImprovement = signal.direction === 'LONG'
                    ? advice.price > currentTrailing
                    : advice.price < currentTrailing;

                if (isImprovement) {
                    signal.trailingStop = advice.price;
                    const priceStr = advice.price ? advice.price.toFixed(pricePrecision(signal.symbol)) : 'N/A';
                    const log = `[TRAIL] Moved Stop to ${priceStr} (${advice.type})`;
                    signal.managementUpdates = signal.managementUpdates ? [...signal.managementUpdates, log] : [log];
                }
            }

            // B. Partial Take Profit Check
            const partialTP = TradeManagementEngine.checkPartialTP(candles, signal.direction, signal.entry);
            if (partialTP && partialTP.trigger) {
                // Determine if we already took this action to avoid spamming
                const lastUpdate = signal.managementUpdates ? signal.managementUpdates[signal.managementUpdates.length - 1] : '';
                if (!lastUpdate.includes('Partial TP')) {
                    const log = `[ALERT] ${partialTP.reason}: ${partialTP.recommendation}`;
                    signal.managementUpdates = signal.managementUpdates ? [...signal.managementUpdates, log] : [log];
                }
            }
        }

        return signal;
    }

    static pricePrecision(symbol) {
        return symbol.includes('JPY') ? 2 : 4; // Simple heuristic, ideally from asset adapter
    }
}

// Helper for precision (temporary)
function pricePrecision(symbol) {
    return symbol && symbol.includes('JPY') ? 2 : 4;
}

export default MultiTimeframeValidator;
