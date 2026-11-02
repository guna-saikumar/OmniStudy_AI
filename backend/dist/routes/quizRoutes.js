"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const quizController_1 = require("../controllers/quizController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All quiz routes require authentication
router.use(authMiddleware_1.protect);
router.post('/generate', quizController_1.generateQuizHandler);
router.get('/summary/:summaryId', quizController_1.getQuizzesForSummary);
router.get('/:quizId', quizController_1.getQuiz);
router.post('/:quizId/submit', quizController_1.submitQuiz);
exports.default = router;
