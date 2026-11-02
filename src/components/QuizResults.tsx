import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    CheckCircle2,
    XCircle,
    RotateCcw,
    Sparkles,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Trophy,
    Target,
} from 'lucide-react';
import MathText from './MathText';
import { QuizResultsData } from '../hooks/useQuiz';

interface QuizResultsProps {
    results: QuizResultsData;
    onRetake: () => void;
    onGenerateNew: () => void;
    onBackToSummary: () => void;
}

export const QuizResults: React.FC<QuizResultsProps> = ({
    results,
    onRetake,
    onGenerateNew,
    onBackToSummary,
}) => {
    const [showReview, setShowReview] = useState(true);

    const { score, total, percentage, breakdown, questions } = results;

    const getPerformanceMessage = (pct: number) => {
        if (pct >= 90) return { title: 'Outstanding Performance!', desc: 'You have mastered this topic.', color: 'text-emerald-500' };
        if (pct >= 75) return { title: 'Great job!', desc: 'Solid understanding of the concepts.', color: 'text-blue-600 dark:text-blue-400' };
        if (pct >= 50) return { title: 'Good Effort!', desc: 'Review the explanations below to improve.', color: 'text-amber-500' };
        return { title: 'Keep Studying!', desc: 'Re-read the summary and try again.', color: 'text-red-500' };
    };

    const perf = getPerformanceMessage(percentage);

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Main Score Overview Card */}
            <Card className="rounded-3xl dark:bg-gray-950 border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden text-center p-6 sm:p-10">
                <CardHeader className="p-0 space-y-3">
                    <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                        <Trophy className="h-8 w-8 sm:h-10 sm:w-10" />
                    </div>
                    <CardTitle className={`text-2xl sm:text-3xl font-black ${perf.color}`}>
                        {perf.title}
                    </CardTitle>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {perf.desc}
                    </p>
                </CardHeader>

                <CardContent className="p-0 pt-6 space-y-6">
                    {/* Big Score Display */}
                    <div className="inline-flex flex-col items-center justify-center p-6 rounded-3xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 min-w-[220px]">
                        <span className="text-4xl sm:text-5xl font-black text-blue-600 dark:text-blue-400">
                            {percentage}%
                        </span>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">
                            {score} / {total} Correct
                        </span>
                    </div>

                    {/* Breakdown by Type */}
                    {breakdown && (
                        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                            {breakdown.MCQ?.total > 0 && (
                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">
                                        MCQ
                                    </p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                        {breakdown.MCQ.correct} / {breakdown.MCQ.total}
                                    </p>
                                </div>
                            )}
                            {breakdown.MSQ?.total > 0 && (
                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">
                                        MSQ
                                    </p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                        {breakdown.MSQ.correct} / {breakdown.MSQ.total}
                                    </p>
                                </div>
                            )}
                            {breakdown.TRUE_FALSE?.total > 0 && (
                                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase">
                                        True / False
                                    </p>
                                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                        {breakdown.TRUE_FALSE.correct} / {breakdown.TRUE_FALSE.total}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowReview(!showReview)}
                            className="rounded-xl border-gray-200 dark:border-gray-700 text-xs sm:text-sm gap-1.5"
                        >
                            <Target className="h-4 w-4" />
                            {showReview ? 'Hide Answer Review' : 'Review Answers'}
                            {showReview ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onRetake}
                            className="rounded-xl border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 text-xs sm:text-sm gap-1.5"
                        >
                            <RotateCcw className="h-4 w-4" />
                            Retake Quiz
                        </Button>
                        <Button
                            onClick={onGenerateNew}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm gap-1.5 shadow-md shadow-blue-600/20"
                        >
                            <Sparkles className="h-4 w-4" />
                            Generate New Quiz
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Question-by-Question Review Section */}
            {showReview && (
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 px-1">
                        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        Detailed Answer Review
                    </h3>

                    {questions.map((q, idx) => {
                        const isCorrect = q.isCorrect;
                        return (
                            <Card
                                key={q.id || idx}
                                className={`rounded-2xl dark:bg-gray-950 border-2 transition-all p-5 sm:p-6 ${
                                    isCorrect
                                        ? 'border-emerald-200 dark:border-emerald-950/80 bg-emerald-50/10'
                                        : 'border-red-200 dark:border-red-950/80 bg-red-50/10'
                                }`}
                            >
                                <div className="space-y-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-gray-500 dark:text-gray-400">
                                                Q{idx + 1}.
                                            </span>
                                            <Badge variant="outline" className="text-[10px] rounded-md">
                                                {q.type}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {isCorrect ? (
                                                <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 text-xs gap-1">
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Correct
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 text-xs gap-1">
                                                    <XCircle className="h-3.5 w-3.5 text-red-600" /> Incorrect
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Question Text */}
                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        <MathText content={q.question} inline />
                                    </h4>

                                    {/* Options List */}
                                    <div className="space-y-2 pt-1">
                                        {q.options.map(opt => {
                                            const isUserAnswer = (q.userAnswer || []).includes(opt.id);
                                            const isCorrectAnswer = (q.correctAnswer || []).includes(opt.id);

                                            let style = 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900';
                                            if (isCorrectAnswer) {
                                                style = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold';
                                            } else if (isUserAnswer && !isCorrectAnswer) {
                                                style = 'border-red-400 bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200';
                                            }

                                            return (
                                                <div
                                                    key={opt.id}
                                                    className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm ${style}`}
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-bold text-xs opacity-75">{opt.id}.</span>
                                                        <span>
                                                            <MathText content={opt.text} inline />
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {isUserAnswer && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 font-medium">
                                                                Your Answer
                                                            </span>
                                                        )}
                                                        {isCorrectAnswer && (
                                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Explanation & Source */}
                                    {q.explanation && (
                                        <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 text-xs sm:text-sm space-y-1">
                                            <p className="font-semibold text-blue-900 dark:text-blue-300">Explanation:</p>
                                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                                <MathText content={q.explanation} inline />
                                            </p>
                                            {q.sourceReference && (
                                                <p className="text-[11px] text-blue-600 dark:text-blue-400 pt-1 font-medium">
                                                    Source: {q.sourceReference}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
