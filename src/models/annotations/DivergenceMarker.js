import { ChartAnnotation } from '../ChartAnnotation.js';

/**
 * DivergenceMarker Model
 * Represents a cracking of correlation (SMT) between assets.
 */
export class DivergenceMarker extends ChartAnnotation {
    constructor(time, price, dir, text, metadata = {}) {
        super('DIVERGENCE', { time, price }, {
            ...metadata,
            direction: dir,
            label: text,
            intent: dir === 'BULLISH' ? 'INSTITUTIONAL_ACCUMULATION' : 'INSTITUTIONAL_DISTRIBUTION'
        });

        this.time = time;
        this.price = price;
        this.dir = dir;
        this.text = text;
    }

    getVisualColor() {
        return this.dir === 'BULLISH' ? '#1DB954' : '#E63946';
    }

    getIcon() {
        return this.dir === 'BULLISH' ? '⚡🟢' : '⚡🔴';
    }
}
