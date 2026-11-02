import axios from 'axios';
import crypto from 'crypto';
import { callGeminiWithRetry } from './aiService';

/**
 * Translation Service — communicates with the Python FastAPI translation
 * microservice running on TRANSLATION_SERVICE_URL (default: http://localhost:8000).
 *
 * Provides automatic fallback to Gemini AI translation when the Python microservice
 * is not running or unreachable (e.g. on Render Free Tier where PyTorch memory limits apply).
 */

const TRANSLATION_SERVICE_URL = process.env.TRANSLATION_SERVICE_URL || 'http://localhost:8000';

// ── Supported Languages ──────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
];

// Module type to Summary.content field mapping
export const MODULE_FIELD_MAP: Record<string, string> = {
    text: 'text',
    documentOutline: 'documentOutline',
    mindMapData: 'mindMapData',
    infographicData: 'infographicData',
    flashcards: 'flashcards',
    comparativeTable: 'comparativeTable',
};

// ── Service Health Check ─────────────────────────────────────────────────────

export async function checkTranslationServiceHealth(): Promise<boolean> {
    try {
        const response = await axios.get(`${TRANSLATION_SERVICE_URL}/health`, {
            timeout: 3000,
        });
        if (response.data?.model_loaded === true) return true;
    } catch {
        // Python microservice unavailable
    }
    // Return true if Gemini fallback is available via GEMINI_API_KEY
    return Boolean(process.env.GEMINI_API_KEY);
}

// ── Fallback Translation via Gemini AI ───────────────────────────────────────

async function translateModuleWithGemini(
    moduleType: string,
    data: any,
    srcLang: string,
    tgtLang: string
): Promise<any> {
    const langNames: Record<string, string> = {
        en: 'English',
        te: 'Telugu',
        hi: 'Hindi',
        ta: 'Tamil',
        kn: 'Kannada',
        ml: 'Malayalam',
    };
    const targetName = langNames[tgtLang] || tgtLang;

    const prompt = `You are an expert multilingual academic translator for Indian languages.
Translate the following study module content from English to ${targetName}.
Module Type: ${moduleType}

Input JSON Data:
${JSON.stringify(data)}

Strict Preservation and Formatting Requirements:
1. Translate natural language text, descriptions, headings, questions, answers, and summaries into natural, fluent ${targetName}.
2. CRITICAL PRESERVATION RULES:
   - Preserve all mathematical formulas, equations, and LaTeX notation ($...$, $$...$$, E=mc^2, etc.) completely intact.
   - Preserve all chemical notation (H2O, CO2, NaCl, ATP, DNA, etc.) completely intact.
   - Preserve all uppercase abbreviations and technical acronyms (CPU, RAM, API, HTTP, AI, etc.) completely intact.
   - Preserve names of scientists, researchers, and theorems (e.g. Alan Turing, Albert Einstein, Isaac Newton, Ramanujan, Dijkstra).
   - Preserve the exact JSON schema, keys, object nesting, and array lengths.
3. Respond ONLY with the valid JSON object containing the translated content matching the input schema. No markdown formatting, no commentary.`;

    const rawResponse = await callGeminiWithRetry(prompt, 'json');
    return JSON.parse(rawResponse);
}

// ── Translate Module (IndicTrans2 with Gemini Fallback) ─────────────────────

export async function translateModuleContent(
    moduleType: string,
    data: any,
    srcLang: string,
    tgtLang: string
): Promise<any> {
    // 1. Try IndicTrans2 Python microservice first
    try {
        const response = await axios.post(
            `${TRANSLATION_SERVICE_URL}/translate/module`,
            {
                module_type: moduleType,
                data,
                src_lang: srcLang,
                tgt_lang: tgtLang,
            },
            {
                timeout: 30000,
                headers: { 'Content-Type': 'application/json' },
            }
        );

        if (response.data?.translated_data) {
            return response.data.translated_data;
        }
    } catch (error: any) {
        console.warn(
            `[Translation] Python IndicTrans2 microservice unreachable (${error.message}). Engaging Gemini fallback...`
        );
    }

    // 2. Fallback to Gemini AI translation
    try {
        console.log(`[Translation] Translating ${moduleType} to ${tgtLang} via Gemini fallback...`);
        return await translateModuleWithGemini(moduleType, data, srcLang, tgtLang);
    } catch (geminiError: any) {
        console.error('[Translation] Gemini fallback also failed:', geminiError.message);
        throw new Error(`Translation failed: ${geminiError.message}`);
    }
}

// ── Content Hashing ──────────────────────────────────────────────────────────

/**
 * Generate a SHA-256 hash of module content for cache invalidation.
 * If the original content changes (e.g., after regeneration), the hash
 * will differ and the cache entry will be refreshed.
 */
export function hashContent(content: any): string {
    const serialized = JSON.stringify(content);
    return crypto.createHash('sha256').update(serialized).digest('hex');
}

// ── Get Supported Languages ──────────────────────────────────────────────────

export function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
}
