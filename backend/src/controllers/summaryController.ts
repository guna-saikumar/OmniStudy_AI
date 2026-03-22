import { Request, Response } from 'express';
import Summary from '../models/Summary';
import asyncHandler from 'express-async-handler';

// @desc    Get all user summaries
// @route   GET /api/summaries
// @access  Private
export const getSummaries = asyncHandler(async (req: Request, res: Response) => {
    const summaries = await Summary.find({ user: (req as any).user._id })
        .select('-content -pdfText') // Exclude heavy fields for faster history loading
        .sort({ createdAt: -1 });
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(summaries);
});

// @desc    Create a new summary
// @route   POST /api/summaries
// @access  Private
export const createSummary = asyncHandler(async (req: Request, res: Response) => {
    const { fileName, fileSize, pages, summaryType, content } = req.body;

    const summary = new Summary({
        user: (req as any).user._id,
        fileName,
        fileSize,
        pages,
        summaryType,
        content,
    });

    const createdSummary = await summary.save();
    res.status(201).json(createdSummary);
});

// @desc    Get summary by ID
// @route   GET /api/summaries/:id
// @access  Private
export const getSummaryById = asyncHandler(async (req: Request, res: Response) => {
    const summary = await Summary.findById(req.params.id);

    if (summary) {
        if (summary.user.toString() !== (req as any).user._id.toString()) {
            res.status(401);
            throw new Error('User not authorized');
        }
        res.json(summary);
    } else {
        res.status(404);
        throw new Error('Summary not found');
    }
});

// @desc    Delete a summary
// @route   DELETE /api/summaries/:id
// @access  Private
export const deleteSummary = asyncHandler(async (req: Request, res: Response) => {
    const summaryId = req.params.id;
    const user = (req as any).user;

    if (!user) {
        res.status(401);
        throw new Error('User not found in request');
    }

    const userId = user._id.toString();
    console.log(`[DELETE] Attempting to delete summary: ${summaryId} for user: ${userId}`);

    const summary = await Summary.findById(summaryId);

    if (!summary) {
        console.log(`[DELETE] Summary not found: ${summaryId}`);
        res.status(404);
        throw new Error('Summary not found');
    }

    const ownerId = summary.user.toString();
    console.log(`[DELETE] Summary owner: ${ownerId}, Requesting user: ${userId}`);

    if (ownerId !== userId) {
        console.log(`[DELETE] Unauthorized attempt by user ${userId} to delete summary ${summaryId} owned by ${ownerId}`);
        res.status(401);
        throw new Error('User not authorized to delete this summary');
    }

    await summary.deleteOne();
    console.log(`[DELETE] Summary ${summaryId} deleted successfully`);
    res.json({ message: 'Summary removed' });
});

// @desc    Regenerate summary content using existing PDF text
// @route   POST /api/summaries/:id/regenerate
// @access  Private
export const regenerateSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await Summary.findById(req.params.id);

    if (!summary) {
        res.status(404);
        throw new Error('Summary not found');
    }

    if (summary.user.toString() !== (req as any).user._id.toString()) {
        res.status(401);
        throw new Error('User not authorized');
    }

    if (!summary.pdfText) {
        res.status(400);
        throw new Error('No PDF text found for this summary. Regeneration requires original text.');
    }

    // Dynamic import to avoid circular dependency if any, or just import at top
    const { generateSummaryFromText } = require('../services/aiService');

    try {
        const newAiContent = await generateSummaryFromText(summary.pdfText, summary.fileName);
        summary.content = newAiContent;
        await summary.save();
        res.json(summary);
    } catch (err: any) {
        res.status(502);
        throw new Error(`AI Regeneration failed: ${err.message}`);
    }
});
