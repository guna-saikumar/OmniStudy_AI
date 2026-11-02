"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env before any routes or services initialization
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../.env') });
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = __importDefault(require("./config/db"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const summaryRoutes_1 = __importDefault(require("./routes/summaryRoutes"));
const ocrRoutes_1 = __importDefault(require("./routes/ocrRoutes"));
const translationRoutes_1 = __importDefault(require("./routes/translationRoutes"));
const quizRoutes_1 = __importDefault(require("./routes/quizRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const errorMiddleware_1 = require("./middleware/errorMiddleware");
(0, db_1.default)();
const app = (0, express_1.default)();
app.set('trust proxy', 1); // Trust first proxy (Render, Cloudflare, etc.)
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
app.get('/', (req, res) => {
    res.send('API is running...');
});
app.use('/api/users', userRoutes_1.default);
app.use('/api/summaries', summaryRoutes_1.default);
app.use('/api/ocr', ocrRoutes_1.default);
app.use('/api/translate', translationRoutes_1.default);
app.use('/api/quiz', quizRoutes_1.default);
app.use('/api/chat', chatRoutes_1.default);
app.use(errorMiddleware_1.notFound);
app.use(errorMiddleware_1.errorHandler);
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
