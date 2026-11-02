import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    Sparkles,
    Trophy,
    X,
    History,
} from 'lucide-react';
import { useQuiz } from '../hooks/useQuiz';

interface QuizSectionProps {
    summaryId: string | null;
    docTitle: string;
    fileName: string;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    activeLanguage?: string;
}

export const QuizSection: React.FC<QuizSectionProps> = ({
    summaryId,
    activeLanguage = 'English',
}) => {
    const navigate = useNavigate();
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

    const { quizHistory, loadQuizHistory } = useQuiz(summaryId);

    // Load quiz history on mount
    useEffect(() => {
        if (summaryId) {
            loadQuizHistory();
        }
    }, [summaryId, loadQuizHistory]);

    const handleTestYourselfClick = () => {
        if (summaryId) {
            navigate(`/quiz/${summaryId}`);
        }
    };

    return (
        <div className="sticky bottom-[20px] left-0 right-0 z-50 print:hidden pointer-events-none">
            <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 flex justify-end">
                <div className="pointer-events-auto flex flex-col items-end gap-3 pr-4 sm:pr-8 lg:pr-12">
                    {/* Sticky Action Controls */}
                    <div className="flex items-center gap-3">
                        {/* History Button (if history exists) */}
                        {quizHistory && quizHistory.length > 0 && (
                            <Button
                                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                                size="icon"
                                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-gray-800 transition-all hover:scale-105"
                                title="Quiz History"
                            >
                                <History className="h-4 w-4" />
                            </Button>
                        )}

                        {/* Main "Test Yourself" Button */}
                        <Button
                            onClick={handleTestYourselfClick}
                            className="rounded-full h-9 sm:h-10 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-xl shadow-blue-600/40 border border-blue-300/30 hover:scale-105 active:scale-95 transition-all duration-300 gap-2 group"
                        >
                            <div className="p-1 rounded-full bg-white/20 text-white group-hover:rotate-12 transition-transform">
                                <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                            </div>
                            <span className="tracking-wide font-bold">
                                Test Yourself
                            </span>
                        </Button>
                    </div>

                    {/* Previous Quiz History Dropdown Panel */}
                    {showHistoryDropdown && quizHistory && quizHistory.length > 0 && (
                        <div className="w-80 bg-white dark:bg-gray-900 border border-blue-200 dark:border-gray-800 rounded-3xl shadow-2xl p-4 space-y-3 mt-2 animate-in fade-in slide-in-from-top-4 duration-200 text-gray-900 dark:text-gray-100 max-h-80 overflow-y-auto">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-gray-100 dark:border-gray-800 pb-2.5">
                                <span className="flex items-center gap-1.5">
                                    <Trophy className="h-4 w-4" /> Quiz History ({quizHistory.length})
                                </span>
                                <button
                                    onClick={() => setShowHistoryDropdown(false)}
                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="space-y-2 pt-1">
                                {quizHistory.map(q => (
                                    <div
                                        key={q._id}
                                        onClick={() => {
                                            if (summaryId) {
                                                navigate(`/quiz/${summaryId}?quizId=${q._id}`);
                                            }
                                        }}
                                        className="p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-all flex items-center justify-between"
                                    >
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-semibold truncate max-w-[170px]">{q.title}</p>
                                            <p className="text-[10px] text-gray-500">{q.questionCount} Qs · {q.difficulty}</p>
                                        </div>
                                        {q.lastScore ? (
                                            <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 text-xs font-bold">
                                                {q.lastScore.percentage}%
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-300">
                                                New
                                            </Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
