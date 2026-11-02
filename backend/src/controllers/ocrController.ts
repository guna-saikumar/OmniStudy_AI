import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
import Summary from '../models/Summary';
import { generateSummaryFromText } from '../services/aiService';
import { preprocessImage } from '../services/imagePreprocessService';
import { performOCR, performPDFOCR } from '../services/ocrService';

// ─── Multer config for image/PDF uploads ────────────────────────────────────

const imageStorage = multer.memoryStorage();

export const imageUpload = multer({
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
        } else {
            cb(new Error('Only JPG, PNG, WEBP images and PDF files are supported for handwritten upload'));
        }
    },
});

// ─── POST /api/ocr/upload ────────────────────────────────────────────────────

export const uploadAndOCR = asyncHandler(async (req: Request, res: Response) => {
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
            ocrResult = await performPDFOCR(buffer, originalname);
        } catch (err: any) {
            res.status(422);
            throw new Error(
                `Could not extract text from this PDF. ${err.message}. ` +
                `If this is a very large file, try uploading individual page photos instead.`
            );
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
    let imageBuffer: Buffer = buffer;
    let ocrMimeType = mimetype;

    try {
        imageBuffer = await preprocessImage(buffer);
        ocrMimeType = 'image/png'; // sharp always outputs PNG
    } catch (err: any) {
        console.warn('[OCR Controller] Preprocessing failed, using raw buffer:', err.message);
    }

    const ocrResult = await performOCR(imageBuffer, ocrMimeType);

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

export const generateFromOCR = asyncHandler(async (req: Request, res: Response) => {
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
        aiContent = await generateSummaryFromText(ocrText.trim(), safeName);
    } catch (err: any) {
        res.status(502);
        throw new Error(`AI generation failed: ${err.message}`);
    }

    const summary = await Summary.create({
        user: (req as any).user._id,
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

export const correctOCRText = asyncHandler(async (req: Request, res: Response) => {
    const { ocrText } = req.body;

    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length < 5) {
        res.status(400);
        throw new Error('Invalid or empty text provided for AI correction');
    }

    if (!process.env.GEMINI_API_KEY) {
        res.status(500);
        throw new Error('Gemini API key is not configured.');
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
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
    } catch (err: any) {
        res.status(502);
        throw new Error(`AI text correction failed: ${err.message}`);
    }
});
