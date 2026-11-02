import { Schema, model, Document, Types } from 'mongoose';

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const optionSchema = new Schema(
    {
        id: { type: String, required: true },
        text: { type: String, required: true },
    },
    { _id: false }
);

const questionSchema = new Schema(
    {
        id: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ['MCQ', 'MSQ', 'TRUE_FALSE'],
        },
        question: { type: String, required: true },
        options: { type: [optionSchema], required: true },
        correctAnswer: { type: [String], required: true },
        explanation: { type: String, default: '' },
        sourceReference: { type: String, default: '' },
    },
    { _id: false }
);

const submissionSchema = new Schema(
    {
        answers: { type: Map, of: [String] },
        score: { type: Number, required: true },
        total: { type: Number, required: true },
        percentage: { type: Number, required: true },
        breakdown: {
            MCQ: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
            MSQ: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
            TRUE_FALSE: { correct: { type: Number, default: 0 }, total: { type: Number, default: 0 } },
        },
        submittedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

// ── Main Quiz Schema ────────────────────────────────────────────────────────

const quizSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        summary: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Summary',
        },
        title: { type: String, default: 'Test Yourself' },
        language: { type: String, default: 'English' },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            default: 'medium',
        },
        questionCount: { type: Number, required: true },
        questionTypes: {
            type: [String],
            enum: ['MCQ', 'MSQ', 'TRUE_FALSE'],
            required: true,
        },
        questions: { type: [questionSchema], required: true },
        submissions: { type: [submissionSchema], default: [] },
    },
    {
        timestamps: true,
    }
);

// Index for efficient lookups
quizSchema.index({ summary: 1, user: 1 });

export interface IQuiz extends Document {
    user: Types.ObjectId;
    summary: Types.ObjectId;
    title: string;
    language: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questionCount: number;
    questionTypes: ('MCQ' | 'MSQ' | 'TRUE_FALSE')[];
    questions: {
        id: string;
        type: 'MCQ' | 'MSQ' | 'TRUE_FALSE';
        question: string;
        options: { id: string; text: string }[];
        correctAnswer: string[];
        explanation: string;
        sourceReference: string;
    }[];
    submissions: {
        answers: Map<string, string[]>;
        score: number;
        total: number;
        percentage: number;
        breakdown: {
            MCQ: { correct: number; total: number };
            MSQ: { correct: number; total: number };
            TRUE_FALSE: { correct: number; total: number };
        };
        submittedAt: Date;
    }[];
}

const Quiz = model<IQuiz>('Quiz', quizSchema);
export default Quiz;
