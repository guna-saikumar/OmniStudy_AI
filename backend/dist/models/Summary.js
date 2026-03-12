"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const summarySchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    fileName: {
        type: String,
        required: true,
    },
    fileSize: {
        type: Number,
    },
    pages: {
        type: Number,
    },
    status: {
        type: String,
        default: 'Completed',
    },
    summaryType: {
        type: String,
    },
    content: {
        text: mongoose_1.Schema.Types.Mixed,
        mindMapData: mongoose_1.Schema.Types.Mixed,
        flashcards: [{ question: String, answer: String }],
        topicClusters: mongoose_1.Schema.Types.Mixed,
        comparativeTable: mongoose_1.Schema.Types.Mixed,
        infographicData: mongoose_1.Schema.Types.Mixed,
        // New: full document outline with headings → bullet points
        documentOutline: [
            {
                heading: String,
                level: Number, // 1 = main, 2 = sub
                bullets: [String],
                subSections: [
                    {
                        title: String,
                        bullets: [String],
                    },
                ],
            },
        ],
    },
    pdfText: {
        type: String,
    },
}, {
    timestamps: true,
});
const Summary = (0, mongoose_1.model)('Summary', summarySchema);
exports.default = Summary;
