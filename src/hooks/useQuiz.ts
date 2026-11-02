import { useState, useCallback } from 'react';
import api from '../utils/api';

export interface QuizQuestionOption {
    id: string;
    text: string;
}

export interface QuizQuestion {
    id: string;
    type: 'MCQ' | 'MSQ' | 'TRUE_FALSE';
    question: string;
    options: QuizQuestionOption[];
    correctAnswer: string[];
    userAnswer?: string[];
    isCorrect?: boolean;
    explanation: string;
    sourceReference: string;
}

export interface QuizSubmissionBreakdown {
    MCQ: { correct: number; total: number };
    MSQ: { correct: number; total: number };
    TRUE_FALSE: { correct: number; total: number };
}

export interface QuizResultsData {
    submissionId: string | null;
    score: number;
    total: number;
    percentage: number;
    breakdown: QuizSubmissionBreakdown;
    questions: QuizQuestion[];
}

export interface QuizData {
    _id: string;
    title: string;
    language: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questionCount: number;
    questionTypes: ('MCQ' | 'MSQ' | 'TRUE_FALSE')[];
    questions: QuizQuestion[];
    lastScore?: { score: number; total: number; percentage: number } | null;
    attemptCount?: number;
    createdAt?: string;
}

export interface QuizGenerateOptions {
    summaryId: string;
    questionCount: number;
    difficulty: 'easy' | 'medium' | 'hard';
    questionTypes: ('MCQ' | 'MSQ' | 'TRUE_FALSE')[];
    language: string;
}

export function useQuiz(summaryId: string | null) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activeQuiz, setActiveQuiz] = useState<QuizData | null>(null);
    const [quizResults, setQuizResults] = useState<QuizResultsData | null>(null);
    const [quizHistory, setQuizHistory] = useState<QuizData[]>([]);

    // Fetch quiz history for a summary
    const loadQuizHistory = useCallback(async () => {
        if (!summaryId) return;
        setIsLoadingHistory(true);
        try {
            const { data } = await api.get(`/quiz/summary/${summaryId}`);
            setQuizHistory(data || []);
        } catch (err: any) {
            console.error('Failed to load quiz history:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    }, [summaryId]);

    // Generate a new quiz
    const generateQuiz = useCallback(async (options: Omit<QuizGenerateOptions, 'summaryId'>) => {
        if (!summaryId) return null;
        setIsGenerating(true);
        setError(null);
        setActiveQuiz(null);
        setQuizResults(null);

        try {
            const { data } = await api.post('/quiz/generate', {
                summaryId,
                ...options,
            });

            setActiveQuiz(data);
            setIsGenerating(false);
            return data as QuizData;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Quiz generation failed';
            setError(msg);
            setIsGenerating(false);
            throw new Error(msg);
        }
    }, [summaryId]);

    // Submit quiz answers
    const submitQuiz = useCallback(async (quizId: string, answers: Record<string, string[]>) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const { data } = await api.post(`/quiz/${quizId}/submit`, { answers });
            setQuizResults(data);
            setIsSubmitting(false);
            loadQuizHistory(); // Refresh history
            return data as QuizResultsData;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Quiz submission failed';
            setError(msg);
            setIsSubmitting(false);
            throw new Error(msg);
        }
    }, [loadQuizHistory]);

    // Fetch an existing quiz by ID
    const loadQuiz = useCallback(async (quizId: string) => {
        setError(null);
        try {
            const { data } = await api.get(`/quiz/${quizId}`);
            setActiveQuiz(data);

            if (data.submissions && data.submissions.length > 0) {
                const lastSub = data.submissions[data.submissions.length - 1];
                const answersMap: Record<string, string[]> = lastSub.answers
                    ? (lastSub.answers instanceof Map ? Object.fromEntries(lastSub.answers) : lastSub.answers)
                    : {};

                setQuizResults({
                    submissionId: lastSub._id || null,
                    score: lastSub.score,
                    total: lastSub.total,
                    percentage: lastSub.percentage,
                    breakdown: lastSub.breakdown || {
                        MCQ: { correct: 0, total: 0 },
                        MSQ: { correct: 0, total: 0 },
                        TRUE_FALSE: { correct: 0, total: 0 },
                    },
                    questions: (data.questions || []).map((q: any) => {
                        const userAns = answersMap[q.id] || [];
                        const isCorrect =
                            userAns.length === q.correctAnswer.length &&
                            userAns.every((a: string) => q.correctAnswer.includes(a)) &&
                            q.correctAnswer.every((a: string) => userAns.includes(a));

                        return {
                            ...q,
                            userAnswer: userAns,
                            isCorrect,
                        };
                    }),
                });
            } else {
                setQuizResults(null);
            }

            return data as QuizData;
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Failed to load quiz';
            setError(msg);
            throw new Error(msg);
        }
    }, []);

    const resetQuizState = useCallback(() => {
        setActiveQuiz(null);
        setQuizResults(null);
        setError(null);
    }, []);

    return {
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
    };
}
