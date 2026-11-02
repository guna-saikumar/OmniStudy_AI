import sharp from 'sharp';

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
export async function preprocessImage(inputBuffer: Buffer): Promise<Buffer> {
    try {
        const processed = await sharp(inputBuffer)
            .rotate()                         // auto-rotate based on EXIF
            .grayscale()
            .normalize()                      // stretch contrast to 0-255
            .gamma(1.4)                       // brighten mid-tones
            .sharpen({ sigma: 1.5, m1: 0.5, m2: 2 })
            .toFormat('png')
            .toBuffer();

        return processed;
    } catch (err: any) {
        // If sharp fails (e.g. unsupported format), return original buffer
        console.warn('[ImagePreprocess] Sharp failed, using raw buffer:', err.message);
        return inputBuffer;
    }
}

/**
 * For PDF inputs, uses pdf2pic to convert a specific page to a PNG buffer.
 * Returns null if conversion fails (caller will send raw PDF to Vision API).
 */
export async function pdfPageToImageBuffer(
    pdfBuffer: Buffer,
    page = 1
): Promise<Buffer | null> {
    try {
        const { fromBuffer } = await import('pdf2pic');
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
            return result.buffer as Buffer;
        }
        return null;
    } catch (err: any) {
        console.warn('[ImagePreprocess] pdf2pic failed:', err.message);
        return null;
    }
}

/**
 * Returns rough PDF page count by scanning raw bytes.
 * Falls back to 1 if it cannot determine.
 */
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
    try {
        const text = pdfBuffer.toString('latin1');
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        return matches ? matches.length : 1;
    } catch {
        return 1;
    }
}
