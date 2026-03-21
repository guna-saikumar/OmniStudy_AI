import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
// pdf-parse v2 uses a class-based API
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth');
import Summary from '../models/Summary';
import { generateSummaryFromText } from '../services/aiService';

// Configure multer for in-memory PDF uploads (no disk storage)
const storage = multer.memoryStorage();

export const upload = multer({
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
        } else {
            cb(new Error('PDF, DOCX, PPT, and TXT files only are allowed'));
        }
    },
});

// @desc    Upload PDF and generate AI summary
// @route   POST /api/summaries/upload
// @access  Private
export const uploadAndGenerateSummary = asyncHandler(async (req: Request, res: Response) => {
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
            pdfText = pdfData.pages.map((p: any) => p.text).join('\n');
            pages = pdfData.pages.length || 1;
        } else if (req.file.mimetype === 'text/plain') {
            pdfText = req.file.buffer.toString('utf-8');
            pages = Math.ceil(pdfText.length / 2000) || 1;
        } else if (req.file.mimetype.includes('wordprocessingml') || req.file.mimetype.includes('msword')) {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            pdfText = result.value;
            pages = Math.ceil(pdfText.length / 2000) || 1;
        } else if (req.file.mimetype.includes('presentationml') || req.file.mimetype.includes('powerpoint')) {
            // office-text-extractor 4.x is ESM only, use dynamic import
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { getTextExtractor } = await import('office-text-extractor');
            const extractor = getTextExtractor();
            pdfText = await extractor.extractText({ input: req.file.buffer, type: 'buffer' });
            pages = Math.ceil(pdfText.length / 2000) || 1;
        } else {
            throw new Error('Unsupported file type');
        }
    } catch (err: any) {
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
        aiContent = await generateSummaryFromText(pdfText, fileName);
    } catch (err: any) {
        res.status(502);
        throw new Error(`AI generation failed: ${err.message}`);
    }


    // Save to MongoDB
    const summary = await Summary.create({
        user: (req as any).user._id,
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
