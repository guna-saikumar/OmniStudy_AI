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
exports.preprocessImage = preprocessImage;
exports.pdfPageToImageBuffer = pdfPageToImageBuffer;
exports.getPdfPageCount = getPdfPageCount;
const sharp_1 = __importDefault(require("sharp"));
/**
 * Preprocesses an image buffer to improve OCR accuracy.
 * Steps:
 *  1. Auto-rotate based on EXIF orientation
 *  2. Grayscale conversion (removes colour noise)
 *  3. Normalize contrast (stretches histogram to full range)
 *  4. Gamma correction for brighter mid-tones (helps faint pencil strokes)
 *  5. Sharpen edges (improves letter clarity)
 *  6. Output as PNG for stable OCR input
 */
async function preprocessImage(inputBuffer) {
    try {
        const processed = await (0, sharp_1.default)(inputBuffer)
            .rotate() // auto-rotate based on EXIF
            .grayscale()
            .normalize() // stretch contrast to 0-255
            .gamma(1.4) // brighten mid-tones
            .sharpen({ sigma: 1.5, m1: 0.5, m2: 2 })
            .toFormat('png')
            .toBuffer();
        return processed;
    }
    catch (err) {
        // If sharp fails (e.g. unsupported format), return original buffer
        console.warn('[ImagePreprocess] Sharp failed, using raw buffer:', err.message);
        return inputBuffer;
    }
}
/**
 * For PDF inputs, uses pdf2pic to convert a specific page to a PNG buffer.
 * Returns null if conversion fails (caller will send raw PDF to Vision API).
 */
async function pdfPageToImageBuffer(pdfBuffer, page = 1) {
    try {
        const { fromBuffer } = await Promise.resolve().then(() => __importStar(require('pdf2pic')));
        const converter = fromBuffer(pdfBuffer, {
            density: 200,
            format: 'png',
            width: 2480,
            height: 3508,
            saveFilename: `ocr_page_${Date.now()}`,
            savePath: '/tmp',
        });
        const result = await converter(page, { responseType: 'buffer' });
        if (result && result.buffer) {
            return result.buffer;
        }
        return null;
    }
    catch (err) {
        console.warn('[ImagePreprocess] pdf2pic failed:', err.message);
        return null;
    }
}
/**
 * Returns rough PDF page count by scanning raw bytes.
 * Falls back to 1 if it cannot determine.
 */
async function getPdfPageCount(pdfBuffer) {
    try {
        const text = pdfBuffer.toString('latin1');
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        return matches ? matches.length : 1;
    }
    catch {
        return 1;
    }
}
