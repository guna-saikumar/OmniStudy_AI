"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const summaryController_1 = require("../controllers/summaryController");
const uploadController_1 = require("../controllers/uploadController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect); // All summary routes are protected
router.get('/', summaryController_1.getSummaries);
router.post('/', summaryController_1.createSummary);
router.post('/upload', uploadController_1.upload.single('pdf'), uploadController_1.uploadAndGenerateSummary); // AI PDF upload
router.get('/:id', summaryController_1.getSummaryById);
router.delete('/:id', summaryController_1.deleteSummary);
router.post('/:id/regenerate', summaryController_1.regenerateSummary);
exports.default = router;
