import express from 'express';
import { getSummaries, createSummary, deleteSummary, getSummaryById, regenerateSummary } from '../controllers/summaryController';
import { uploadAndGenerateSummary, upload } from '../controllers/uploadController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect); // All summary routes are protected

router.get('/', getSummaries);
router.post('/', createSummary);
router.post('/upload', upload.single('pdf'), uploadAndGenerateSummary);  // AI PDF upload
router.get('/:id', getSummaryById);
router.delete('/:id', deleteSummary);
router.post('/:id/regenerate', regenerateSummary);

export default router;
