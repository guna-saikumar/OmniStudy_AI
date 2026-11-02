import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import MathText from './MathText';
import { QuizData } from '../hooks/useQuiz';

interface QuizPlayerProps {
    quiz: QuizData;
    onSubmit: (answers: Record<string, string[]>) => void;
    isSubmitting: boolean;
    onCancel?: () => void;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
    quiz,
    onSubmit,
    isSubmitting,
    onCancel,
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    // User answers map: { [questionId]: string[] }
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const questions = quiz.questions || [];
    const currentQ = questions[currentIndex];
    const totalQuestions = questions.length;

    if (!currentQ) return null;

    const currentAnswers = answers[currentQ.id] || [];

    // Handle single choice selection (MCQ and TRUE_FALSE)
    const handleSingleSelect = (val: string) => {
        setAnswers(prev => ({
            ...prev,
            [currentQ.id]: [val],
        }));
    };

    // Handle multiple choice selection (MSQ)
    const handleMSQToggle = (optionId: string) => {
        const existing = answers[currentQ.id] || [];
        const next = existing.includes(optionId)
            ? existing.filter(id => id !== optionId)
            : [...existing, optionId];

        setAnswers(prev => ({
            ...prev,
            [currentQ.id]: next,
        }));
    };

    const answeredCount = Object.keys(answers).filter(
        id => (answers[id] || []).length > 0
    ).length;

    const progressPercentage = Math.round(((currentIndex + 1) / totalQuestions) * 100);

    const handlePreSubmit = () => {
        if (answeredCount < totalQuestions) {
            setShowConfirmModal(true);
        } else {
            onSubmit(answers);
        }
    };

    const handleConfirmFinalSubmit = () => {
        setShowConfirmModal(false);
        onSubmit(answers);
    };

    return (
        <>
            <Card className="w-full max-w-4xl mx-auto rounded-3xl dark:bg-gray-950 border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
                {/* Header with Title & Meta */}
                <CardHeader className="bg-white/60 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800 p-5 sm:p-7">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
                                <HelpCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                                    {quiz.title}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider rounded-lg border-blue-300 text-blue-600 dark:border-blue-800 dark:text-blue-400">
                                        {quiz.difficulty}
                                    </Badge>
                                    <Badge variant="secondary" className="text-[10px] rounded-lg">
                                        {quiz.language}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {onCancel && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onCancel}
                                    className="text-xs text-gray-500 rounded-xl"
                                >
                                    Exit Quiz
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handlePreSubmit}
                                disabled={isSubmitting}
                                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 px-4 shadow-md shadow-blue-600/20"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                            </Button>
                        </div>
                    </div>

