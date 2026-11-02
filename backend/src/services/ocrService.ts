import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface OcrWord {
    text: string;
    confidence: number;
}

export interface OcrResult {
    fullText: string;
    words: OcrWord[];
    pageCount: number;
    engine: 'google-vision' | 'gemini-vision' | 'gemini-files';
}

const OCR_PROMPT = `You are an expert OCR system specialising in handwritten and printed text.

Extract ALL text visible in this document, including:
- Handwritten text (cursive, print, mixed)
- Printed text
- Mathematical equations — wrap inline in $...$ and block in $$...$$
- Tables — preserve using | separators
- Bullet points and numbered lists — preserve structure
- Headings/subheadings — mark with # and ##
- Diagrams — describe as [DIAGRAM: brief description]

Rules:
1. Preserve document structure (paragraphs, line breaks, indentation)
2. If text is unclear, include your best guess followed by [?]
3. Output ONLY the extracted text — no explanations, no preamble
4. Maintain original reading order (top-to-bottom, left-to-right)`;

// ─── Helper: words from plain text ──────────────────────────────────────────

function textToWords(text: string): OcrWord[] {
    return text.split(/\s+/).filter(w => w.length > 0).map(t => ({ text: t, confidence: 0.85 }));
}

// ─── Google Cloud Vision OCR (optional, requires key file) ──────────────────

async function runGoogleVisionOCR(imageBuffer: Buffer): Promise<OcrResult | null> {
    const keyPath = process.env.GOOGLE_CLOUD_VISION_KEY_PATH;
    if (!keyPath) return null;

    const resolvedPath = path.resolve(keyPath);
    if (!fs.existsSync(resolvedPath)) {
        console.warn('[OCR] Google Cloud Vision key file not found at:', resolvedPath);
        return null;
    }

    try {
        let vision: any;
        try {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore — optional package
            vision = await import('@google-cloud/vision');
        } catch {
            console.warn('[OCR] @google-cloud/vision not installed, skipping.');
            return null;
        }

        const client = new vision.ImageAnnotatorClient({ keyFilename: resolvedPath });
        const [result] = await client.documentTextDetection({
            image: { content: imageBuffer.toString('base64') },
            imageContext: { languageHints: ['en', 'te', 'hi'] },
        });

        const ann = result.fullTextAnnotation;
        if (!ann) return null;

        const fullText = ann.text || '';
        const words: OcrWord[] = [];
        for (const page of (ann.pages || [])) {
            for (const block of (page.blocks || [])) {
                for (const para of (block.paragraphs || [])) {
                    for (const word of (para.words || [])) {
                        const t = (word.symbols || []).map((s: any) => s.text).join('');
                        if (t.trim()) words.push({ text: t, confidence: word.confidence ?? 0.9 });
                    }
                }
            }
        }

        return { fullText, words, pageCount: (ann.pages || []).length || 1, engine: 'google-vision' };
    } catch (err: any) {
        console.error('[OCR] Google Vision failed:', err.message);
        return null;
    }
}

// ─── Gemini Vision OCR — for images (JPEG / PNG / WEBP) ─────────────────────

async function runGeminiVisionOCR(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const safeMime = (['image/jpeg', 'image/png', 'image/webp'] as string[]).includes(mimeType)
        ? (mimeType as 'image/jpeg' | 'image/png' | 'image/webp')
        : 'image/png';

    const result = await model.generateContent([
        OCR_PROMPT,
        { inlineData: { data: imageBuffer.toString('base64'), mimeType: safeMime } },
    ]);

    const fullText = result.response.text().trim();
    return { fullText, words: textToWords(fullText), pageCount: 1, engine: 'gemini-vision' };
}

// ─── Gemini Files API OCR — for PDFs (no ghostscript needed) ────────────────
// Uses Gemini's native PDF understanding: uploads the PDF, waits for it to be
// ACTIVE, generates OCR text, then deletes the uploaded file.

export async function performPDFOCR(pdfBuffer: Buffer, originalName: string): Promise<OcrResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured.');

    console.log(`[OCR] PDF upload via Gemini Files API (${(pdfBuffer.length / 1024 / 1024).toFixed(1)} MB)...`);

    // Write buffer to a temp file so the Files API can upload it
    const tempPath = path.join(os.tmpdir(), `ocr_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    fs.writeFileSync(tempPath, pdfBuffer);

    let uploadedFileName: string | null = null;

    try {
        // Dynamic import of the server-side helper (available in @google/generative-ai >= 0.15)
        const { GoogleAIFileManager } = await import('@google/generative-ai/server');
        const fileManager = new GoogleAIFileManager(apiKey);

        // Upload the PDF
        const uploadResult = await fileManager.uploadFile(tempPath, {
            mimeType: 'application/pdf',
            displayName: originalName || 'handwritten_document.pdf',
        });

        uploadedFileName = uploadResult.file.name;
        console.log(`[OCR] PDF uploaded as ${uploadedFileName}, state: ${uploadResult.file.state}`);

        // Poll until ACTIVE (usually instant for small files, a few seconds for large ones)
        let file = uploadResult.file;
        let attempts = 0;
        while (file.state === 'PROCESSING' && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            file = await fileManager.getFile(uploadedFileName!);
            attempts++;
            console.log(`[OCR] Polling PDF state: ${file.state} (attempt ${attempts})`);
        }

        if (file.state !== 'ACTIVE') {
            throw new Error(`PDF processing failed with state: ${file.state}`);
        }

        // Run OCR via Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent([
            OCR_PROMPT,
            { fileData: { mimeType: file.mimeType as any, fileUri: file.uri } },
        ]);

        const fullText = result.response.text().trim();
        console.log(`[OCR] Gemini Files API extracted ${fullText.length} chars from PDF.`);

        // Rough page count from raw PDF bytes
        const rawText = pdfBuffer.toString('latin1');
        const pageMatches = rawText.match(/\/Type\s*\/Page[^s]/g);
        const pageCount = pageMatches ? pageMatches.length : 1;

        // Clean up uploaded file
        try { await fileManager.deleteFile(uploadedFileName!); } catch { /* non-fatal */ }

        return { fullText, words: textToWords(fullText), pageCount, engine: 'gemini-files' };

    } catch (err: any) {
        console.error('[OCR] Gemini Files API failed:', err.message);
        throw new Error(`PDF OCR failed: ${err.message}`);
    } finally {
        // Always clean up temp file
        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch { /* ignore */ }
    }
}

// ─── Public API — for images ─────────────────────────────────────────────────

/**
 * Run OCR on an image buffer (JPEG / PNG / WEBP).
 * Priority: Google Cloud Vision → Gemini Vision
 */
export async function performOCR(imageBuffer: Buffer, mimeType: string): Promise<OcrResult> {
    console.log(`[OCR] Starting image OCR (${imageBuffer.length} bytes, type: ${mimeType})`);

    const visionResult = await runGoogleVisionOCR(imageBuffer);
    if (visionResult) {
        console.log(`[OCR] Google Vision: ${visionResult.fullText.length} chars.`);
        return visionResult;
    }

    console.log('[OCR] Using Gemini Vision...');
    const geminiResult = await runGeminiVisionOCR(imageBuffer, mimeType);
    console.log(`[OCR] Gemini Vision: ${geminiResult.fullText.length} chars.`);
    return geminiResult;
}
