"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const translationController_1 = require("../controllers/translationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public endpoints (no auth required)
router.get('/languages', translationController_1.getLanguages);
router.get('/health', translationController_1.getTranslationHealth);
// Protected endpoints (require auth)
router.use(authMiddleware_1.protect);
router.post('/module', translationController_1.translateModule);
router.post('/all', translationController_1.translateAll);
router.get('/cache/:summaryId', translationController_1.getCachedTranslations);
router.delete('/clear-cache', translationController_1.clearTranslationCache);
exports.default = router;