                    {/* Progress Bar & Counter */}
                    <div className="mt-5 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <span>
                                Question <strong className="text-blue-600 dark:text-blue-400">{currentIndex + 1}</strong> of {totalQuestions}
                            </span>
                            <span>
                                Answered: <strong className={answeredCount === totalQuestions ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-blue-600 dark:text-blue-400"}>{answeredCount}</strong> / {totalQuestions}
                            </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2 rounded-full bg-gray-100 dark:bg-gray-800" />
                    </div>

                    {/* Numbered Question Navigator Circles */}
                    <div className="flex flex-wrap gap-1.5 pt-3">
                        {questions.map((q, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isAnswered = (answers[q.id] || []).length > 0;
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs font-semibold transition-all flex items-center justify-center ${
                                        isCurrent
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105 ring-2 ring-blue-400 dark:ring-blue-500'
                                            : isAnswered
                                            ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                </CardHeader>

                {/* Question Body */}
                <CardContent className="p-6 sm:p-8 space-y-6">
                    {/* Question Type & Prompt */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[11px]">
                                    {currentQ.type === 'MCQ' && 'Multiple Choice'}
                                    {currentQ.type === 'MSQ' && 'Multiple Select'}
                                    {currentQ.type === 'TRUE_FALSE' && 'True / False'}
                                </Badge>
                                {currentQ.type === 'MSQ' && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        Select all correct answers
                                    </span>
                                )}
                            </div>

                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 leading-relaxed pt-1">
                                <MathText content={currentQ.question} inline />
                            </h3>
                        </div>
                    </div>

                    {/* MCQ Options (Radio Buttons) */}
                    {currentQ.type === 'MCQ' && (
                        <RadioGroup
                            value={currentAnswers[0] || ''}
                            onValueChange={handleSingleSelect}
                            className="space-y-3"
                        >
                            {currentQ.options.map(opt => {
                                const isSelected = currentAnswers.includes(opt.id);
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleSingleSelect(opt.id)}
                                        className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm'
                                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        <RadioGroupItem
                                            value={opt.id}
                                            id={`opt-${opt.id}`}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <Label
                                            htmlFor={`opt-${opt.id}`}
                                            className="flex-1 cursor-pointer text-sm sm:text-base font-medium text-gray-800 dark:text-gray-200"
                                        >
                                            <span className="inline-block w-6 font-bold text-blue-600 dark:text-blue-400">
                                                {opt.id}.
                                            </span>
                                            <MathText content={opt.text} inline />
                                        </Label>
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    )}

                    {/* MSQ Options (Checkboxes) */}
                    {currentQ.type === 'MSQ' && (
                        <div className="space-y-3">
                            {currentQ.options.map(opt => {
                                const isChecked = currentAnswers.includes(opt.id);
                                return (
                                    <div
                                        key={opt.id}
                                        onClick={() => handleMSQToggle(opt.id)}
                                        className={`flex items-center gap-4 p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                                            isChecked
                                                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-sm'
                                                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        <Checkbox
                                            id={`msq-opt-${opt.id}`}
                                            checked={isChecked}
                                            onCheckedChange={() => handleMSQToggle(opt.id)}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <Label
                                            htmlFor={`msq-opt-${opt.id}`}
                                            className="flex-1 cursor-pointer text-sm sm:text-base font-medium text-gray-800 dark:text-gray-200"
                                        >
                                            <span className="inline-block w-6 font-bold text-blue-600 dark:text-blue-400">
                                                {opt.id}.
                                            </span>
                                            <MathText content={opt.text} inline />
                                        </Label>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* True / False Options */}
                    {currentQ.type === 'TRUE_FALSE' && (
                        <RadioGroup
                            value={currentAnswers[0] || ''}
                            onValueChange={handleSingleSelect}
                            className="grid grid-cols-2 gap-4"
                        >
                            {[
                                { id: 'TRUE', label: 'True' },
                                { id: 'FALSE', label: 'False' },
                            ].map(opt => {
                                const isSelected = currentAnswers.includes(opt.id);
                                return (
                                    <div key={opt.id}>
                                        <RadioGroupItem
                                            value={opt.id}
                                            id={`tf-opt-${opt.id}`}
                                            className="peer sr-only"
                                        />
                                        <Label
                                            htmlFor={`tf-opt-${opt.id}`}
                                            className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 text-center cursor-pointer font-bold text-base sm:text-lg transition-all ${
                                                isSelected
                                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shadow-md'
                                                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                                            }`}
                                        >
                                            {opt.label}
                                        </Label>
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    )}
                </CardContent>

                {/* Footer Navigation */}
                <CardFooter className="bg-gray-50/50 dark:bg-white/5 border-t border-gray-100 dark:border-gray-800 p-4 sm:p-6 flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                        className="rounded-xl border-gray-200 dark:border-gray-700 text-xs sm:text-sm gap-1"
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>

                    {currentIndex < totalQuestions - 1 ? (
                        <Button
                            onClick={() => setCurrentIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm gap-1"
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePreSubmit}
                            disabled={isSubmitting}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm gap-1.5 shadow-md shadow-blue-600/20"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            {isSubmitting ? 'Submitting...' : 'Finish & Submit'}
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {/* Warning Dialog when user submits with unanswered questions */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="sm:max-w-[440px] rounded-3xl dark:bg-gray-900 dark:border-gray-800 p-6">
                    <DialogHeader className="space-y-3 text-left">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg sm:text-xl font-bold dark:text-white">
                                    Unanswered Questions
                                </DialogTitle>
                                <DialogDescription className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Please confirm before ending your quiz session.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-3 text-sm text-gray-700 dark:text-gray-300 space-y-2">
                        {answeredCount === 0 ? (
                            <p className="font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                                ⚠️ You haven't solved or answered any questions yet!
                            </p>
                        ) : (
                            <p className="font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
                                ⚠️ You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions. There are <strong>{totalQuestions - answeredCount}</strong> unanswered questions remaining.
                            </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            If you finish now, unanswered questions will be marked as incorrect in your final evaluation. Do you still want to submit and end the quiz?
                        </p>
                    </div>

                    <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowConfirmModal(false)}
                            className="rounded-xl text-xs border-gray-200 dark:border-gray-700"
                        >
                            Continue Solving
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmFinalSubmit}
                            disabled={isSubmitting}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20"
                        >
                            Submit & End Quiz
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
