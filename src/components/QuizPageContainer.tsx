import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import {
    ArrowLeft,
    Brain,
    Sparkles,
    Loader2,
    X,
    Moon,
    Sun,
    Trophy,
    RotateCcw,
} from 'lucide-react';
import { useQuiz } from '../hooks/useQuiz';
import { QuizConfigDialog } from './QuizConfigDialog';
import { QuizPlayer } from './QuizPlayer';
import { QuizResults } from './QuizResults';
import { toast } from 'sonner';
import api from '../utils/api';
import { useSearchParams } from 'react-router-dom';

interface QuizPageContainerProps {
    summaryId: string | null;
    fileName: string;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    onBack: () => void;
}

export const QuizPageContainer: React.FC<QuizPageContainerProps> = ({
    summaryId,
    fileName,
    theme,
    onThemeToggle,
    onBack,
}) => {
    const [searchParams] = useSearchParams();
    const quizIdParam = searchParams.get('quizId');

    const [configOpen, setConfigOpen] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [docTitle, setDocTitle] = useState(fileName.replace(/\.[^.]+$/, ''));

    const {
        isGenerating,
        isSubmitting,
        isLoadingHistory,
        error,
        activeQuiz,
        quizResults,
        quizHistory,
        generateQuiz,
        submitQuiz,
        loadQuiz,
        loadQuizHistory,
        resetQuizState,
    } = useQuiz(summaryId);

    // Fetch summary title and load quizIdParam if provided
    useEffect(() => {
        if (!summaryId) return;
        loadQuizHistory();

        if (quizIdParam) {
            loadQuiz(quizIdParam).catch((err) => {
                toast.error(err.message || 'Failed to load quiz');
                setConfigOpen(true);
            });
        }

        api.get(`/summaries/${summaryId}`)
            .then(({ data }) => {
                if (data?.fileName) {
                    setDocTitle(data.fileName.replace(/\.[^.]+$/, ''));
                }
            })
            .catch(() => { /* non-critical */ });
    }, [summaryId, quizIdParam, loadQuiz, loadQuizHistory]);

    // Animated loading step indicator
    useEffect(() => {
        if (!isGenerating) {
            setLoadingStep(0);
            return;
        }

        const steps = [
            'Analyzing document content...',
            'Identifying key concepts & formulas...',
            'Generating question distractors...',
            'Validating source grounding & answers...',
            'Preparing interactive quiz...',
        ];

        const interval = setInterval(() => {
            setLoadingStep(prev => (prev + 1) % steps.length);
        }, 2200);

        return () => clearInterval(interval);
    }, [isGenerating]);

    // Automatically open config dialog on first visit ONLY if no quiz is active and no quizIdParam provided
    useEffect(() => {
        if (!quizIdParam && !activeQuiz && !quizResults && !isGenerating && quizHistory.length === 0) {
            setConfigOpen(true);
        }
    }, [quizIdParam, activeQuiz, quizResults, isGenerating, quizHistory.length]);

    const handleStartGenerate = async (config: {
        questionCount: number;
        difficulty: 'easy' | 'medium' | 'hard';
        questionTypes: ('MCQ' | 'MSQ' | 'TRUE_FALSE')[];
        language: string;
    }) => {
        try {
            setConfigOpen(false);
            await generateQuiz(config);
            toast.success('Quiz generated successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate quiz');
        }
    };

    const handleSubmitAnswers = async (answers: Record<string, string[]>) => {
        if (!activeQuiz) return;
        try {
            await submitQuiz(activeQuiz._id, answers);
            toast.success('Quiz submitted!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit quiz');
        }
    };

    const handleSelectHistoryQuiz = async (quizId: string) => {
        try {
            await loadQuiz(quizId);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load quiz');
        }
    };

    const loadingMessages = [
        'Analyzing document content...',
        'Identifying key concepts & formulas...',
        'Generating question distractors...',
        'Validating source grounding & answers...',
        'Preparing interactive quiz...',
    ];

    const handleRetakeQuiz = async () => {
        if (!activeQuiz) return;
        const previousConfig = {
            questionCount: activeQuiz.questionCount || 10,
            difficulty: activeQuiz.difficulty || 'medium',
            questionTypes: activeQuiz.questionTypes || ['MCQ', 'MSQ', 'TRUE_FALSE'],
            language: activeQuiz.language || 'English',
        };

        try {
            await generateQuiz(previousConfig);
            toast.success('Generated a new quiz with your previous settings!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to generate new quiz');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
            {/* ── Top Navigation Header ────────────────────────────────────────── */}
            <header className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 print:hidden">
                <div className="w-full px-4 sm:px-12 lg:px-16 py-2 sm:py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
                            title="Back to Summary"
                        >
                            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>

                        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
                            <img
                                src="/icons/logo-transparent-192.png"
                                alt="OmniStudy Logo"
                                className="w-6 h-6 sm:w-8 sm:h-8"
                            />
                            <span className="brand-logo text-[18px] sm:text-[26px]">
                                OmniStudy <span className="brand-logo-ai">AI</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                resetQuizState();
                                setConfigOpen(true);
                            }}
                            className="rounded-full border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 gap-1.5 text-xs sm:text-sm font-semibold"
                        >
                            <Sparkles className="h-4 w-4" />
                            <span className="hidden sm:inline">New Quiz</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onThemeToggle}
                            className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
                        >
                            {theme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* ── Main Quiz Column ─────────────────────────────────────────────── */}
            <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 space-y-6 flex flex-col">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden shrink-0">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold line-clamp-1 leading-tight flex items-center gap-2.5">
                            <div className="p-1.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
                                <Brain className="h-5 w-5" />
                            </div>
                            Test Yourself — {docTitle}
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                            Interactive AI assessment with grounded question explanations, formulas, and immediate scoring
                        </p>
                    </div>

                    <Badge variant="outline" className="border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1 text-xs shrink-0 rounded-xl">
                        Interactive Quiz Mode
                    </Badge>
                </div>

                {/* Main Quiz Content Area */}
                <div className="flex-1 flex flex-col justify-center">
                    {/* 1. Loading State */}
                    {isGenerating && (
                        <div className="py-16 text-center space-y-6 max-w-xl mx-auto">
                            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-900 animate-ping opacity-30" />
                                <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-600/40">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
                                    Generating Your Quiz...
                                </h2>
                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 min-h-[24px]">
                                    {loadingMessages[loadingStep]}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    OmniStudy AI is scanning <strong className="text-gray-700 dark:text-gray-300">{docTitle}</strong> to build grounded questions, formulas, and explanations.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* 2. Error State */}
                    {error && !isGenerating && (
                        <div className="py-12 text-center space-y-5 max-w-md mx-auto">
                            <div className="w-14 h-14 mx-auto rounded-3xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-lg">
                                <X className="h-7 w-7" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                Quiz Generation Failed
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                {error}
                            </p>
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <Button
                                    onClick={() => setConfigOpen(true)}
                                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Try Again
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={onBack}
                                    className="rounded-xl text-xs"
                                >
                                    Return to Summary
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* 3. Interactive Quiz Player */}
                    {activeQuiz && !quizResults && !isGenerating && (
                        <div>
                            <QuizPlayer
                                quiz={activeQuiz}
                                onSubmit={handleSubmitAnswers}
                                isSubmitting={isSubmitting}
                                onCancel={onBack}
                            />
                        </div>
                    )}

                    {/* 4. Quiz Results & Review */}
                    {quizResults && !isGenerating && (
                        <div>
                            <QuizResults
                                results={quizResults}
                                onRetake={handleRetakeQuiz}
                                onGenerateNew={() => {
                                    resetQuizState();
                                    setConfigOpen(true);
                                }}
                                onBackToSummary={onBack}
                            />
                        </div>
                    )}

                    {/* 5. History Attempts Grid (if no active quiz and not loading) */}
                    {!activeQuiz && !quizResults && !isGenerating && !error && (
                        <div className="w-full space-y-5 py-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    Previous Quiz Attempts ({quizHistory.length})
                                </h3>
                                <Button
                                    onClick={() => {
                                        resetQuizState();
                                        setConfigOpen(true);
                                    }}
                                    className="rounded-xl hover:bg-blue-700 bg-blue-600 text-white gap-2 text-xs"
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Generate New Quiz
                                </Button>
                            </div>

                            {quizHistory.length === 0 ? (
                                <div className="py-16 text-center space-y-4 max-w-sm mx-auto">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm border border-blue-100 dark:border-blue-900">
                                        <Brain className="h-8 w-8 animate-pulse" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                            Ready to test your knowledge?
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Generate an interactive grounded quiz with questions, formulas, and step-by-step explanations.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => {
                                            resetQuizState();
                                            setConfigOpen(true);
                                        }}
                                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs gap-2"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Generate Quiz Now
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {quizHistory.map(q => (
                                        <Card
                                            key={q._id}
                                            onClick={() => handleSelectHistoryQuiz(q._id)}
                                            className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-600 cursor-pointer transition-all hover:shadow-md space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <Badge variant="outline" className="text-[10px] rounded-md uppercase font-semibold border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                                                    {q.difficulty}
                                                </Badge>
                                                <span className="text-[11px] text-gray-400 font-medium">
                                                    {q.questionCount} Qs · {q.language}
                                                </span>
                                            </div>

                                            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                                                {q.title || `Quiz (${q.questionCount} Qs)`}
                                            </h4>

                                            {q.lastScore ? (
                                                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200 dark:border-gray-800">
                                                    <span className="text-gray-400 text-[11px] font-medium">Score:</span>
                                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                                        {q.lastScore.percentage}% ({q.lastScore.score}/{q.lastScore.total})
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold pt-1">
                                                    Not submitted yet
                                                </p>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Configuration Dialog */}
            <QuizConfigDialog
                open={configOpen}
                onOpenChange={(val) => {
                    setConfigOpen(val);
                }}
                onGenerate={handleStartGenerate}
                isGenerating={isGenerating}
            />
        </div>
    );
};
