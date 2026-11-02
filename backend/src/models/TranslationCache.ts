import { Schema, model } from 'mongoose';

/**
 * TranslationCache — stores translated module content to avoid re-translating.
 *
 * Compound index on (summaryId, moduleType, targetLanguage) ensures fast
 * cache lookups and uniqueness. The contentHash field allows cache invalidation
 * when the original content changes (e.g., after regeneration).
 */
const translationCacheSchema = new Schema(
    {
        summaryId: {
            type: Schema.Types.ObjectId,
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
            type: Schema.Types.Mixed,
            required: true,
        },
        contentHash: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for fast cache lookups — ensures one cached translation
// per (summary, module, target language) combination
translationCacheSchema.index(
    { summaryId: 1, moduleType: 1, targetLanguage: 1 },
    { unique: true }
);

const TranslationCache = model('TranslationCache', translationCacheSchema);
export default TranslationCache;
