/**
 * Base class for all chart annotations
 * Provides common structure and methods for all annotation types
 */
export class ChartAnnotation {
    constructor(type, coordinates, metadata = {}) {
        this.id = this.generateId(type);
        this.type = type;
        this.coordinates = coordinates;
        this.metadata = metadata;
        this.timeframe = metadata.timeframe || null;
        this.visible = true;
        this.linkedExplanation = null;
        this.createdAt = Date.now();

        // Universal Zone Mapping Properties (Phase 20)
        this.state = metadata.state || 'fresh';
        this.intent = metadata.intent || 'unknown';
        this.allowedDirection = metadata.allowedDirection || 'BOTH';
        this.entryModels = metadata.entryModels || [];
        this.invalidationRule = metadata.invalidationRule || '';
        this.targets = metadata.targets || [];
        this.confidence = metadata.confidence || 0.0;
    }

    generateId(type) {
        const prefix = type.substring(0, 2).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    setLinkedExplanation(explanationId) {
        this.linkedExplanation = explanationId;
    }

    toggle() {
        this.visible = !this.visible;
    }

    hide() {
        this.visible = false;
    }

    show() {
        this.visible = true;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            coordinates: this.coordinates,
            metadata: this.metadata,
            timeframe: this.timeframe,
            visible: this.visible,
            linkedExplanation: this.linkedExplanation,
            createdAt: this.createdAt
        };
    }
}
