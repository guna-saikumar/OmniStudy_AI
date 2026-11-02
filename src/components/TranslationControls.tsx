/**
 * TranslationControls — per-module language selector and translate button.
 *
 * Renders inline within each module's CardHeader, matching OmniStudy's
 * existing design system. Shows language dropdown, translate button,
 * loading state, and original/translated toggle.
 */

import { useState } from 'react';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Globe, Loader2, Check, AlertCircle, RotateCcw, ChevronDown, Languages } from 'lucide-react';
import {
    type ModuleType,
    type LanguageCode,
    type TranslationStatus,
    SUPPORTED_LANGUAGES,
} from '../hooks/useTranslation';

interface TranslationControlsProps {
    moduleType: ModuleType;
    summaryId: string | null;
    state: TranslationStatus;
    activeLanguage: LanguageCode;
    showTranslated: boolean;
    hasTranslation: (lang: LanguageCode) => boolean;
    error?: string;
    onLanguageChange: (moduleType: ModuleType, language: LanguageCode) => void;
    onTranslate: (moduleType: ModuleType, language: LanguageCode) => void;
    onToggleOriginal: (moduleType: ModuleType) => void;
}

export default function TranslationControls({
    moduleType,
    summaryId,
    state,
    activeLanguage,
    showTranslated,
    hasTranslation,
    error,
    onLanguageChange,
    onTranslate,
    onToggleOriginal,
}: TranslationControlsProps) {
    const [selectedLang, setSelectedLang] = useState<LanguageCode>(activeLanguage || 'en');

    const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

    const handleLanguageSelect = (code: LanguageCode) => {
        setSelectedLang(code);
        onLanguageChange(moduleType, code);
    };

    const handleTranslate = () => {
        if (!summaryId || selectedLang === 'en') return;
        onTranslate(moduleType, selectedLang);
    };

    // Check if the SPECIFICALLY SELECTED language is already translated and active
    const isSelectedLangTranslated = showTranslated && selectedLang !== 'en' && hasTranslation(selectedLang);

    return (
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Language Selector */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-medium border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
                        disabled={state === 'loading'}
                    >
                        <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" />
                        <span className="hidden sm:inline">{currentLangInfo?.native || currentLangInfo?.name}</span>
                        <span className="sm:hidden">{selectedLang.toUpperCase()}</span>
                        <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    className="w-44 sm:w-52 rounded-xl p-1 bg-white dark:bg-slate-900 border shadow-xl z-[100]"
                >
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <DropdownMenuItem
                            key={lang.code}
                            onClick={() => handleLanguageSelect(lang.code)}
                            className={`gap-2 rounded-lg cursor-pointer text-xs sm:text-sm ${
                                selectedLang === lang.code
                                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold'
                                    : ''
                            }`}
                        >
                            <span className="font-medium">{lang.native}</span>
                            <span className="text-gray-400 text-[10px] sm:text-xs ml-auto">{lang.name}</span>
                            {selectedLang === lang.code && (
                                <Check className="h-3 w-3 text-blue-500 ml-1" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Translate Button — Shown when an Indic language is selected */}
            {selectedLang !== 'en' && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTranslate}
                    disabled={state === 'loading'}
                    className={`gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs font-semibold transition-all ${
                        state === 'loading'
                            ? 'border-blue-300 dark:border-blue-700 text-blue-500'
                            : isSelectedLangTranslated
                            ? 'border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                            : state === 'error'
                            ? 'border-red-300 dark:border-red-700 text-red-500'
                            : 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950'
                    }`}
                >
                    {state === 'loading' ? (
                        <>
                            <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                            <span className="hidden sm:inline">Translating…</span>
                            <span className="sm:hidden">…</span>
                        </>
                    ) : isSelectedLangTranslated ? (
                        <>
                            <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden sm:inline">Translated</span>
                        </>
                    ) : state === 'error' ? (
                        <>
                            <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden sm:inline">Retry</span>
                        </>
                    ) : (
                        <>
                            <Languages className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="hidden sm:inline">Translate</span>
                            <span className="sm:hidden">Translate</span>
                        </>
                    )}
                </Button>
            )}

            {/* Original Button — Toggle back to original English */}
            {(showTranslated || activeLanguage !== 'en') && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        handleLanguageSelect('en');
                        if (showTranslated) onToggleOriginal(moduleType);
                    }}
                    className="gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl h-7 sm:h-8 px-2 sm:px-2.5 text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                    <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span>Original</span>
                </Button>
            )}
            {/* Error tooltip */}
            {state === 'error' && error && (
                <span className="text-[9px] sm:text-[10px] text-red-400 max-w-[120px] sm:max-w-[200px] truncate" title={error}>
                    {error}
                </span>
            )}
        </div>
    );
}
