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
exports.correctOCRText = exports.generateFromOCR = exports.uploadAndOCR = exports.imageUpload = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const multer_1 = __importDefault(require("multer"));
const Summary_1 = __importDefault(require("../models/Summary"));
const aiService_1 = require("../services/aiService");
const imagePreprocessService_1 = require("../services/imagePreprocessService");
const ocrService_1 = require("../services/ocrService");
// ─── Multer config for image/PDF uploads ────────────────────────────────────
const imageStorage = multer_1.default.memoryStorage();
exports.imageUpload = (0, multer_1.default)({
    storage: imageStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
    fileFilter: (_req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'application/pdf',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only JPG, PNG, WEBP images and PDF files are supported for handwritten upload'));
        }
    },
});
// ─── POST /api/ocr/upload ────────────────────────────────────────────────────
exports.uploadAndOCR = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No file uploaded');
    }
    const { mimetype, buffer, originalname } = req.file;
    // ── Handle PDFs via Gemini Files API (native PDF OCR, no ghostscript) ──
    if (mimetype === 'application/pdf') {
        console.log(`[OCR Controller] PDF received: ${originalname} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
        let ocrResult;
        try {
            ocrResult = await (0, ocrService_1.performPDFOCR)(buffer, originalname);
        }
        catch (err) {
            res.status(422);
            throw new Error(`Could not extract text from this PDF. ${err.message}. ` +
                `If this is a very large file, try uploading individual page photos instead.`);
        }
        if (!ocrResult.fullText || ocrResult.fullText.trim().length < 20) {
            res.status(422);
            throw new Error('No readable text found in this PDF. Please try uploading a clearer scan or individual page photos.');
        }
        res.json({
            ocrText: ocrResult.fullText,
            confidence: 0.88,
            words: ocrResult.words,
            pageCount: ocrResult.pageCount,
            engine: ocrResult.engine,
            fileName: originalname,
        });
        return;
    }
    // ── Handle images (JPEG / PNG / WEBP) ────────────────────────────────────
    let imageBuffer = buffer;
    let ocrMimeType = mimetype;
    try {
        imageBuffer = await (0, imagePreprocessService_1.preprocessImage)(buffer);
        ocrMimeType = 'image/png'; // sharp always outputs PNG
    }
    catch (err) {
        console.warn('[OCR Controller] Preprocessing failed, using raw buffer:', err.message);
    }
    const ocrResult = await (0, ocrService_1.performOCR)(imageBuffer, ocrMimeType);
    if (!ocrResult.fullText || ocrResult.fullText.trim().length < 15) {
        res.status(422);
        throw new Error('Extracted text is too short. Please upload a clearer image with visible handwriting.');
    }
    res.json({
        ocrText: ocrResult.fullText,
        confidence: ocrResult.words.length > 0
            ? ocrResult.words.reduce((sum, w) => sum + w.confidence, 0) / ocrResult.words.length
            : 0.85,
        words: ocrResult.words,
        pageCount: 1,
        engine: ocrResult.engine,
        fileName: originalname,
    });
});
// ─── POST /api/ocr/generate ──────────────────────────────────────────────────
exports.generateFromOCR = (0, express_async_handler_1.default)(async (req, res) => {
    const { ocrText, fileName, pageCount } = req.body;
    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 30) {
        res.status(400);
        throw new Error('Invalid or empty OCR text provided');
    }
    if (!process.env.GEMINI_API_KEY) {
        res.status(500);
        throw new Error('Gemini API key is not configured.');
    }
    const safeName = (fileName && typeof fileName === 'string') ? fileName : 'Handwritten Notes';
    let aiContent;
    try {
        aiContent = await (0, aiService_1.generateSummaryFromText)(ocrText.trim(), safeName);
    }
    catch (err) {
        res.status(502);
        throw new Error(`AI generation failed: ${err.message}`);
    }
    const summary = await Summary_1.default.create({
        user: req.user._id,
        fileName: safeName,
        fileSize: Buffer.byteLength(ocrText, 'utf-8'),
        pages: pageCount || 1,
        summaryType: 'Text View',
        status: 'Completed',
        content: aiContent,
        pdfText: ocrText.trim(),
        sourceType: 'handwritten',
    });
    res.status(201).json(summary);
});
// ─── POST /api/ocr/correct ───────────────────────────────────────────────────
// Accepts raw OCR text and uses Gemini to auto-correct typos, OCR misreadings,
// broken math formulas, and LaTeX syntax errors.
exports.correctOCRText = (0, express_async_handler_1.default)(async (req, res) => {
    const { ocrText } = req.body;
    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 5) {
        res.status(400);
        throw new Error('Invalid or empty text provided for AI correction');
    }
    if (!process.env.GEMINI_API_KEY) {
        res.status(500);
        throw new Error('Gemini API key is not configured.');
    }
    const { GoogleGenerativeAI } = await Promise.resolve().then(() => __importStar(require('@google/generative-ai')));
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are an expert AI proofreader and mathematical equation corrector.
Your task is to take OCR-extracted text (which may contain spelling errors, misrecognized words, broken mathematical formulas, incorrect LaTeX syntax, or garbled characters from handwriting/scans) and automatically correct and clean it up.

Rules:
1. Fix all spelling, grammar, and word recognition errors caused by OCR.
2. Fix broken mathematical formulas, equations, and symbols. Convert all mathematical equations, formulas, variables, and expressions into clean, valid LaTeX notation wrapped in $...$ (inline math) or $$...$$ (block math).
3. Preserve the original meaning, structure, headings, bullet points, and information completely. Do NOT summarize or omit content.
4. Output ONLY the corrected text. Do NOT add preamble, conversational notes, or markdown code block markers (no \`\`\` wrappers).

Input Text:
"""
${ocrText.trim()}
"""`;
    try {
        const result = await model.generateContent(prompt);
        let correctedText = result.response.text().trim();
        // Clean up markdown code block markers if AI included them
        if (correctedText.startsWith('```')) {
            correctedText = correctedText.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
        }
        res.json({ correctedText });
    }
    catch (err) {
        res.status(502);
        throw new Error(`AI text correction failed: ${err.message}`);
    }
});
