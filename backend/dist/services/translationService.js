"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULE_FIELD_MAP = exports.SUPPORTED_LANGUAGES = void 0;
exports.checkTranslationServiceHealth = checkTranslationServiceHealth;
exports.translateModuleContent = translateModuleContent;
exports.hashContent = hashContent;
exports.getSupportedLanguages = getSupportedLanguages;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * Translation Service — communicates with the Python FastAPI translation
 * microservice running on TRANSLATION_SERVICE_URL (default: http://localhost:8000).
 *
 * This service layer is consumed by the translationController and handles
 * all HTTP communication, error handling, and content hashing.
 */
const TRANSLATION_SERVICE_URL = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:8000';
// ── Supported Languages ──────────────────────────────────────────────────────
exports.SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
];
// Module type to Summary.content field mapping
exports.MODULE_FIELD_MAP = {
    text: 'text',
    documentOutline: 'documentOutline',
    mindMapData: 'mindMapData',
    infographicData: 'infographicData',
    flashcards: 'flashcards',
    comparativeTable: 'comparativeTable',
};
// ── Service Health Check ─────────────────────────────────────────────────────
async function checkTranslationServiceHealth() {
    try {
        const response = await axios_1.default.get(`${TRANSLATION_SERVICE_URL}/health`, {
            timeout: 5000,
        });
        return response.data?.model_loaded === true;
    }
    catch {
        return false;
    }
}
// ── Translate Module via Python Service ──────────────────────────────────────
async function translateModuleContent(moduleType, data, srcLang, tgtLang) {
    try {
        const response = await axios_1.default.post(`${TRANSLATION_SERVICE_URL}/translate/module`, {
            module_type: moduleType,
            data,
            src_lang: srcLang,
            tgt_lang: tgtLang,
        }, {
            timeout: 120000, // 2 minute timeout for large modules
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data?.translated_data;
    }
    catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Translation service is not running. Start it with: cd backend/translation-service && source venv/bin/activate && python app.py');
        }
        if (error.response?.status === 503) {
            throw new Error('Translation models are still loading. Please try again in a moment.');
        }
        const detail = error.response?.data?.detail || error.message;
        throw new Error(`Translation failed: ${detail}`);
    }
}
// ── Content Hashing ──────────────────────────────────────────────────────────
/**
 * Generate a SHA-256 hash of module content for cache invalidation.
 * If the original content changes (e.g., after regeneration), the hash
 * will differ and the cache entry will be refreshed.
 */
function hashContent(content) {
    const serialized = JSON.stringify(content);
    return crypto_1.default.createHash('sha256').update(serialized).digest('hex');
}
// ── Get Supported Languages ──────────────────────────────────────────────────
function getSupportedLanguages() {
    return exports.SUPPORTED_LANGUAGES;
}
