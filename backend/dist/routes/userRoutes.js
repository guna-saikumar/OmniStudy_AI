"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.post('/', userController_1.registerUser);
router.post('/login', userController_1.authUser);
router.post('/google', userController_1.googleAuthUser);
router.post('/google-custom', userController_1.googleAuthUserCustom);
router.put('/profile', authMiddleware_1.protect, userController_1.updateUserProfile);
exports.default = router;
