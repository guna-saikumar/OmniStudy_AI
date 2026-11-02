/**
 * Quiz Generation Service for OmniStudy AI.
 *
 * Generates quiz questions from existing Summary content using Gemini AI.
 * Reuses the same callGeminiWithRetry infrastructure as aiService.ts.
 */

import Summary from '../models/Summary';
import { callGeminiWithRetry } from './aiService';

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuizGenerationOptions {
    summaryId: string;
    questionCount: number;
    difficulty: 'easy' | 'medium' | 'hard';
    questionTypes: ('MCQ' | 'MSQ' | 'TRUE_FALSE')[];
    language: string;
}

interface GeneratedQuestion {
    id: string;
    type: 'MCQ' | 'MSQ' | 'TRUE_FALSE';
    question: string;
    options: { id: string; text: string }[];
    correctAnswer: string[];
    explanation: string;
    sourceReference: string;
}

// ── Language Map ─────────────────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    te: 'Telugu',
    hi: 'Hindi',
    ta: 'Tamil',
    kn: 'Kannada',
    ml: 'Malayalam',
    English: 'English',
    Telugu: 'Telugu',
    Hindi: 'Hindi',
    Tamil: 'Tamil',
    Kannada: 'Kannada',
    Malayalam: 'Malayalam',
};

// ── Distribution Logic ───────────────────────────────────────────────────────

function computeDistribution(
    totalQuestions: number,
    questionTypes: ('MCQ' | 'MSQ' | 'TRUE_FALSE')[]
): Record<string, number> {
    const typeCount = questionTypes.length;
    const base = Math.floor(totalQuestions / typeCount);
    let remainder = totalQuestions - base * typeCount;

    const dist: Record<string, number> = {};
    for (const t of questionTypes) {
        dist[t] = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;
    }
    return dist;
}

// ── Difficulty Instruction ───────────────────────────────────────────────────

function difficultyInstruction(diff: string): string {
    switch (diff) {
        case 'easy':
            return `EASY difficulty: Focus on direct factual recall, definitions, and basic identification. Questions should test whether the student remembers key terms and simple facts from the document.`;
        case 'hard':
            return `HARD difficulty: Focus on reasoning, applying concepts, distinguishing closely related concepts, and multi-step reasoning. Questions should require deeper understanding and analysis of the document content.`;
        default:
            return `MEDIUM difficulty: Focus on concept understanding, comparison, and application of information. Questions should test whether the student understands the relationships and meaning behind the content.`;
    }
}

// ── Build Prompt ─────────────────────────────────────────────────────────────

function buildQuizPrompt(
    documentText: string,
    keyPoints: string[],
    options: QuizGenerationOptions,
    distribution: Record<string, number>
): string {
    const langName = LANGUAGE_NAMES[options.language] || 'English';
    const textLimit = 500000;
    const truncatedText =
        documentText.length > textLimit
            ? documentText.substring(0, textLimit)
            : documentText;

    // Build key points context
    const keyPointsSection =
        keyPoints.length > 0
            ? `\n\nKEY POINTS EXTRACTED FROM THE DOCUMENT:\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`
            : '';

    // Build distribution instruction
    const distLines = Object.entries(distribution)
        .map(([type, count]) => {
            if (type === 'TRUE_FALSE') return `- TRUE_FALSE: exactly ${count} True/False questions`;
            return `- ${type}: exactly ${count} ${type} questions`;
        })
        .join('\n');

    return `You are an expert quiz generator. Generate a quiz ONLY from the provided document content.

DOCUMENT CONTENT:
"""
${truncatedText}
"""
${keyPointsSection}

REQUIREMENTS:
1. Generate EXACTLY ${options.questionCount} questions total with this distribution:
${distLines}

2. ${difficultyInstruction(options.difficulty)}

3. LANGUAGE: Generate ALL questions, options, explanations, and feedback in ${langName}. However, preserve mathematical formulas, scientific notation, technical variable names, and LaTeX expressions in their original English/Latin format.

4. QUESTION TYPE RULES:
   - MCQ (Multiple Choice Question): Provide exactly 4 options labeled A, B, C, D. Exactly ONE correct answer. "correctAnswer" must be an array with one element, e.g. ["B"].
   - MSQ (Multiple Select Question): Provide exactly 4-5 options labeled A, B, C, D, E. TWO OR MORE correct answers. "correctAnswer" must be an array with 2+ elements, e.g. ["A", "C", "D"].
   - TRUE_FALSE: Provide exactly 2 options: {"id": "TRUE", "text": "True"} and {"id": "FALSE", "text": "False"}. "correctAnswer" must be ["TRUE"] or ["FALSE"].

5. QUALITY RULES:
   - Every question MUST be directly grounded in the provided document. Do NOT use outside information.
   - Make distractors plausible but clearly wrong based on the document.
   - Avoid duplicate or ambiguous questions.
   - Avoid questions where multiple answers could reasonably be correct (for MCQ).
   - Each question must have a clear, unambiguous correct answer supported by the document.
   - Generate a brief explanation for each question referencing the document.

6. OUTPUT FORMAT: Return ONLY valid JSON with this exact structure. No markdown, no code fences, no extra text:
{
  "questions": [
    {
      "id": "q1",
      "type": "MCQ",
      "question": "Question text here?",
      "options": [
        {"id": "A", "text": "Option A text"},
        {"id": "B", "text": "Option B text"},
        {"id": "C", "text": "Option C text"},
        {"id": "D", "text": "Option D text"}
      ],
      "correctAnswer": ["B"],
      "explanation": "Explanation referencing the document.",
      "sourceReference": "Section or concept name from the document"
    }
  ]
}`;
}

