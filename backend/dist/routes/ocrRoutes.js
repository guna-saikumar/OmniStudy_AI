"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ocrController_1 = require("../controllers/ocrController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All OCR routes require authentication
router.use(authMiddleware_1.protect);
// POST /api/ocr/upload  — Upload image/PDF, preprocess, run OCR, return text for review
router.post('/upload', ocrController_1.imageUpload.single('image'), ocrController_1.uploadAndOCR);
// POST /api/ocr/correct — Use AI to auto-correct typos, text errors & formulas
router.post('/correct', ocrController_1.correctOCRText);
// POST /api/ocr/generate — Accept reviewed OCR text, call AI pipeline, save & return summary
router.post('/generate', ocrController_1.generateFromOCR);
exports.default = router;
