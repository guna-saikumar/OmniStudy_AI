import { Router } from 'express';
import {
    askDocumentQuestion,
    getSuggestedQuestions,
    getChatSessions,
    getChatSessionById,
    createChatSession,
    deleteChatSession,
} from '../controllers/chatController';

const router = Router();

// POST /api/chat/ask - Ask question about document
router.post('/ask', askDocumentQuestion);

// GET /api/chat/suggested/:summaryId - Fetch 3 suggested questions
router.get('/suggested/:summaryId', getSuggestedQuestions);

// Chat Session Thread Routes
router.get('/sessions/:summaryId', getChatSessions);
router.get('/session/:sessionId', getChatSessionById);
router.post('/session/new', createChatSession);
router.delete('/session/:sessionId', deleteChatSession);

export default router;
