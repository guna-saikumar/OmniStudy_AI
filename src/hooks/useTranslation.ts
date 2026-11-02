/**
 * useTranslation — custom React hook for managing translation state
 * across all six OmniStudy study modules.
 *
 * Provides:
 * - Per-module language selection and translation state
 * - "Translate All" functionality with progress tracking
 * - Original/translated content toggle
 * - Cache-aware content fetching (loads existing translations on mount)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../utils/api';

// ── Types ────────────────────────────────────────────────────────────────────

export type ModuleType =
    | 'text'
    | 'documentOutline'
    | 'mindMapData'
    | 'infographicData'
    | 'flashcards'
    | 'comparativeTable';

export type LanguageCode = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'ml';

export type TranslationStatus = 'idle' | 'loading' | 'done' | 'error';

export interface Language {
    code: LanguageCode;
    name: string;
    native: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
];

export const ALL_MODULE_TYPES: ModuleType[] = [
    'text',
    'documentOutline',
    'mindMapData',
    'infographicData',
    'flashcards',
    'comparativeTable',
];

// Human-readable labels for progress display
export const MODULE_LABELS: Record<ModuleType, string> = {
    text: 'Summary',
    documentOutline: 'Outline',
    mindMapData: 'Mind Map',
    infographicData: 'Infographic',
    flashcards: 'Flashcards',
    comparativeTable: 'Comparison Table',
};

// ── Hook ─────────────────────────────────────────────────────────────────────

interface TranslationState {
    /** Translated content cache: moduleType → language → content */
    translatedModules: Record<string, Record<string, any>>;

    /** Currently selected language per module */
    activeLanguages: Record<ModuleType, LanguageCode>;

    /** Whether each module is showing translated or original content */
    showTranslated: Record<ModuleType, boolean>;

    /** Translation status per module */
    translationStates: Record<ModuleType, TranslationStatus>;

    /** Error messages per module */
    translationErrors: Record<ModuleType, string>;

    /** Whether a translate-all operation is in progress */
    isTranslatingAll: boolean;

    /** Whether the translation service is available */
    serviceAvailable: boolean | null;
}

// localStorage keys for persisting translation state across refreshes
const LS_LANG_KEY = 'omnistudy_translation_language';
const LS_SHOW_KEY = 'omnistudy_translation_show';

