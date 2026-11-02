import dotenv from 'dotenv';
import path from 'path';

// Load .env before any routes or services initialization
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import connectDB from './config/db';
import userRoutes from './routes/userRoutes';
import summaryRoutes from './routes/summaryRoutes';
import ocrRoutes from './routes/ocrRoutes';
import translationRoutes from './routes/translationRoutes';
import quizRoutes from './routes/quizRoutes';
import chatRoutes from './routes/chatRoutes';
import { notFound, errorHandler } from './middleware/errorMiddleware';

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/users', userRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/translate', translationRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chat', chatRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
