"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const router = (0, express_1.Router)();
// POST /api/chat/ask - Ask question about document
router.post('/ask', chatController_1.askDocumentQuestion);
// GET /api/chat/suggested/:summaryId - Fetch 3 suggested questions
router.get('/suggested/:summaryId', chatController_1.getSuggestedQuestions);
// Chat Session Thread Routes
router.get('/sessions/:summaryId', chatController_1.getChatSessions);
router.get('/session/:sessionId', chatController_1.getChatSessionById);
router.post('/session/new', chatController_1.createChatSession);
router.delete('/session/:sessionId', chatController_1.deleteChatSession);
exports.default = router;
