import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import multer from 'multer';
// pdf-parse v2 uses a class-based API
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse');
import Summary from '../models/Summary';
import { generateSummaryFromText } from '../services/aiService';

// Configure multer for in-memory PDF uploads (no disk storage)
const storage = multer.memoryStorage();

export const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
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

    // Extract text from PDF buffer using pdf-parse v2 class API
    let pdfText = '';
    let pages = 1;
    try {
        const parser = new PDFParse({ data: req.file.buffer });
        const pdfData = await parser.getText();
        // v2 returns { pages: Array<{ text: string }> }
        pdfText = pdfData.pages.map((p: any) => p.text).join('\n');
        pages = pdfData.pages.length || 1;
    } catch (err: any) {
        console.error('[PDF Parse Error]', err.message);
        res.status(422);
        throw new Error('Could not extract text from PDF. Please ensure the PDF contains readable text.');
    }


    if (!pdfText || pdfText.trim().length < 50) {
        res.status(422);
        throw new Error('PDF appears to be empty or contains only images. Please upload a text-based PDF.');
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
