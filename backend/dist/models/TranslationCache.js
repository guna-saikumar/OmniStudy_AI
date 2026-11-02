"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
/**
 * TranslationCache — stores translated module content to avoid re-translating.
 *
 * Compound index on (summaryId, moduleType, targetLanguage) ensures fast
 * cache lookups and uniqueness. The contentHash field allows cache invalidation
 * when the original content changes (e.g., after regeneration).
 */
const translationCacheSchema = new mongoose_1.Schema({
    summaryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Summary',
        index: true,
    },
    moduleType: {
        type: String,
        required: true,
        enum: ['text', 'documentOutline', 'mindMapData', 'infographicData', 'flashcards', 'comparativeTable'],
    },
    sourceLanguage: {
        type: String,
        default: 'en',
    },
    targetLanguage: {
        type: String,
        required: true,
    },
    translatedContent: {
        type: mongoose_1.Schema.Types.Mixed,
        required: true,
    },
    contentHash: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});
// Compound index for fast cache lookups — ensures one cached translation
// per (summary, module, target language) combination
translationCacheSchema.index({ summaryId: 1, moduleType: 1, targetLanguage: 1 }, { unique: true });
const TranslationCache = (0, mongoose_1.model)('TranslationCache', translationCacheSchema);
exports.default = TranslationCache;
