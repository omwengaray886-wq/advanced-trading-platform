/**
 * Volume Profile Analyzer
 * Calculates price-based volume distribution (VPVR).
 */
export class VolumeProfileAnalyzer {
    /**
     * Calculate Volume Profile
     * @param {Array} candles - Candle data
     * @param {number} rowCount - Number of price buckets (default: 40)
     * @returns {Object} - Profile data with POC, VAH, VAL, and buckets
     */
    static calculateProfile(candles, rowCount = 40) {
        if (!candles || candles.length === 0) return null;

        const prices = candles.flatMap(c => [c.high, c.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice;
        const step = range / rowCount;

        if (step === 0) return null;

        // Initialize buckets
        const buckets = [];
        for (let i = 0; i < rowCount; i++) {
            const low = minPrice + (i * step);
            const high = low + step;
            buckets.push({
                low,
                high,
                center: (low + high) / 2,
                volume: 0,
                upVolume: 0,
                downVolume: 0
            });
        }

        // Allocate candle volume to buckets with exponential time decay
        const totalCandles = candles.length;
        candles.forEach((candle, index) => {
            const isUp = candle.close >= candle.open;

            // Time decay: More recent candles (higher index) have more weight
            // Weight ranges from 0.5 (oldest) to 1.0 (newest)
            const timeWeight = 0.5 + (0.5 * (index / totalCandles));
            const candleVolume = (candle.volume || 0) * timeWeight;

            // Distribute volume across buckets hit by this candle
            const startIndex = Math.max(0, Math.floor((candle.low - minPrice) / step));
            const endIndex = Math.min(rowCount - 1, Math.floor((candle.high - minPrice) / step));

            const bucketCount = (endIndex - startIndex) + 1;
            const volPerBucket = candleVolume / bucketCount;

            for (let i = startIndex; i <= endIndex; i++) {
                buckets[i].volume += volPerBucket;
                if (isUp) buckets[i].upVolume += volPerBucket;
                else buckets[i].downVolume += volPerBucket;
            }
        });

        // Find Point of Control (POC)
        let maxVol = 0;
        let pocIndex = 0;
        let totalVolume = 0;

        buckets.forEach((b, i) => {
            totalVolume += b.volume;
            if (b.volume > maxVol) {
                maxVol = b.volume;
                pocIndex = i;
            }
        });

        const pocBucket = buckets[pocIndex];

        // Calculate Value Area (70% of total volume starting from POC)
        const targetVolume = totalVolume * 0.70;
        let currentVolume = maxVol;
        let lowIndex = pocIndex;
        let highIndex = pocIndex;

        while (currentVolume < targetVolume && (lowIndex > 0 || highIndex < rowCount - 1)) {
            const nextLowVol = lowIndex > 0 ? buckets[lowIndex - 1].volume : 0;
            const nextHighVol = highIndex < rowCount - 1 ? buckets[highIndex + 1].volume : 0;

            if (nextLowVol > nextHighVol || highIndex === rowCount - 1) {
                lowIndex--;
                currentVolume += nextLowVol;
            } else {
                highIndex++;
                currentVolume += nextHighVol;
            }
        }

        const vah = buckets[highIndex].high;
        const val = buckets[lowIndex].low;

        // Peak / Valley Detection (High/Low Volume Nodes)
        const nodes = this.detectNodes(buckets);

        return {
            poc: pocBucket.center,
            vah,
            val,
            totalVolume,
            buckets: buckets.map(b => ({
                ...b,
                relVol: b.volume / maxVol // For rendering scaling
            })),
            hvns: nodes.hvns,
            lvns: nodes.lvns
        };
    }

    /**
     * Calculate Session Volume Profiles (SVP)
     * Splits candles by day (UTC) and calculates a profile for each session.
     * @param {Array} candles - Array of candles
     * @returns {Array} - Array of session profiles with VAH, VAL, POC
     */
    static calculateSessionProfiles(candles) {
        if (!candles || candles.length === 0) return [];

        const sessions = {};

        // 1. Group candles by Day
        candles.forEach(c => {
            const date = new Date(c.time * 1000).toISOString().split('T')[0];
            if (!sessions[date]) sessions[date] = [];
            sessions[date].push(c);
        });

        const profiles = [];

        // 2. Calculate Profile for each session
        Object.keys(sessions).sort().forEach(date => {
            const sessionCandles = sessions[date];
            const profile = this.calculateProfile(sessionCandles);

            if (profile) {
                profiles.push({
                    date,
                    ...profile
                });
            }
        });

        // 3. Identify Naked POCs (backward looking)
        // We do this after collecting all profiles
        this.identifyNakedLevels(profiles);

        return profiles;
    }

    /**
     * Identify Naked POCs and un-retested levels
     * @param {Array} profiles - List of calculated session profiles with .buckets
     */
    static identifyNakedLevels(profiles) {
        for (let i = 0; i < profiles.length - 1; i++) {
            const profile = profiles[i];
            const pocPrice = profile.poc;
            let isNaked = true;

            // Check all subsequent sessions to see if they traded through this level
            for (let j = i + 1; j < profiles.length; j++) {
                const futureProfile = profiles[j];

                // Use session range for overlap check
                if (futureProfile.buckets && futureProfile.buckets.length > 0) {
                    const sessionLow = futureProfile.buckets[0].low;
                    const sessionHigh = futureProfile.buckets[futureProfile.buckets.length - 1].high;

                    // STRICT Overlap: If the future session's Low <= POC <= High, it is tested.
                    if (pocPrice >= sessionLow && pocPrice <= sessionHigh) {
                        isNaked = false;
                        break;
                    }
                }
            }
            profile.isNaked = isNaked;
        }
        // The last session is always "Naked" until the next one forms
        if (profiles.length > 0) {
            profiles[profiles.length - 1].isNaked = true;
        }
    }

    /**
     * Helper to find Naked POCs efficiently
     */
    static findNakedPOCs(profiles) {
        return profiles.filter(p => p.isNaked).map(p => ({
            price: p.poc,
            date: p.date,
            type: 'nPOC',
            label: `nPOC (${p.date})`
        }));
    }

    /**
     * Detect High and Low Volume Nodes
     */
    static detectNodes(buckets) {
        const hvns = [];
        const lvns = [];

        for (let i = 2; i < buckets.length - 2; i++) {
            const prev2 = buckets[i - 2].volume;
            const prev1 = buckets[i - 1].volume;
            const curr = buckets[i].volume;
            const next1 = buckets[i + 1].volume;
            const next2 = buckets[i + 2].volume;

            // Peak (HVN)
            if (curr > prev1 && curr > next1 && curr > prev2 && curr > next2) {
                hvns.push({ price: buckets[i].center, strength: curr });
            }

            // Valley (LVN)
            if (curr < prev1 && curr < next1 && curr < prev2 && curr < next2 && curr > 0) {
                lvns.push({ price: buckets[i].center, depth: curr });
            }
        }

        return {
            hvns: hvns.sort((a, b) => b.strength - a.strength).slice(0, 5),
            lvns: lvns.sort((a, b) => a.depth - b.depth).slice(0, 5)
        };
    }
}
