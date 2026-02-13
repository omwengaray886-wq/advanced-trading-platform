/**
 * Correlation Cluster Engine
 * Detects hidden portfolio risk by clustering assets based on move correlation.
 * Identifies exposure concentrations (e.g., "USD Long Cluster").
 */
export class CorrelationClusterEngine {
    /**
     * Detect clusters in a list of symbols
     * @param {Object} correlations - Map of symbol correlation matrices
     * @returns {Object} - Cluster analysis and risk concentrations
     */
    static detectClusters(correlations) {
        const clusters = [];
        const processed = new Set();
        const symbols = Object.keys(correlations);

        symbols.forEach(s1 => {
            if (processed.has(s1)) return;

            const currentCluster = [s1];
            processed.add(s1);

            symbols.forEach(s2 => {
                if (processed.has(s2)) return;

                const corrValue = correlations[s1][s2] || 0;

                // Institutional Threshold: > 0.75 correlation indicates a "Risk Cluster"
                if (Math.abs(corrValue) > 0.75) {
                    currentCluster.push(s2);
                    processed.add(s2);
                }
            });

            if (currentCluster.length > 1) {
                clusters.push({
                    id: `cluster-${clusters.length}`,
                    assets: currentCluster,
                    dominantFactor: this.determineDominantFactor(currentCluster),
                    riskLevel: this.calculateClusterRisk(currentCluster, correlations)
                });
            }
        });

        return {
            clusters,
            diversificationScore: this.calculateDiversificationScore(clusters, symbols.length),
            globalRiskStatus: this.getGlobalRiskStatus(clusters)
        };
    }

    /**
     * Identify what ties these assets together (e.g., USD, JPY, Tech)
     */
    static determineDominantFactor(assets) {
        if (assets.every(a => a.includes('USD') || a === 'DXY')) return 'USD BASE';
        if (assets.every(a => a.includes('JPY'))) return 'YEN CARRY';
        if (assets.every(a => a.match(/BTC|ETH|SOL/))) return 'CRYPTO BETA';
        if (assets.every(a => a.includes('US10Y') || a.includes('US30Y'))) return 'YIELD SENSITIVE';
        return 'UNCATEGORIZED EXPOSURE';
    }

    static calculateClusterRisk(assets, correlations) {
        // Higher average correlation within cluster = higher risk
        let totalCorr = 0;
        let pairs = 0;

        for (let i = 0; i < assets.length; i++) {
            for (let j = i + 1; j < assets.length; j++) {
                totalCorr += Math.abs(correlations[assets[i]][assets[j]] || 0);
                pairs++;
            }
        }

        const avgCorr = pairs > 0 ? totalCorr / pairs : 0;
        if (avgCorr > 0.9) return 'EXTREME';
        if (avgCorr > 0.8) return 'HIGH';
        return 'MODERATE';
    }

    static calculateDiversificationScore(clusters, totalAssets) {
        if (totalAssets === 0) return 100;

        // Score decreases as more assets are trapped in clusters
        const clusteredAssets = clusters.reduce((acc, c) => acc + c.assets.length, 0);
        const ratio = clusteredAssets / totalAssets;

        return Math.round(100 * (1 - ratio * 0.5));
    }

    static getGlobalRiskStatus(clusters) {
        const extremeCount = clusters.filter(c => c.riskLevel === 'EXTREME').length;
        if (extremeCount > 0) return 'DANGER: CONCENTRATED RISK';
        if (clusters.length > 2) return 'WARNING: OVER-CORRELATED';
        return 'OPTIMIZED';
    }
}
