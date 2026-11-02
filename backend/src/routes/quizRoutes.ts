import express from 'express';
import {
    generateQuizHandler,
    getQuiz,
    submitQuiz,
    getQuizzesForSummary,
} from '../controllers/quizController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// All quiz routes require authentication
router.use(protect);

router.post('/generate', generateQuizHandler);
router.get('/summary/:summaryId', getQuizzesForSummary);
router.get('/:quizId', getQuiz);
router.post('/:quizId/submit', submitQuiz);

export default router;
