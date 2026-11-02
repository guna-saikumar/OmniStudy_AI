import { Request, Response } from 'express';
import Summary from '../models/Summary';
import ChatSession from '../models/ChatSession';
import { callGeminiWithRetry } from '../services/aiService';

interface ChatMessage {
    id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
}

/**
 * Smart local grounded fallback when AI services experience 503 capacity outages
 */
function localGroundedQAFallback(summary: any, question: string): string {
    const docTitle = summary.fileName || 'Uploaded Document';
    const keyPoints: string[] = Array.isArray(summary.content?.text) ? summary.content.text : [];
    const outline = summary.content?.documentOutline || [];

    const lowerQ = question.toLowerCase();
    const words = lowerQ.split(/\s+/).filter(w => w.length > 3);

    const matchingPoints = keyPoints.filter(p => {
        const lowerP = p.toLowerCase();
        return words.some(w => lowerP.includes(w));
    });

    const matchingOutline = outline.filter((s: any) => {
        const lowerH = (s.heading || '').toLowerCase();
        const lowerB = (s.bullets || []).join(' ').toLowerCase();
        return words.some(w => lowerH.includes(w) || lowerB.includes(w));
    });

    if (matchingPoints.length > 0 || matchingOutline.length > 0) {
        let answer = `Based on **${docTitle}**, here are the key findings related to your query:\n\n`;
        if (matchingPoints.length > 0) {
            answer += `**Key Points:**\n` + matchingPoints.slice(0, 4).map(p => `• ${p}`).join('\n') + '\n\n';
        }
        if (matchingOutline.length > 0) {
            answer += `**Relevant Section:**\n`;
            matchingOutline.slice(0, 2).forEach((sec: any) => {
                answer += `• **${sec.heading}**: ${(sec.bullets || []).slice(0, 2).join(' ')}\n`;
            });
        }
        return answer;
    }

    if (keyPoints.length > 0) {
        return `Based on **${docTitle}**, here are the core summary points:\n\n` +
            keyPoints.slice(0, 4).map(p => `• ${p}`).join('\n');
    }

    return `I analyzed **${docTitle}** for "${question}". The document contains structured key points and outline sections available in the Summary Viewer tabs for complete topic details.`;
}

/**
 * Handles document-grounded AI QA queries and persists messages to ChatSession
 * POST /api/chat/ask
 * Body: { summaryId: string, question: string, sessionId?: string, chatHistory?: ChatMessage[] }
 */
export const askDocumentQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { summaryId, question, sessionId, chatHistory = [] } = req.body;

        if (!summaryId || !question) {
            res.status(400).json({ message: 'summaryId and question are required' });
            return;
        }

        const summary = await Summary.findById(summaryId);
        if (!summary) {
            res.status(404).json({ message: 'Document summary not found' });
            return;
        }

        const docTitle = summary.fileName || 'Uploaded Document';
        let documentText = '';
        if (typeof summary.pdfText === 'string' && summary.pdfText.trim()) {
            documentText = summary.pdfText;
        } else if (Array.isArray(summary.content?.text)) {
            documentText = summary.content.text.join('\n');
        } else if (typeof summary.content?.text === 'string') {
            documentText = summary.content.text;
        } else {
            documentText = JSON.stringify(summary.content || {});
        }

        // Find or create chat session
        let session = sessionId ? await ChatSession.findById(sessionId) : null;
        if (!session) {
            session = new ChatSession({
                summaryId,
                title: question.trim().slice(0, 35) + (question.length > 35 ? '...' : ''),
                messages: [],
            });
        }

        // Format recent conversation history
        const historyContext = chatHistory
            .slice(-4)
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
            .join('\n');

        const prompt = `You are OmniStudy AI, an intelligent learning assistant.
Document Title: "${docTitle}"

DOCUMENT CONTEXT:
"""
${documentText.slice(0, 8000)}
"""

RECENT HISTORY:
${historyContext || 'None'}

QUESTION: ${question}

INSTRUCTIONS:
1. Answer clearly, concisely, dynamically, and accurately based on the specific question asked and the document context provided.
2. Direct your response specifically to what the user asked in QUESTION.
3. Format any mathematical equations or formulas using LaTeX math notation ($...$ or $$...$$). Keep English variable names intact.
4. Use bullet points or bold key terms for high readability. Keep tone helpful and educational.`;

        let answerText = '';
        try {
            answerText = await callGeminiWithRetry(prompt, 'text');
        } catch (aiErr: any) {
            console.warn('[Gemini AI Fallback] Gemini API call error:', aiErr?.message || aiErr);
            answerText = localGroundedQAFallback(summary, question);
        }

        const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const userMessage = {
            id: 'user-' + Date.now(),
            role: 'user' as const,
            content: question.trim(),
            timestamp: timestampStr,
        };

        const assistantMessage = {
            id: 'assistant-' + Date.now(),
            role: 'assistant' as const,
            content: answerText,
            timestamp: timestampStr,
        };

        session.messages.push(userMessage);
        session.messages.push(assistantMessage);
        await session.save();

        res.json({
            sessionId: session._id,
            sessionTitle: session.title,
            question,
            answer: answerText,
            messages: session.messages,
            docTitle,
            timestamp: timestampStr,
        });
    } catch (err: any) {
        console.error('Error in askDocumentQuestion:', err);
        res.status(500).json({
            message: 'Failed to generate answer for document query',
            error: err.message,
        });
    }
};

