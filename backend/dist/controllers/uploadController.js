"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAndGenerateSummary = exports.upload = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const multer_1 = __importDefault(require("multer"));
// pdf-parse v2 uses a class-based API
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth');
const Summary_1 = __importDefault(require("../models/Summary"));
const aiService_1 = require("../services/aiService");
// Configure multer for in-memory PDF uploads (no disk storage)
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Allowed 50MB max for larger documents
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.ms-powerpoint'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('PDF, DOCX, PPT, and TXT files only are allowed'));
        }
    },
});
// @desc    Upload PDF and generate AI summary
// @route   POST /api/summaries/upload
// @access  Private
exports.uploadAndGenerateSummary = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No PDF file uploaded');
    }
    if (!process.env.GEMINI_API_KEY) {
        res.status(500);
        throw new Error('Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.');
    }
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    // Extract text based on file type
    let pdfText = '';
    let pages = 1;
    try {
        if (req.file.mimetype === 'application/pdf') {
            const parser = new PDFParse({ data: req.file.buffer });
            const pdfData = await parser.getText();
            pdfText = pdfData.pages.map((p) => p.text).join('\n');
            pages = pdfData.pages.length || 1;
        }
        else if (req.file.mimetype === 'text/plain') {
            pdfText = req.file.buffer.toString('utf-8');
            pages = Math.ceil(pdfText.length / 2000) || 1;
        }
        else if (req.file.mimetype.includes('wordprocessingml') || req.file.mimetype.includes('msword')) {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            pdfText = result.value;
            pages = Math.ceil(pdfText.length / 2000) || 1;
        }
        else if (req.file.mimetype.includes('presentationml') || req.file.mimetype.includes('powerpoint')) {
            // office-text-extractor 4.x is ESM only, use dynamic import
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { getTextExtractor } = await Promise.resolve().then(() => __importStar(require('office-text-extractor')));
            const extractor = getTextExtractor();
            pdfText = await extractor.extractText({ input: req.file.buffer, type: 'buffer' });
            pages = Math.ceil(pdfText.length / 2000) || 1;
        }
        else {
            throw new Error('Unsupported file type');
        }
    }
    catch (err) {
        console.error('[Text Extraction Error]', err.message);
        res.status(422);
        throw new Error(`Could not extract text from file: ${err.message}`);
    }
    // Enforce 100-page limit
    if (pages > 100) {
        res.status(422);
        throw new Error(`The uploaded file has ${pages} pages. The maximum limit is 100 pages to ensure generation quality.`);
    }
    if (!pdfText || pdfText.trim().length < 50) {
        res.status(422);
        throw new Error('The file appears to be empty or does not contain readable text.');
    }
    // Generate all 6 summary modes using OpenAI
    let aiContent;
    try {
        aiContent = await (0, aiService_1.generateSummaryFromText)(pdfText, fileName);
    }
    catch (err) {
        res.status(502);
        throw new Error(`AI generation failed: ${err.message}`);
    }
    // Save to MongoDB
    const summary = await Summary_1.default.create({
        user: req.user._id,
        fileName,
        fileSize,
        pages,
        summaryType: 'Text View',
        status: 'Completed',
        content: aiContent,
        pdfText: pdfText,
    });
    res.status(201).json(summary);
});