// ── Validate Generated Quiz ──────────────────────────────────────────────────

function validateQuizData(
    data: any,
    options: QuizGenerationOptions
): GeneratedQuestion[] {
    if (!data || !Array.isArray(data.questions)) {
        throw new Error('AI returned invalid quiz structure: missing questions array');
    }

    const questions: GeneratedQuestion[] = [];
    const allowedTypes = new Set(options.questionTypes);

    for (let i = 0; i < data.questions.length; i++) {
        const q = data.questions[i];

        // Basic validation
        if (!q.question || !Array.isArray(q.options) || !Array.isArray(q.correctAnswer)) {
            console.warn(`[QuizService] Skipping question ${i + 1}: missing required fields`);
            continue;
        }

        // Normalize type
        let type = (q.type || 'MCQ').toUpperCase().replace(/[^A-Z_]/g, '');
        if (type === 'TRUEFALSE' || type === 'TF' || type === 'TRUE_FALSE') type = 'TRUE_FALSE';
        if (!allowedTypes.has(type as any)) {
            // Map to a valid type if possible
            type = options.questionTypes[0];
        }

        // Validate correct answers
        const correctAnswer = q.correctAnswer.map((a: string) => String(a).toUpperCase().trim());

        if (type === 'MCQ' && correctAnswer.length !== 1) {
            // Force single answer for MCQ
            correctAnswer.splice(1);
        }

        if (type === 'TRUE_FALSE') {
            // Normalize True/False answers
            const normalized = correctAnswer[0] === 'TRUE' || correctAnswer[0] === 'T' ? 'TRUE' : 'FALSE';
            correctAnswer.splice(0, correctAnswer.length, normalized);
        }

        questions.push({
            id: `q${i + 1}`,
            type: type as 'MCQ' | 'MSQ' | 'TRUE_FALSE',
            question: q.question,
            options: q.options.map((o: any) => ({
                id: String(o.id || o.label || '').toUpperCase().trim(),
                text: String(o.text || o.value || ''),
            })),
            correctAnswer,
            explanation: q.explanation || '',
            sourceReference: q.sourceReference || '',
        });
    }

    if (questions.length === 0) {
        throw new Error('AI generated zero valid questions');
    }

    // Trim to requested count if AI over-generated
    return questions.slice(0, options.questionCount);
}

// ── Main Generation Function ─────────────────────────────────────────────────

export async function generateQuiz(
    options: QuizGenerationOptions
): Promise<{ questions: GeneratedQuestion[]; title: string }> {
    console.log(`[QuizService] Generating quiz for summary ${options.summaryId}`);
    console.log(`[QuizService] Config: ${options.questionCount} questions, ${options.difficulty}, types: ${options.questionTypes.join(', ')}, lang: ${options.language}`);

    // 1. Retrieve the summary with document content
    const summary = await Summary.findById(options.summaryId);
    if (!summary) {
        throw new Error('Summary not found');
    }

    const pdfText = summary.pdfText;
    if (!pdfText || pdfText.trim().length < 100) {
        throw new Error('Not enough content was found to generate a meaningful quiz from this document.');
    }

    // 2. Extract key points for additional context
    const keyPoints: string[] = [];
    if (summary.content?.text) {
        if (Array.isArray(summary.content.text)) {
            keyPoints.push(...summary.content.text.map(String));
        } else if (typeof summary.content.text === 'string') {
            keyPoints.push(summary.content.text);
        }
    }

    // 3. Compute question distribution
    const distribution = computeDistribution(options.questionCount, options.questionTypes);
    console.log(`[QuizService] Distribution:`, distribution);

    // 4. Build prompt and call Gemini
    const prompt = buildQuizPrompt(pdfText, keyPoints, options, distribution);

    console.log(`[QuizService] Calling Gemini AI...`);
    const rawResponse = await callGeminiWithRetry(prompt);

    // 5. Parse and validate
    let parsed: any;
    try {
        parsed = JSON.parse(rawResponse);
    } catch {
        // Try to extract JSON from the response if it has extra text
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('AI returned invalid JSON for quiz generation');
        }
    }

    const questions = validateQuizData(parsed, options);

    console.log(`[QuizService] Generated ${questions.length} valid questions`);

    // 6. Build title
    const fileName = summary.fileName?.replace(/\.[^.]+$/, '') || 'Document';
    const title = `Quiz: ${fileName}`;

    return { questions, title };
}
