"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
// ── Sub-schemas ──────────────────────────────────────────────────────────────
const optionSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
}, { _id: false });
const questionSchema = new mongoose_1.Schema({
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
}, { _id: false });
const submissionSchema = new mongoose_1.Schema({
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
}, { _id: true });
// ── Main Quiz Schema ────────────────────────────────────────────────────────
const quizSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    summary: {
        type: mongoose_1.Schema.Types.ObjectId,
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
}, {
    timestamps: true,
});
// Index for efficient lookups
quizSchema.index({ summary: 1, user: 1 });
const Quiz = (0, mongoose_1.model)('Quiz', quizSchema);
exports.default = Quiz;
