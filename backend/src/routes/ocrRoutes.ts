import express from 'express';
import { uploadAndOCR, generateFromOCR, correctOCRText, imageUpload } from '../controllers/ocrController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All OCR routes require authentication
router.use(protect);

// POST /api/ocr/upload  — Upload image/PDF, preprocess, run OCR, return text for review
router.post('/upload', imageUpload.single('image'), uploadAndOCR);

// POST /api/ocr/correct — Use AI to auto-correct typos, text errors & formulas
router.post('/correct', correctOCRText);

// POST /api/ocr/generate — Accept reviewed OCR text, call AI pipeline, save & return summary
router.post('/generate', generateFromOCR);

export default router;
