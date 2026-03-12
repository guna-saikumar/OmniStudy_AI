"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.regenerateSummary = exports.deleteSummary = exports.getSummaryById = exports.createSummary = exports.getSummaries = void 0;
const Summary_1 = __importDefault(require("../models/Summary"));
const express_async_handler_1 = __importDefault(require("express-async-handler"));
// @desc    Get all user summaries
// @route   GET /api/summaries
// @access  Private
exports.getSummaries = (0, express_async_handler_1.default)(async (req, res) => {
    const summaries = await Summary_1.default.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(summaries);
});
// @desc    Create a new summary
// @route   POST /api/summaries
// @access  Private
exports.createSummary = (0, express_async_handler_1.default)(async (req, res) => {
    const { fileName, fileSize, pages, summaryType, content } = req.body;
    const summary = new Summary_1.default({
        user: req.user._id,
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
exports.getSummaryById = (0, express_async_handler_1.default)(async (req, res) => {
    const summary = await Summary_1.default.findById(req.params.id);
    if (summary) {
        if (summary.user.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error('User not authorized');
        }
        res.json(summary);
    }
    else {
        res.status(404);
        throw new Error('Summary not found');
    }
});
// @desc    Delete a summary
// @route   DELETE /api/summaries/:id
// @access  Private
exports.deleteSummary = (0, express_async_handler_1.default)(async (req, res) => {
    const summaryId = req.params.id;
    const user = req.user;
    if (!user) {
        res.status(401);
        throw new Error('User not found in request');
    }
    const userId = user._id.toString();
    console.log(`[DELETE] Attempting to delete summary: ${summaryId} for user: ${userId}`);
    const summary = await Summary_1.default.findById(summaryId);
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
exports.regenerateSummary = (0, express_async_handler_1.default)(async (req, res) => {
    const summary = await Summary_1.default.findById(req.params.id);
    if (!summary) {
        res.status(404);
        throw new Error('Summary not found');
    }
    if (summary.user.toString() !== req.user._id.toString()) {
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
    }
    catch (err) {
        res.status(502);
        throw new Error(`AI Regeneration failed: ${err.message}`);
    }
});
