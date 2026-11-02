import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { HelpCircle, Sparkles, AlertCircle } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../hooks/useTranslation';

interface QuizConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerate: (config: {
        questionCount: number;
        difficulty: 'easy' | 'medium' | 'hard';
        questionTypes: ('MCQ' | 'MSQ' | 'TRUE_FALSE')[];
        language: string;
    }) => void;
    isGenerating: boolean;
    defaultLanguage?: string;
}

export const QuizConfigDialog: React.FC<QuizConfigDialogProps> = ({
    open,
    onOpenChange,
    onGenerate,
    isGenerating,
    defaultLanguage = 'English',
}) => {
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>({
        MCQ: true,
        MSQ: true,
        TRUE_FALSE: true,
    });
    const [language, setLanguage] = useState<string>(defaultLanguage);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleTypeToggle = (type: 'MCQ' | 'MSQ' | 'TRUE_FALSE') => {
        const next = { ...selectedTypes, [type]: !selectedTypes[type] };
        setSelectedTypes(next);
        if (Object.values(next).some(Boolean)) {
            setErrorMsg(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const activeTypes = (['MCQ', 'MSQ', 'TRUE_FALSE'] as const).filter(
            t => selectedTypes[t]
        );

        if (activeTypes.length === 0) {
            setErrorMsg('Please select at least one question type.');
            return;
        }

        onGenerate({
            questionCount,
            difficulty,
            questionTypes: activeTypes,
            language,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-[500px] rounded-3xl dark:bg-gray-900 dark:border-gray-800 p-6 sm:p-8"
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader className="space-y-3 text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                            <HelpCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl sm:text-2xl font-bold dark:text-white">
                                Test Yourself
                            </DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                Generate an interactive quiz from your document content
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 my-2">
                    {/* Number of Questions */}
                    <div className="space-y-2.5">
                        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            Number of Questions
                        </Label>
                        <RadioGroup
                            value={String(questionCount)}
                            onValueChange={val => setQuestionCount(Number(val))}
                            className="grid grid-cols-4 gap-2"
                        >
                            {[5, 10, 15, 20].map(count => (
                                <div key={count}>
                                    <RadioGroupItem
                                        value={String(count)}
                                        id={`count-${count}`}
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor={`count-${count}`}
                                        className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-950/40 peer-data-[state=checked]:text-blue-600 dark:peer-data-[state=checked]:text-blue-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
                                    >
                                        {count}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2.5">
                        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            Difficulty Level
                        </Label>
                        <RadioGroup
                            value={difficulty}
                            onValueChange={val => setDifficulty(val as any)}
                            className="grid grid-cols-3 gap-2"
                        >
                            {[
                                { id: 'easy', label: 'Easy', desc: 'Factual recall' },
                                { id: 'medium', label: 'Medium', desc: 'Concept understanding' },
                                { id: 'hard', label: 'Hard', desc: 'Deep reasoning' },
                            ].map(item => (
                                <div key={item.id}>
                                    <RadioGroupItem
                                        value={item.id}
                                        id={`diff-${item.id}`}
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor={`diff-${item.id}`}
                                        className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-950/40 peer-data-[state=checked]:text-blue-600 dark:peer-data-[state=checked]:text-blue-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
                                    >
                                        <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 peer-data-[state=checked]:text-blue-600 dark:peer-data-[state=checked]:text-blue-400">
                                            {item.label}
                                        </span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                                            {item.desc}
                                        </span>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Question Types */}
                    <div className="space-y-2.5">
                        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            Question Types (Select multiple)
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {[
                                { id: 'MCQ', title: 'MCQ', desc: 'Single choice' },
                                { id: 'MSQ', title: 'MSQ', desc: 'Multiple select' },
                                { id: 'TRUE_FALSE', title: 'True / False', desc: 'Boolean check' },
                            ].map(item => {
                                const checked = !!selectedTypes[item.id];
                                return (
                                    <div
                                        key={item.id}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleTypeToggle(item.id as any);
                                        }}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                            checked
                                                ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                                        }`}
                                    >
                                        <Checkbox
                                            id={`type-${item.id}`}
                                            checked={checked}
                                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 pointer-events-none"
                                        />
                                        <div>
                                            <p className="text-xs font-semibold">{item.title}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{item.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {errorMsg && (
                            <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}
                    </div>

                    {/* Language */}
                    <div className="space-y-2.5">
                        <Label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            Language
                        </Label>
                        <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <SelectValue placeholder="Select Language" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <SelectItem key={lang.code} value={lang.name}>
                                        {lang.name} ({lang.native})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl border-gray-200 dark:border-gray-700"
                            disabled={isGenerating}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isGenerating}
                            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Sparkles className="h-4 w-4" />
                            {isGenerating ? 'Generating Quiz...' : 'Generate Quiz'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