function loadPersistedLanguages(): Record<ModuleType, LanguageCode> {
    const defaults: Record<ModuleType, LanguageCode> = {
        text: 'en', documentOutline: 'en', mindMapData: 'en',
        infographicData: 'en', flashcards: 'en', comparativeTable: 'en',
    };
    try {
        const saved = localStorage.getItem(LS_LANG_KEY);
        if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return defaults;
}

function loadPersistedShow(): Record<ModuleType, boolean> {
    const defaults: Record<ModuleType, boolean> = {
        text: false, documentOutline: false, mindMapData: false,
        infographicData: false, flashcards: false, comparativeTable: false,
    };
    try {
        const saved = localStorage.getItem(LS_SHOW_KEY);
        if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch { /* ignore */ }
    return defaults;
}

export function useTranslation(summaryId: string | null) {
    const [state, setState] = useState<TranslationState>({
        translatedModules: {},
        activeLanguages: loadPersistedLanguages(),
        showTranslated: loadPersistedShow(),
        translationStates: {
            text: 'idle',
            documentOutline: 'idle',
            mindMapData: 'idle',
            infographicData: 'idle',
            flashcards: 'idle',
            comparativeTable: 'idle',
        },
        translationErrors: {
            text: '',
            documentOutline: '',
            mindMapData: '',
            infographicData: '',
            flashcards: '',
            comparativeTable: '',
        },
        isTranslatingAll: false,
        serviceAvailable: null,
    });

    // Persist language and showTranslated state to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(LS_LANG_KEY, JSON.stringify(state.activeLanguages));
            localStorage.setItem(LS_SHOW_KEY, JSON.stringify(state.showTranslated));
        } catch { /* ignore quota errors */ }
    }, [state.activeLanguages, state.showTranslated]);

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Load cached translations on mount
    useEffect(() => {
        if (!summaryId) return;

        const loadCached = async () => {
            try {
                const { data } = await api.get(`/translate/cache/${summaryId}`);
                if (!mountedRef.current) return;

                if (data?.translations) {
                    setState(prev => ({
                        ...prev,
                        translatedModules: data.translations,
                    }));
                }
            } catch {
                // Cache fetch failure is non-critical
            }
        };

        const checkHealth = async () => {
            try {
                const { data } = await api.get('/translate/health');
                if (mountedRef.current) {
                    setState(prev => ({
                        ...prev,
                        serviceAvailable: data?.available ?? false,
                    }));
                }
            } catch {
                if (mountedRef.current) {
                    setState(prev => ({ ...prev, serviceAvailable: false }));
                }
            }
        };

        loadCached();
        checkHealth();
    }, [summaryId]);

    // ── Translate a single module ────────────────────────────────────────────

    const translateModule = useCallback(
        async (moduleType: ModuleType, targetLanguage: LanguageCode) => {
            if (!summaryId || targetLanguage === 'en') return;

            // Check if already cached locally
            const cached = state.translatedModules[moduleType]?.[targetLanguage];
            if (cached?.content) {
                setState(prev => ({
                    ...prev,
                    activeLanguages: { ...prev.activeLanguages, [moduleType]: targetLanguage },
                    showTranslated: { ...prev.showTranslated, [moduleType]: true },
                    translationStates: { ...prev.translationStates, [moduleType]: 'done' },
                }));
                return;
            }

            // Set loading state
            setState(prev => ({
                ...prev,
                translationStates: { ...prev.translationStates, [moduleType]: 'loading' },
                translationErrors: { ...prev.translationErrors, [moduleType]: '' },
            }));

            try {
                const { data } = await api.post('/translate/module', {
                    summaryId,
                    moduleType,
                    targetLanguage,
                });

                if (!mountedRef.current) return;

                setState(prev => ({
                    ...prev,
                    translatedModules: {
                        ...prev.translatedModules,
                        [moduleType]: {
                            ...prev.translatedModules[moduleType],
                            [targetLanguage]: { content: data.translatedContent },
                        },
                    },
                    activeLanguages: { ...prev.activeLanguages, [moduleType]: targetLanguage },
                    showTranslated: { ...prev.showTranslated, [moduleType]: true },
                    translationStates: { ...prev.translationStates, [moduleType]: 'done' },
                }));
            } catch (err: any) {
                if (!mountedRef.current) return;
                const message = err.response?.data?.message || err.message || 'Translation failed';
                setState(prev => ({
                    ...prev,
                    translationStates: { ...prev.translationStates, [moduleType]: 'error' },
                    translationErrors: { ...prev.translationErrors, [moduleType]: message },
                }));
            }
        },
        [summaryId, state.translatedModules]
    );

    // ── Translate all modules ────────────────────────────────────────────────

    const translateAll = useCallback(
        async (targetLanguage: LanguageCode) => {
            if (!summaryId || targetLanguage === 'en') return;

            setState(prev => ({
                ...prev,
                isTranslatingAll: true,
            }));

            // Set all modules to loading
            const loadingStates: Record<ModuleType, TranslationStatus> = {} as any;
            ALL_MODULE_TYPES.forEach(m => { loadingStates[m] = 'loading'; });
            setState(prev => ({
                ...prev,
                translationStates: loadingStates,
            }));

            try {
                const { data } = await api.post('/translate/all', {
                    summaryId,
                    targetLanguage,
                });

                if (!mountedRef.current) return;

                const newTranslated = { ...state.translatedModules };
                const newStates: Record<ModuleType, TranslationStatus> = {} as any;
                const newLanguages: Record<ModuleType, LanguageCode> = {} as any;
                const newShowTranslated: Record<ModuleType, boolean> = {} as any;
                const newErrors: Record<ModuleType, string> = {} as any;

                for (const moduleType of ALL_MODULE_TYPES) {
                    if (data.translations?.[moduleType]) {
                        if (!newTranslated[moduleType]) newTranslated[moduleType] = {};
                        newTranslated[moduleType][targetLanguage] = {
                            content: data.translations[moduleType],
                        };
                        newStates[moduleType] = 'done';
                        newLanguages[moduleType] = targetLanguage;
                        newShowTranslated[moduleType] = true;
                        newErrors[moduleType] = '';
                    } else if (data.errors?.[moduleType]) {
                        newStates[moduleType] = 'error';
                        newLanguages[moduleType] = state.activeLanguages[moduleType];
                        newShowTranslated[moduleType] = false;
                        newErrors[moduleType] = data.errors[moduleType];
                    } else {
                        newStates[moduleType] = 'idle';
                        newLanguages[moduleType] = state.activeLanguages[moduleType];
                        newShowTranslated[moduleType] = state.showTranslated[moduleType];
                        newErrors[moduleType] = '';
                    }
                }

                setState(prev => ({
                    ...prev,
                    translatedModules: newTranslated,
                    translationStates: newStates,
                    activeLanguages: newLanguages,
                    showTranslated: newShowTranslated,
                    translationErrors: newErrors,
                    isTranslatingAll: false,
                }));
            } catch (err: any) {
                if (!mountedRef.current) return;
                const errorStates: Record<ModuleType, TranslationStatus> = {} as any;
                const errorMessages: Record<ModuleType, string> = {} as any;
                const message = err.response?.data?.message || err.message || 'Translation failed';
                ALL_MODULE_TYPES.forEach(m => {
                    errorStates[m] = 'error';
                    errorMessages[m] = message;
                });
                setState(prev => ({
                    ...prev,
                    translationStates: errorStates,
                    translationErrors: errorMessages,
                    isTranslatingAll: false,
                }));
            }
        },
        [summaryId, state.translatedModules, state.activeLanguages, state.showTranslated]
    );

    // ── Toggle between original and translated ──────────────────────────────

    const toggleOriginal = useCallback((moduleType: ModuleType) => {
        setState(prev => ({
            ...prev,
            showTranslated: {
                ...prev.showTranslated,
                [moduleType]: !prev.showTranslated[moduleType],
            },
        }));
    }, []);

    // ── Set language for a module ─────────────────────────────────────────────

    const setModuleLanguage = useCallback((moduleType: ModuleType, language: LanguageCode) => {
        setState(prev => ({
            ...prev,
            activeLanguages: { ...prev.activeLanguages, [moduleType]: language },
            showTranslated: language === 'en'
                ? { ...prev.showTranslated, [moduleType]: false }
                : prev.showTranslated,
        }));
    }, []);

    // ── Reset all modules to original English ────────────────────────────────

    const resetAllToOriginal = useCallback(() => {
        setState(prev => ({
            ...prev,
            showTranslated: {
                text: false,
                documentOutline: false,
                mindMapData: false,
                infographicData: false,
                flashcards: false,
                comparativeTable: false,
            },
            activeLanguages: {
                text: 'en',
                documentOutline: 'en',
                mindMapData: 'en',
                infographicData: 'en',
                flashcards: 'en',
                comparativeTable: 'en',
            },
            translationStates: {
                text: 'idle',
                documentOutline: 'idle',
                mindMapData: 'idle',
                infographicData: 'idle',
                flashcards: 'idle',
                comparativeTable: 'idle',
            },
        }));
    }, []);

    // ── Get display content (original or translated) ─────────────────────────

    const getDisplayContent = useCallback(
        (moduleType: ModuleType, originalContent: any) => {
            const { showTranslated, translatedModules, activeLanguages } = state;

            if (!showTranslated[moduleType] || activeLanguages[moduleType] === 'en') {
                return originalContent;
            }

            const lang = activeLanguages[moduleType];
            const translated = translatedModules[moduleType]?.[lang]?.content;

            return translated || originalContent;
        },
        [state]
    );

    // ── Check if a module has a translation available ────────────────────────

    const hasTranslation = useCallback(
        (moduleType: ModuleType, language?: LanguageCode) => {
            const lang = language || state.activeLanguages[moduleType];
            if (lang === 'en') return false;
            return !!state.translatedModules[moduleType]?.[lang]?.content;
        },
        [state.translatedModules, state.activeLanguages]
    );

    return {
        // State
        translatedModules: state.translatedModules,
        activeLanguages: state.activeLanguages,
        showTranslated: state.showTranslated,
        translationStates: state.translationStates,
        translationErrors: state.translationErrors,
        isTranslatingAll: state.isTranslatingAll,
        serviceAvailable: state.serviceAvailable,

        // Actions
        translateModule,
        translateAll,
        toggleOriginal,
        resetAllToOriginal,
        setModuleLanguage,

        // Helpers
        getDisplayContent,
        hasTranslation,
    };
}
