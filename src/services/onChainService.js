/**
 * On-Chain Data Service
 * Tracks blockchain metrics for cryptocurrency assets
 * Exchange flows, whale activity, network metrics
 */

// In-memory cache for on-chain results
const onChainCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Get on-chain metrics for a cryptocurrency
 * @param {string} symbol - Crypto symbol (e.g., 'BTC', 'ETH')
 * @returns {Promise<Object>} - On-chain analysis
 */
export async function getOnChainMetrics(symbol) {
    const cleanSymbol = symbol.replace(/USDT|USD/g, '');
    const cacheKey = cleanSymbol.toUpperCase();

    // Check cache
    const cached = onChainCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[ON-CHAIN] Returning cached metrics for ${cacheKey}`);
        return cached.data;
    }

    try {
        // Get exchange flows and network data
        const [exchangeFlow, whaleActivity, networkMetrics] = await Promise.all([
            getExchangeFlows(cleanSymbol),
            getWhaleActivity(cleanSymbol),
            getNetworkMetrics(cleanSymbol)
        ]);

        // Determine overall bias
        let bias = 'NEUTRAL';
        let confidence = 0.5;

        // Large exchange outflow = bullish (supply leaving exchanges)
        if (exchangeFlow.netFlow < -1000 && whaleActivity.trend === 'ACCUMULATION') {
            bias = 'BULLISH';
            confidence = 0.85;
        } else if (exchangeFlow.netFlow > 1000 && whaleActivity.trend === 'DISTRIBUTION') {
            bias = 'BEARISH';
            confidence = 0.85;
        } else if (Math.abs(exchangeFlow.netFlow) < 500) {
            bias = 'NEUTRAL';
            confidence = 0.6;
        }

        const result = {
            exchangeFlow: exchangeFlow.netFlow,
            whaleActivity: whaleActivity.trend,
            activeAddresses: networkMetrics.activeAddresses,
            transactionVolume: networkMetrics.txVolume,
            bias,
            confidence,
            timestamp: Date.now()
        };

        // Cache the result
        onChainCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    } catch (error) {
        console.error('On-chain metrics error:', error);
        return getFallbackOnChain();
    }
}

/**
 * Get exchange inflow/outflow data
 * Positive = inflow (bearish), Negative = outflow (bullish)
 */
async function getExchangeFlows(symbol) {
    try {
        const coinMap = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'BNB': 'binancecoin'
        };

        const coinId = coinMap[symbol];
        if (!coinId) {
            return { netFlow: 0, confidence: 0.3 };
        }

        // CoinGecko provides market data; for real exchange flow we'd need Glassnode/CryptoQuant
        // Using volume as a proxy for now
        const url = `/api/coingecko/coins/${coinId}/market_chart?vs_currency=usd&days=1&interval=hourly`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });
        if (response.status === 429) throw new Error('Throttled');
        const data = await response.json();

        if (data.total_volumes && data.total_volumes.length >= 2) {
            const recentVolumes = data.total_volumes.slice(-24);
            const avgVolume = recentVolumes.reduce((sum, [, vol]) => sum + vol, 0) / recentVolumes.length;
            const currentVolume = recentVolumes[recentVolumes.length - 1][1];

            // Estimate flow based on price action and volume
            const prices = data.prices.slice(-24);
            const priceChange = ((prices[prices.length - 1][1] - prices[0][1]) / prices[0][1]) * 100;

            // High volume + price down = likely exchange inflow (bearish)
            // High volume + price up = likely exchange outflow (bullish)
            const volumeRatio = currentVolume / avgVolume;
            let estimatedFlow = 0;

            if (volumeRatio > 1.3) {
                estimatedFlow = priceChange < 0 ? 1500 : -1500; // Inflow vs outflow
            } else if (volumeRatio > 1.1) {
                estimatedFlow = priceChange < 0 ? 800 : -800;
            } else {
                estimatedFlow = priceChange > 0 ? -200 : 200;
            }

            return {
                netFlow: Math.round(estimatedFlow),
                confidence: 0.6,
                volumeRatio: parseFloat(volumeRatio.toFixed(2))
            };
        }
    } catch (error) {
        console.warn('Exchange flow fetch failed:', error);
    }

    return { netFlow: 0, confidence: 0.3 };
}

/**
 * Detect whale accumulation/distribution
 */
async function getWhaleActivity(symbol) {
    try {
        const coinMap = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'BNB': 'binancecoin'
        };

        const coinId = coinMap[symbol];
        if (!coinId) {
            return { trend: 'NEUTRAL', confidence: 0.3 };
        }

        // Get price and volume data
        const url = `/api/coingecko/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' }
        });
        if (response.status === 429) throw new Error('Throttled');
        const data = await response.json();

        if (data.prices && data.total_volumes) {
            const prices = data.prices;
            const volumes = data.total_volumes;

            // Calculate price change
            const priceChange = ((prices[prices.length - 1][1] - prices[0][1]) / prices[0][1]) * 100;

            // Calculate volume trend
            const recentVol = volumes.slice(-3).reduce((sum, [, vol]) => sum + vol, 0) / 3;
            const olderVol = volumes.slice(0, 4).reduce((sum, [, vol]) => sum + vol, 0) / 4;
            const volumeIncrease = ((recentVol - olderVol) / olderVol) * 100;

            // Whale accumulation: Price stable/down but volume increasing
            // Whale distribution: Price up but volume spiking (selling into strength)
            let trend = 'NEUTRAL';
            if (priceChange < 5 && volumeIncrease > 20) {
                trend = 'ACCUMULATION';
            } else if (priceChange > 10 && volumeIncrease > 30) {
                trend = 'DISTRIBUTION';
            }

            return {
                trend,
                confidence: 0.65,
                priceChange: parseFloat(priceChange.toFixed(2)),
                volumeChange: parseFloat(volumeIncrease.toFixed(2))
            };
        }
    } catch (error) {
        console.warn('Whale activity fetch failed:', error);
    }

    return { trend: 'NEUTRAL', confidence: 0.3 };
}

/**
 * Get network activity metrics
 */
async function getNetworkMetrics(symbol) {
    // For production, would use blockchain explorers or specialized APIs
    // CoinGecko doesn't provide this data directly

    return {
        activeAddresses: null,
        txVolume: null,
        confidence: 0.3,
        source: 'LIMITED_DATA'
    };
}

/**
 * Fallback when on-chain data unavailable
 */
function getFallbackOnChain() {
    return {
        exchangeFlow: 0,
        whaleActivity: 'NEUTRAL',
        activeAddresses: null,
        transactionVolume: null,
        bias: 'NEUTRAL',
        confidence: 0.3,
        timestamp: Date.now()
    };
}