/**
 * Fetch all saved chat session threads for a summary document
 * GET /api/chat/sessions/:summaryId
 */
export const getChatSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { summaryId } = req.params;
        const filter = (summaryId && summaryId !== 'all') ? { summaryId } : {};
        const sessions = await ChatSession.find(filter)
            .sort({ updatedAt: -1 })
            .select('_id title summaryId createdAt updatedAt messages');

        res.json({ sessions });
    } catch (err: any) {
        console.error('Error in getChatSessions:', err);
        res.status(500).json({ message: 'Failed to fetch chat sessions', error: err.message });
    }
};

/**
 * Get messages for a specific chat session thread
 * GET /api/chat/session/:sessionId
 */
export const getChatSessionById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const session = await ChatSession.findById(sessionId);

        if (!session) {
            res.status(404).json({ message: 'Chat session not found' });
            return;
        }

        res.json({ session });
    } catch (err: any) {
        console.error('Error in getChatSessionById:', err);
        res.status(500).json({ message: 'Failed to fetch chat session', error: err.message });
    }
};

/**
 * Create a new empty chat session thread for a document
 * POST /api/chat/session/new
 */
export const createChatSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { summaryId, title = 'New Chat' } = req.body;
        if (!summaryId) {
            res.status(400).json({ message: 'summaryId is required' });
            return;
        }

        const session = new ChatSession({
            summaryId,
            title,
            messages: [],
        });
        await session.save();

        res.json({ session });
    } catch (err: any) {
        console.error('Error in createChatSession:', err);
        res.status(500).json({ message: 'Failed to create chat session', error: err.message });
    }
};

/**
 * Delete a chat session thread
 * DELETE /api/chat/session/:sessionId
 */
export const deleteChatSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        await ChatSession.findByIdAndDelete(sessionId);
        res.json({ message: 'Chat session deleted successfully' });
    } catch (err: any) {
        console.error('Error in deleteChatSession:', err);
        res.status(500).json({ message: 'Failed to delete chat session', error: err.message });
    }
};

/**
 * Generates 3 document-specific starter questions
 * GET /api/chat/suggested/:summaryId
 */
export const getSuggestedQuestions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { summaryId } = req.params;
        const summary = await Summary.findById(summaryId);

        if (!summary) {
            res.status(404).json({ message: 'Summary not found' });
            return;
        }

        const outline = summary.content?.documentOutline;
        const keyPoints = Array.isArray(summary.content?.text) ? summary.content.text : [];

        if (outline && Array.isArray(outline) && outline.length >= 2) {
            const topic1 = outline[0]?.heading || 'core concepts';
            const topic2 = outline[1]?.heading || 'key methodology';

            res.json({
                questions: [
                    `What are the main key points regarding ${topic1}?`,
                    `Can you explain ${topic2} and its main formulas?`,
                    `What are the core conclusions and practical applications?`,
                ],
            });
            return;
        }

        if (keyPoints.length > 0) {
            res.json({
                questions: [
                    'What are the primary key findings in this document?',
                    'Can you explain the main formulas or equations mentioned?',
                    'What is the practical summary of these findings?',
                ],
            });
            return;
        }

        res.json({
            questions: [
                'What are the key points of this document?',
                'Can you explain the main formulas or concepts?',
                'What is the practical conclusion?',
            ],
        });
    } catch (err: any) {
        console.error('Error in getSuggestedQuestions:', err);
        res.json({
            questions: [
                'What are the key points of this document?',
                'Can you explain the main formulas or concepts?',
                'What is the practical conclusion?',
            ],
        });
    }
};
