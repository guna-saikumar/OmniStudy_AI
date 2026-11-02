/**
 * TranslateAllPanel — global "Translate All Modules" control.
 *
 * Placed below the document title in SummaryViewer. Shows a language
 * selector, translate-all button, and per-module progress indicators.
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { RotateCcw, Globe, Loader2, Check, AlertCircle, ChevronDown, Languages } from 'lucide-react';
import {
    type ModuleType,
    type LanguageCode,
    type TranslationStatus,
    SUPPORTED_LANGUAGES,
    ALL_MODULE_TYPES,
    MODULE_LABELS,
} from '../hooks/useTranslation';

interface TranslateAllPanelProps {
    translationStates: Record<ModuleType, TranslationStatus>;
    isTranslatingAll: boolean;
    serviceAvailable: boolean | null;
    onTranslateAll: (language: LanguageCode) => void;
    onResetOriginal?: () => void;
}

export default function TranslateAllPanel({
    translationStates,
    isTranslatingAll,
    serviceAvailable,
    onTranslateAll,
    onResetOriginal,
}: TranslateAllPanelProps) {
    const [selectedLang, setSelectedLang] = useState<LanguageCode>('en');
    const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];

    const hasAnyProgress = ALL_MODULE_TYPES.some(m => translationStates[m] !== 'idle');
    const hasAnyDone = ALL_MODULE_TYPES.some(m => translationStates[m] === 'done');

    const handleTranslateAll = () => {
        if (selectedLang === 'en') {
            if (onResetOriginal) onResetOriginal();
            return;
        }
        onTranslateAll(selectedLang);
    };

    const handleSelectLanguage = (code: LanguageCode) => {
        setSelectedLang(code);
        if (code === 'en' && onResetOriginal) {
            onResetOriginal();
        }
    };

    // Status icon for each module
    const statusIcon = (status: TranslationStatus) => {
        switch (status) {
            case 'done':
                return <Check className="h-3.5 w-3.5 text-emerald-500" />;
            case 'loading':
                return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
            case 'error':
                return <AlertCircle className="h-3.5 w-3.5 text-red-400" />;
            default:
                return <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
        }
    };

    if (serviceAvailable === false) {
        return null; // Don't show panel if service is unavailable
    }

    return (
        <Card className="border border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-2xl shadow-sm overflow-hidden">
            <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                    {/* Left: Language selector + Translate All button */}
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
                            Translate:
                        </span>

                        {/* Language Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 rounded-xl h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm font-medium border-blue-200 dark:border-blue-800 hover:border-blue-400 min-w-[110px] sm:min-w-[130px] justify-between"
                                    disabled={isTranslatingAll}
                                >
                                    <span>{currentLangInfo?.native || currentLangInfo?.name}</span>
                                    <ChevronDown className="h-3 w-3 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="start"
                                className="w-52 rounded-xl p-1 bg-white dark:bg-slate-900 border shadow-xl z-[100]"
                            >
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <DropdownMenuItem
                                        key={lang.code}
                                        onClick={() => handleSelectLanguage(lang.code)}
                                        className={`gap-2 rounded-lg cursor-pointer ${
                                            selectedLang === lang.code
                                                ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-semibold'
                                                : ''
                                        }`}
                                    >
                                        <span className="font-medium">{lang.native}</span>
                                        <span className="text-gray-400 text-xs ml-auto">{lang.name}</span>
                                        {selectedLang === lang.code && (
                                            <Check className="h-3.5 w-3.5 text-blue-500 ml-1" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Translate All Button */}
                        <Button
                            size="sm"
                            onClick={handleTranslateAll}
                            disabled={isTranslatingAll || selectedLang === 'en'}
                            className="gap-1.5 rounded-xl h-8 sm:h-9 px-3 sm:px-5 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 flex-shrink-0"
                        >
                            {isTranslatingAll ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span className="hidden sm:inline">Translating All…</span>
                                    <span className="sm:hidden">Translating…</span>
                                </>
                            ) : (
                                <>
                                    <Languages className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Translate All Modules</span>
                                    <span className="sm:hidden">Translate All</span>
                                </>
                            )}
                        </Button>

                        {/* Global View Original Button */}
                        {(hasAnyDone || selectedLang !== 'en') && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSelectedLang('en');
                                    if (onResetOriginal) onResetOriginal();
                                }}
                                className="gap-1.5 rounded-xl h-8 sm:h-9 px-3 text-xs font-medium border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Original</span>
                            </Button>
                        )}
                    </div>

                    {/* Right: Progress indicators (shown when any module has started) */}
                    {hasAnyProgress && (
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:ml-auto">
                            {ALL_MODULE_TYPES.map(moduleType => (
                                <div
                                    key={moduleType}
                                    className="flex items-center gap-1 sm:gap-1.5"
                                    title={MODULE_LABELS[moduleType]}
                                >
                                    {statusIcon(translationStates[moduleType])}
                                    <span className="text-[9px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">
                                        {MODULE_LABELS[moduleType]}
                                    </span>
                                    <span className="text-[9px] font-medium text-gray-500 dark:text-gray-400 sm:hidden">
                                        {MODULE_LABELS[moduleType].slice(0, 3)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
