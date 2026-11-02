"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearTranslationCache = exports.getCachedTranslations = exports.translateAll = exports.translateModule = exports.getTranslationHealth = exports.getLanguages = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Summary_1 = __importDefault(require("../models/Summary"));
const TranslationCache_1 = __importDefault(require("../models/TranslationCache"));
const translationService_1 = require("../services/translationService");
// ── Supported module types (maps to Summary.content fields) ──────────────────
const VALID_MODULES = Object.keys(translationService_1.MODULE_FIELD_MAP);
// Helper: detect mangled placeholder text in cached translations
function isMangledCache(translatedContent) {
    const jsonStr = JSON.stringify(translatedContent);
    // Check for ANY remnant of old placeholder systems:
    // - Original format: INLINE_MATH, BLOCK_MATH (underscore)
    // - Mangled spaced: INLINE _ MATH, BLOCK _ MATH
    // - New PH_ prefix/suffix
    // - Greek letter artifacts from IndicTrans2 mangling
    return (/INLINE.?_?.?MATH/i.test(jsonStr) ||
        /BLOCK.?_?.?MATH/i.test(jsonStr) ||
        jsonStr.includes('PH_') ||
        jsonStr.includes('_PH') ||
        /[λϕ]\s*INLINE/i.test(jsonStr) ||
        /[λϕ]\s*BLOCK/i.test(jsonStr) ||
        /⟨.*?⟩/.test(jsonStr));
}
// ── GET /api/translate/languages ─────────────────────────────────────────────
// @desc    Get supported languages
// @access  Public
exports.getLanguages = (0, express_async_handler_1.default)(async (_req, res) => {
    const languages = (0, translationService_1.getSupportedLanguages)();
    res.json({ languages });
});
// ── GET /api/translate/health ────────────────────────────────────────────────
// @desc    Check if the Python translation service is running
// @access  Public
exports.getTranslationHealth = (0, express_async_handler_1.default)(async (_req, res) => {
    const isHealthy = await (0, translationService_1.checkTranslationServiceHealth)();
    res.json({
        available: isHealthy,
        serviceUrl: process.env.TRANSLATION_SERVICE_URL || 'http://localhost:8000',
    });
});
// ── POST /api/translate/module ───────────────────────────────────────────────
// @desc    Translate a single module for a summary
// @access  Private
exports.translateModule = (0, express_async_handler_1.default)(async (req, res) => {
    const { summaryId, moduleType, targetLanguage, sourceLanguage = 'en' } = req.body;
    // Validate inputs
    if (!summaryId || !moduleType || !targetLanguage) {
        res.status(400);
        throw new Error('Missing required fields: summaryId, moduleType, targetLanguage');
    }
    if (!VALID_MODULES.includes(moduleType)) {
        res.status(400);
        throw new Error(`Invalid module type: ${moduleType}. Valid types: ${VALID_MODULES.join(', ')}`);
    }
    if (sourceLanguage === targetLanguage) {
        res.status(400);
        throw new Error('Source and target languages must be different');
    }
    // Fetch original summary
    const summary = await Summary_1.default.findById(summaryId);
    if (!summary) {
        res.status(404);
        throw new Error('Summary not found');
    }
    const contentField = translationService_1.MODULE_FIELD_MAP[moduleType];
    const originalContent = summary.content?.[contentField];
    if (!originalContent) {
        res.status(404);
        throw new Error(`Module "${moduleType}" has no content to translate`);
    }
    // Generate content hash for cache key
    const contentHash = (0, translationService_1.hashContent)(originalContent);
    // Check cache first
    const cached = await TranslationCache_1.default.findOne({
        summaryId,
        moduleType,
        targetLanguage,
    });
    if (cached && cached.contentHash === contentHash) {
        if (!isMangledCache(cached.translatedContent)) {
            console.log(`[Translation] Cache HIT for ${moduleType} → ${targetLanguage}`);
            res.json({
                summaryId,
                moduleType,
                targetLanguage,
                translatedContent: cached.translatedContent,
                cached: true,
            });
            return;
        }
        else {
            console.log(`[Translation] Cache INVALIDATED (mangled placeholders) for ${moduleType} → ${targetLanguage}`);
            await TranslationCache_1.default.deleteOne({ _id: cached._id });
        }
    }
    // Cache miss or stale — translate via Python service
    console.log(`[Translation] Cache MISS for ${moduleType} → ${targetLanguage}, translating...`);
    const translatedContent = await (0, translationService_1.translateModuleContent)(moduleType, originalContent, sourceLanguage, targetLanguage);
    // Store in cache (upsert)
    await TranslationCache_1.default.findOneAndUpdate({ summaryId, moduleType, targetLanguage }, {
        summaryId,
        moduleType,
        sourceLanguage,
        targetLanguage,
        translatedContent,
        contentHash,
    }, { upsert: true, new: true });
    console.log(`[Translation] Translated and cached ${moduleType} → ${targetLanguage}`);
    res.json({
        moduleType,
        targetLanguage,
        translatedContent,
        cached: false,
    });
});
// ── POST /api/translate/all ──────────────────────────────────────────────────
// @desc    Translate all six modules for a summary
// @access  Private
exports.translateAll = (0, express_async_handler_1.default)(async (req, res) => {
    const { summaryId, targetLanguage, sourceLanguage = 'en' } = req.body;
    if (!summaryId || !targetLanguage) {
        res.status(400);
        throw new Error('Missing required fields: summaryId, targetLanguage');
    }
    if (sourceLanguage === targetLanguage) {
        res.status(400);
        throw new Error('Source and target languages must be different');
    }
    // Fetch summary
    const summary = await Summary_1.default.findById(summaryId);
    if (!summary) {
        res.status(404);
        throw new Error('Summary not found');
    }
    const results = {};
    const errors = {};
    // Translate each module sequentially to manage memory
    for (const moduleType of VALID_MODULES) {
        const contentField = translationService_1.MODULE_FIELD_MAP[moduleType];
        const originalContent = summary.content?.[contentField];
        if (!originalContent) {
            console.log(`[TranslateAll] Skipping ${moduleType} — no content`);
            continue;
        }
        const contentHash = (0, translationService_1.hashContent)(originalContent);
        // Check cache
        const cached = await TranslationCache_1.default.findOne({
            summaryId,
            moduleType,
            targetLanguage,
        });
        if (cached && cached.contentHash === contentHash) {
            if (!isMangledCache(cached.translatedContent)) {
                console.log(`[TranslateAll] Cache HIT for ${moduleType}`);
                results[moduleType] = cached.translatedContent;
                continue;
            }
            else {
                console.log(`[TranslateAll] Cache INVALIDATED (mangled) for ${moduleType}`);
                await TranslationCache_1.default.deleteOne({ _id: cached._id });
            }
        }
        // Translate
        try {
            console.log(`[TranslateAll] Translating ${moduleType}...`);
            const translatedContent = await (0, translationService_1.translateModuleContent)(moduleType, originalContent, sourceLanguage, targetLanguage);
            // Cache
            await TranslationCache_1.default.findOneAndUpdate({ summaryId, moduleType, targetLanguage }, {
                summaryId,
                moduleType,
                sourceLanguage,
                targetLanguage,
                translatedContent,
                contentHash,
            }, { upsert: true, new: true });
            results[moduleType] = translatedContent;
            console.log(`[TranslateAll] ✓ ${moduleType} translated`);
        }
        catch (err) {
            console.error(`[TranslateAll] ✗ ${moduleType} failed:`, err.message);
            errors[moduleType] = err.message;
        }
    }
    res.json({
        summaryId,
        targetLanguage,
        translations: results,
        errors: Object.keys(errors).length > 0 ? errors : undefined,
    });
});
// ── GET /api/translate/cache/:summaryId ──────────────────────────────────────
// @desc    Get all cached translations for a summary
// @access  Private
exports.getCachedTranslations = (0, express_async_handler_1.default)(async (req, res) => {
    const { summaryId } = req.params;
    const cached = await TranslationCache_1.default.find({ summaryId }).select('moduleType targetLanguage translatedContent updatedAt');
    // Organize by moduleType → language → content
    const translations = {};
    for (const entry of cached) {
        if (!translations[entry.moduleType]) {
            translations[entry.moduleType] = {};
        }
        translations[entry.moduleType][entry.targetLanguage] = {
            content: entry.translatedContent,
            updatedAt: entry.updatedAt,
        };
    }
    res.json({ summaryId, translations });
});
// ── DELETE /api/translate/clear-cache ────────────────────────────────────────
// @desc    Clear all translation caches (useful after engine upgrades)
// @access  Private
exports.clearTranslationCache = (0, express_async_handler_1.default)(async (_req, res) => {
    const result = await TranslationCache_1.default.deleteMany({});
    console.log(`[Translation] Cleared ${result.deletedCount} cached translations`);
    res.json({
        message: `Cleared ${result.deletedCount} cached translations`,
        deletedCount: result.deletedCount,
    });
});
