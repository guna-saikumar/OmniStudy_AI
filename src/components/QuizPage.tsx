import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    ArrowLeft,
    Brain,
    Sparkles,
    Loader2,
    X,
    Moon,
    Sun,
    HelpCircle,
} from 'lucide-react';
import { QuizPlayer } from './QuizPlayer';
import { QuizResults } from './QuizResults';
import { QuizData, QuizResultsData } from '../hooks/useQuiz';

interface QuizPageProps {
    docTitle: string;
    fileName: string;
    isGenerating: boolean;
    isSubmitting: boolean;
    error: string | null;
    activeQuiz: QuizData | null;
    quizResults: QuizResultsData | null;
    loadingStepText: string;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    onBackToSummary: () => void;
    onSubmitAnswers: (answers: Record<string, string[]>) => void;
    onRetakeQuiz: () => void;
    onGenerateNewQuiz: () => void;
}

export const QuizPage: React.FC<QuizPageProps> = ({
    docTitle,
    fileName,
    isGenerating,
    isSubmitting,
    error,
    activeQuiz,
    quizResults,
    loadingStepText,
    theme,
    onThemeToggle,
    onBackToSummary,
    onSubmitAnswers,
    onRetakeQuiz,
    onGenerateNewQuiz,
}) => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans transition-colors duration-200">
            {/* ── Top Navigation Header ──────────────────────────────────────── */}
            <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
                <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 h-16 sm:h-20 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onBackToSummary}
                            className="rounded-xl gap-2 text-xs sm:text-sm font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Summary
                        </Button>

                        <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700" />

                        <div className="hidden sm:flex items-center gap-2">
                            <div className="p-1.5 rounded-xl bg-blue-600 text-white">
                                <Brain className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-xs">
                                {docTitle}
                            </span>
                            <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 text-[10px] uppercase font-bold">
                                Quiz Mode
                            </Badge>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <Brain className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-sm tracking-tight text-gray-900 dark:text-white hidden md:inline-block">
                                OmniStudy <span className="brand-logo-ai">AI</span>
                            </span>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onThemeToggle}
                            className="rounded-full h-8 w-8 sm:h-10 sm:w-10"
                        >
                            {theme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* ── Main Quiz Content Area (App Margins matching SummaryViewer) ─ */}
            <main className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-8 flex-1 flex flex-col justify-center">
                {/* 1. Loading State */}
                {isGenerating && (
                    <div className="py-20 text-center space-y-6 max-w-xl mx-auto">
                        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900 animate-ping opacity-30" />
                            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-600/40">
                                <Loader2 className="h-10 w-10 animate-spin" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                                Generating Your Quiz...
                            </h2>
                            <p className="text-base font-semibold text-blue-600 dark:text-blue-400 min-h-[28px]">
                                {loadingStepText}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                OmniStudy AI is scanning <strong className="text-gray-700 dark:text-gray-300">{fileName}</strong> to build grounded questions, formulas, and explanations.
                            </p>
                        </div>
                    </div>
                )}

                {/* 2. Error State */}
                {error && !isGenerating && (
                    <div className="py-16 text-center space-y-5 max-w-md mx-auto">
                        <div className="w-16 h-16 mx-auto rounded-3xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-lg">
                            <X className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            Quiz Generation Failed
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {error}
                        </p>
                        <div className="pt-2">
                            <Button
                                onClick={onBackToSummary}
                                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Return to Summary
                            </Button>
                        </div>
                    </div>
                )}

                {/* 3. Interactive Quiz Player */}
                {activeQuiz && !quizResults && !isGenerating && (
                    <div className="py-4">
                        <QuizPlayer
                            quiz={activeQuiz}
                            onSubmit={onSubmitAnswers}
                            isSubmitting={isSubmitting}
                            onCancel={onBackToSummary}
                        />
                    </div>
                )}

                {/* 4. Quiz Results & Review */}
                {quizResults && !isGenerating && (
                    <div className="py-4">
                        <QuizResults
                            results={quizResults}
                            onRetake={onRetakeQuiz}
                            onGenerateNew={onGenerateNewQuiz}
                            onBackToSummary={onBackToSummary}
                        />
                    </div>
                )}
            </main>
        </div>
    );
};
