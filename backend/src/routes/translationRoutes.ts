import express from 'express';
import {
    translateModule,
    translateAll,
    getCachedTranslations,
    getLanguages,
    getTranslationHealth,
    clearTranslationCache,
} from '../controllers/translationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Public endpoints (no auth required)
router.get('/languages', getLanguages);
router.get('/health', getTranslationHealth);

// Protected endpoints (require auth)
router.use(protect);
router.post('/module', translateModule);
router.post('/all', translateAll);
router.get('/cache/:summaryId', getCachedTranslations);
router.delete('/clear-cache', clearTranslationCache);

export default router;
