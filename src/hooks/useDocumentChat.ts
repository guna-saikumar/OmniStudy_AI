import { useState, useCallback, useEffect } from 'react';
import api from '../utils/api';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface ChatSessionData {
    _id: string;
    title: string;
    summaryId: string;
    createdAt: string;
    updatedAt: string;
    messages: ChatMessage[];
}

export function useDocumentChat(summaryId: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chatSessions, setChatSessions] = useState<ChatSessionData[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
    const [latestStreamedMsgId, setLatestStreamedMsgId] = useState<string | null>(null);
    
    const [isSending, setIsSending] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch chat session threads for the current document or all chats
    const loadChatSessions = useCallback(async () => {
        setIsLoadingHistory(true);
        try {
            const targetId = summaryId || 'all';
            const { data } = await api.get(`/chat/sessions/${targetId}`);
            if (Array.isArray(data?.sessions)) {
                setChatSessions(data.sessions);
            }
        } catch {
            /* non-critical */
        } finally {
            setIsLoadingHistory(false);
        }
    }, [summaryId]);

    // Load chat sessions and suggested questions when summaryId changes
    useEffect(() => {
        loadChatSessions();

        if (!summaryId) return;

        setIsLoadingSuggestions(true);
        api.get(`/chat/suggested/${summaryId}`)
            .then(({ data }) => {
                if (Array.isArray(data?.questions)) {
                    setSuggestedQuestions(data.questions);
                }
            })
            .catch(() => {
                setSuggestedQuestions([
                    'What are the key takeaways of this document?',
                    'Can you explain the main formulas or equations?',
                    'What are the core conclusions?',
                ]);
            })
            .finally(() => setIsLoadingSuggestions(false));
    }, [summaryId, loadChatSessions]);

    // Select a chat session thread from history (no re-animation for old messages)
    const selectChatSession = useCallback(async (sessionId: string) => {
        setIsLoadingHistory(true);
        setError(null);
        setLatestStreamedMsgId(null);
        try {
            const { data } = await api.get(`/chat/session/${sessionId}`);
            if (data?.session) {
                setActiveSessionId(data.session._id);
                setMessages(data.session.messages || []);
            }
        } catch (err: any) {
            setError('Failed to load chat session history');
        } finally {
            setIsLoadingHistory(false);
        }
    }, []);

    // Start a new clean chat thread for the current summary
    const startNewChat = useCallback(() => {
        setActiveSessionId(null);
        setMessages([]);
        setError(null);
        setLatestStreamedMsgId(null);
    }, []);

    // Delete a chat session thread
    const deleteSession = useCallback(async (sessionId: string) => {
        try {
            await api.delete(`/chat/session/${sessionId}`);
            setChatSessions(prev => prev.filter(s => s._id !== sessionId));
            if (activeSessionId === sessionId) {
                startNewChat();
            }
        } catch {
            /* non-critical */
        }
    }, [activeSessionId, startNewChat]);

    // Send question to AI backend and persist to active session
    const sendMessage = useCallback(async (questionText: string) => {
        if (!summaryId || !questionText.trim()) return;

        const userMsgId = 'user-' + Date.now();
        const userMsg: ChatMessage = {
            id: userMsgId,
            role: 'user',
            content: questionText.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsSending(true);
        setError(null);

        try {
            const historyForBackend = messages.map(m => ({
                role: m.role,
                content: m.content,
            }));

            const { data } = await api.post('/chat/ask', {
                summaryId,
                sessionId: activeSessionId,
                question: questionText.trim(),
                chatHistory: historyForBackend,
            });

            if (data?.sessionId) {
                setActiveSessionId(data.sessionId);
            }

            if (data?.messages) {
                setMessages(data.messages);
                const lastAssistant = data.messages.filter((m: ChatMessage) => m.role === 'assistant').slice(-1)[0];
                if (lastAssistant?.id) {
                    setLatestStreamedMsgId(lastAssistant.id);
                }
            } else {
                const assistantMsg: ChatMessage = {
                    id: 'assistant-' + Date.now(),
                    role: 'assistant',
                    content: data.answer || 'No response generated.',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                setMessages(prev => [...prev, assistantMsg]);
                setLatestStreamedMsgId(assistantMsg.id);
            }

            // Refresh chat threads history
            loadChatSessions();

        } catch (err: any) {
            const errMsg = err.response?.data?.message || err.message || 'Failed to get answer';
            setError(errMsg);
            const errId = 'error-' + Date.now();
            setMessages(prev => [
                ...prev,
                {
                    id: errId,
                    role: 'assistant',
                    content: `⚠️ Sorry, I ran into an error answering your question: ${errMsg}`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                },
            ]);
            setLatestStreamedMsgId(errId);
        } finally {
            setIsSending(false);
        }
    }, [summaryId, activeSessionId, messages, loadChatSessions]);

    const clearChat = useCallback(() => {
        setMessages([]);
        setError(null);
        setLatestStreamedMsgId(null);
    }, []);

    const addSystemMessage = useCallback((text: string) => {
        const sysId = 'system-' + Date.now();
        setMessages(prev => [
            ...prev,
            {
                id: sysId,
                role: 'assistant',
                content: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
        ]);
        setLatestStreamedMsgId(sysId);
    }, []);

    return {
        messages,
        chatSessions,
        activeSessionId,
        suggestedQuestions,
        latestStreamedMsgId,
        isSending,
        isLoadingHistory,
        isLoadingSuggestions,
        error,
        sendMessage,
        selectChatSession,
        startNewChat,
        deleteSession,
        loadChatSessions,
        clearChat,
        addSystemMessage,
    };
}
