import { Schema, model } from 'mongoose';

const summarySchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
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
            text: Schema.Types.Mixed,
            mindMapData: Schema.Types.Mixed,
            flashcards: [{ question: String, answer: String }],
            topicClusters: Schema.Types.Mixed,
            comparativeTable: Schema.Types.Mixed,
            infographicData: Schema.Types.Mixed,
            // New: full document outline with headings → bullet points
            documentOutline: [
                {
                    heading: String,
                    level: Number,          // 1 = main, 2 = sub
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
        // 'pdf' = uploaded digital PDF/DOCX/TXT, 'handwritten' = OCR from image/scanned PDF
        sourceType: {
            type: String,
            default: 'pdf',
        },
    },
    {
        timestamps: true,
    }
);

const Summary = model('Summary', summarySchema);
export default Summary;
