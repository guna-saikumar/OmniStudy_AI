import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import Quiz from '../models/Quiz';
import Summary from '../models/Summary';
import { generateQuiz } from '../services/quizService';

// ── POST /api/quiz/generate ──────────────────────────────────────────────────
// @desc    Generate a new quiz from a summary's document content
// @access  Private
export const generateQuizHandler = asyncHandler(async (req: Request, res: Response) => {
    const { summaryId, questionCount = 10, difficulty = 'medium', questionTypes = ['MCQ', 'MSQ', 'TRUE_FALSE'], language = 'English' } = req.body;
    const userId = (req as any).user._id;

    if (!summaryId) {
        res.status(400);
        throw new Error('Missing required field: summaryId');
    }

    // Verify summary exists and user has access
    const summary = await Summary.findById(summaryId);
    if (!summary) {
        res.status(404);
        throw new Error('Summary not found');
    }

    if (summary.user.toString() !== userId.toString()) {
        res.status(401);
        throw new Error('Not authorized to generate a quiz for this document');
    }

    // Validate inputs
    const validCount = [5, 10, 15, 20].includes(questionCount) ? questionCount : 10;
    const validDifficulty = ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
    const validTypes = (questionTypes as string[]).filter(t =>
        ['MCQ', 'MSQ', 'TRUE_FALSE'].includes(t)
    );
    if (validTypes.length === 0) {
        res.status(400);
        throw new Error('At least one question type must be selected');
    }

    try {
        console.log(`[QuizController] Generating quiz for summary ${summaryId} by user ${userId}`);

        const { questions, title } = await generateQuiz({
            summaryId,
            questionCount: validCount,
            difficulty: validDifficulty as 'easy' | 'medium' | 'hard',
            questionTypes: validTypes as ('MCQ' | 'MSQ' | 'TRUE_FALSE')[],
            language,
        });

        // Save quiz to database
        const quiz = new Quiz({
            user: userId,
            summary: summaryId,
            title,
            language,
            difficulty: validDifficulty,
            questionCount: questions.length,
            questionTypes: validTypes,
            questions,
        });

        const saved = await quiz.save();
        console.log(`[QuizController] Quiz ${saved._id} created with ${questions.length} questions`);

        res.status(201).json(saved);
    } catch (err: any) {
        console.error(`[QuizController] Quiz generation failed:`, err.message);
        res.status(502);
        throw new Error(`Quiz generation failed: ${err.message}`);
    }
});

// ── GET /api/quiz/:quizId ────────────────────────────────────────────────────
// @desc    Get a specific quiz by ID
// @access  Private
export const getQuiz = asyncHandler(async (req: Request, res: Response) => {
    const quiz = await Quiz.findById(req.params.quizId);

    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    // Verify ownership
    const userId = (req as any).user._id;
    if (quiz.user.toString() !== userId.toString()) {
        res.status(401);
        throw new Error('Not authorized to access this quiz');
    }

    res.json(quiz);
});

// ── POST /api/quiz/:quizId/submit ────────────────────────────────────────────
// @desc    Submit quiz answers and compute score
// @access  Private
export const submitQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { answers } = req.body; // answers: { q1: ["B"], q2: ["A","C"], q3: ["TRUE"] }
    const quiz = await Quiz.findById(req.params.quizId);

    if (!quiz) {
        res.status(404);
        throw new Error('Quiz not found');
    }

    const userId = (req as any).user._id;
    if (quiz.user.toString() !== userId.toString()) {
        res.status(401);
        throw new Error('Not authorized to submit this quiz');
    }

    if (!answers || typeof answers !== 'object') {
        res.status(400);
        throw new Error('Missing or invalid answers object');
    }

    // Compute score
    let totalCorrect = 0;
    const breakdown: Record<string, { correct: number; total: number }> = {
        MCQ: { correct: 0, total: 0 },
        MSQ: { correct: 0, total: 0 },
        TRUE_FALSE: { correct: 0, total: 0 },
    };

    for (const question of quiz.questions) {
        const qType = question.type;
        breakdown[qType].total++;

        const userAnswer: string[] = answers[question.id] || [];
        const correctAnswer = question.correctAnswer;

        // Check if answer is exactly correct
        const isCorrect =
            userAnswer.length === correctAnswer.length &&
            userAnswer.every(a => correctAnswer.includes(a)) &&
            correctAnswer.every(a => userAnswer.includes(a));

        if (isCorrect) {
            totalCorrect++;
            breakdown[qType].correct++;
        }
    }

    const total = quiz.questions.length;
    const percentage = Math.round((totalCorrect / total) * 100);

    // Save submission
    const submission = {
        answers: new Map(Object.entries(answers)),
        score: totalCorrect,
        total,
        percentage,
        breakdown,
        submittedAt: new Date(),
    };

    quiz.submissions.push(submission as any);
    await quiz.save();

    const savedSubmission = (quiz.submissions as any)[quiz.submissions.length - 1];

    res.json({
        submissionId: savedSubmission?._id || null,
        score: totalCorrect,
        total,
        percentage,
        breakdown,
        questions: quiz.questions.map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            userAnswer: answers[q.id] || [],
            isCorrect:
                (answers[q.id] || []).length === q.correctAnswer.length &&
                (answers[q.id] || []).every((a: string) => q.correctAnswer.includes(a)) &&
                q.correctAnswer.every(a => (answers[q.id] || []).includes(a)),
            explanation: q.explanation,
            sourceReference: q.sourceReference,
        })),
    });
});

// ── GET /api/quiz/summary/:summaryId ─────────────────────────────────────────
// @desc    List all quizzes for a specific summary
// @access  Private
export const getQuizzesForSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user._id;
    const { summaryId } = req.params;

    const filter: any = { user: userId };
    if (summaryId && summaryId !== 'all') {
        filter.summary = summaryId;
    }

    const quizzes = await Quiz.find(filter)
        .select('title difficulty questionCount questionTypes language createdAt submissions')
        .sort({ createdAt: -1 });

    // Add score from latest submission
    const quizzesWithScore = quizzes.map(q => {
        const qObj = q.toObject();
        const latestSubmission = q.submissions?.[q.submissions.length - 1];
        return {
            ...qObj,
            lastScore: latestSubmission
                ? { score: latestSubmission.score, total: latestSubmission.total, percentage: latestSubmission.percentage }
                : null,
            attemptCount: q.submissions?.length || 0,
        };
    });

    res.json(quizzesWithScore);
});
