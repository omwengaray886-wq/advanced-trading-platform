
/**
 * Liquidity Heatmap Engine (Phase 18)
 * 
 * Tracks the persistence of Order Book Walls over time.
 * Instead of just showing current depth, this engine builds a "memory" of 
 * where liquidity has been sitting.
 * 
 * Visualization:
 * - Persistent Blocks: Rectangles that extend in time.
 * - Intensity: Opacity based on volume relative to average.
 * - Decay: Blocks fade out if liquidity is pulled.
 */
import { v4 as uuidv4 } from 'uuid';

export class LiquidityHeatmapEngine {
    constructor() {
        this.activeBlocks = []; // Currently active walls
        this.history = [];      // Completed blocks (for historical lookback if needed)
        this.params = {
            thresholdMultiplier: 3.0, // Volume must be 3x average to be a "Wall"
            groupingTolerance: 0.001, // 0.1% price tolerance for grouping
            minDuration: 30,          // Minimum seconds to show a block (filter noise)
            maxHistory: 500           // Keep last 500 closed blocks
        };
    }

    /**
     * Update Heatmap with new Order Book snapshot
     * @param {Object} depth - { bids: [], asks: [] }
     * @param {number} currentPrice 
     * @param {number} timestamp - ms
     */
    update(depth, currentPrice, timestamp = Date.now()) {
        if (!depth || !depth.bids || !depth.asks) return;

        // 1. Identify current Walls
        const bidWalls = this._findWalls(depth.bids, currentPrice, 'BID');
        const askWalls = this._findWalls(depth.asks, currentPrice, 'ASK');
        const currentWalls = [...bidWalls, ...askWalls];

        // 2. Match with Active Blocks
        const unupdatedBlockIds = new Set(this.activeBlocks.map(b => b.id));

        currentWalls.forEach(wall => {
            // Find a matching existing block
            const match = this.activeBlocks.find(block =>
                block.side === wall.side &&
                Math.abs(block.price - wall.price) / block.price < this.params.groupingTolerance
            );

            if (match) {
                // Update existing block
                match.lastSeen = timestamp;
                match.volume = Math.max(match.volume, wall.volume); // Keep max volume seen
                match.updates++;
                match.currentVolume = wall.volume; // Track current for potential decay
                unupdatedBlockIds.delete(match.id);
            } else {
                // Start new block
                this.activeBlocks.push({
                    id: uuidv4(),
                    price: wall.price,
                    side: wall.side,
                    startTime: timestamp,
                    lastSeen: timestamp,
                    volume: wall.volume,
                    currentVolume: wall.volume,
                    updates: 1
                });
            }
        });

        // 3. Process Blocks that were NOT updated (Liquidity Pulled)
        // If a block hasn't been seen in this update, we close it.
        // real-time flickering might require a grace period, but for now we close immediately 
        // if it's strictly a snapshot-based engine. 
        // To reduce flicker, we could check if (timestamp - lastSeen > 5000ms).

        this.activeBlocks = this.activeBlocks.filter(block => {
            if (unupdatedBlockIds.has(block.id)) {
                // Check grace period (e.g., 5 seconds)
                if (timestamp - block.lastSeen > 5000) {
                    // Close Block
                    this._archiveBlock(block, timestamp);
                    return false; // Remove from active
                }
            }
            return true; // Keep active
        });

        // 4. Prune History
        if (this.history.length > this.params.maxHistory) {
            this.history = this.history.slice(-this.params.maxHistory);
        }
    }

    /**
     * Get visualizable heatmap blocks
     * @returns {Array} List of blocks formatted for AnnotationMapper
     */
    getHeatmapBlocks(timestamp = Date.now()) {
        // Return both active (extended to now) and relevant history
        const active = this.activeBlocks.map(b => ({
            ...b,
            endTime: timestamp, // Extend to current time for display
            isActive: true
        }));

        // Filter history to recent relevant blocks? 
        // For now return all history. The mapper can filter by time.
        return [...this.history, ...active];
    }

    _findWalls(levels, currentPrice, side) {
        if (!levels || levels.length === 0) return [];

        // Calculate local average volume (e.g., top 20 levels)
        const topLevels = levels.slice(0, 20);
        const avgVol = topLevels.reduce((sum, l) => sum + l.quantity, 0) / (topLevels.length || 1);
        const threshold = avgVol * this.params.thresholdMultiplier;

        return topLevels
            .filter(l => l.quantity > threshold)
            .map(l => ({
                price: parseFloat(l.price),
                volume: parseFloat(l.quantity),
                side: side
            }));
    }

    _archiveBlock(block, timestamp) {
        // Only archive if it lasted long enough (filter noise)
        if (block.lastSeen - block.startTime > (this.params.minDuration * 1000)) {
            this.history.push({
                ...block,
                endTime: block.lastSeen, // It actually disappeared at lastSeen
                isActive: false
            });
        }
    }
}

export const liquidityHeatmapEngine = new LiquidityHeatmapEngine();
