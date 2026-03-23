import express from 'express';
import { getSummaries, createSummary, deleteSummary, getSummaryById, regenerateSummary } from '../controllers/summaryController';
import { uploadAndGenerateSummary, upload } from '../controllers/uploadController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Allow public access to individual summaries for sharing
router.get('/:id', getSummaryById);

// Protect other summary management routes
router.use(protect);

router.get('/', getSummaries);
router.post('/', createSummary);
router.post('/upload', upload.single('pdf'), uploadAndGenerateSummary);  // AI PDF upload
router.delete('/:id', deleteSummary);
router.post('/:id/regenerate', regenerateSummary);

export default router;
