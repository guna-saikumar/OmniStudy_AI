import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import {
    ArrowLeft,
    Bot,
    User,
    Send,
    Trash2,
    Sparkles,
    Loader2,
    Copy,
    Check,
    Moon,
    Sun,
    MessageCircle,
    Paperclip,
    Upload,
    Pencil,
    RotateCcw,
    ThumbsUp,
    ThumbsDown,
    Volume2,
    VolumeX,
    PanelLeftClose,
    PanelLeftOpen,
    FileText,
    Plus,
    History,
    Clock,
    X,
} from 'lucide-react';
import { useDocumentChat } from '../hooks/useDocumentChat';
import { ChatGPTMarkdown } from './ChatGPTMarkdown';
import { toast } from 'sonner';
import api from '../utils/api';

interface DocumentChatPageProps {
    summaryId: string | null;
    fileName: string;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    onBack: () => void;
}

// ── Gemini AI Style Smooth Linear Typewriter Text Component ──────────────────
const TypewriterText: React.FC<{ text: string; isLatest: boolean }> = ({ text, isLatest }) => {
    const [displayedText, setDisplayedText] = useState(isLatest ? '' : text);
    const [isTyping, setIsTyping] = useState(isLatest);

    useEffect(() => {
        if (!isLatest) {
            setDisplayedText(text);
            setIsTyping(false);
            return;
        }

        let index = 0;
        const words = text.split(' ');
        setIsTyping(true);

        const interval = setInterval(() => {
            if (index < words.length) {
                setDisplayedText(words.slice(0, index + 1).join(' '));
                index++;
            } else {
                setIsTyping(false);
                clearInterval(interval);
            }
        }, 25); // Smooth 25ms linear typewriter pace

        return () => clearInterval(interval);
    }, [text, isLatest]);

    return (
        <div>
            <ChatGPTMarkdown content={displayedText} />
            {isTyping && (
                <span className="inline-block w-2 h-4 ml-1 bg-blue-500 animate-pulse rounded-sm align-middle" />
            )}
        </div>
    );
};

export const DocumentChatPage: React.FC<DocumentChatPageProps> = ({
    summaryId: initialSummaryId,
    fileName: initialFileName,
    theme,
    onThemeToggle,
    onBack,
}) => {
    const [currentSummaryId, setCurrentSummaryId] = useState<string | null>(initialSummaryId);
    const [docTitle, setDocTitle] = useState(initialFileName.replace(/\.[^.]+$/, ''));
    const [inputQuery, setInputQuery] = useState('');
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFileName, setUploadFileName] = useState('');
    
    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // ChatGPT Style Action States
    const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
    const [feedbackMap, setFeedbackMap] = useState<Record<string, 'up' | 'down'>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        messages,
        chatSessions,
        activeSessionId,
        suggestedQuestions,
        latestStreamedMsgId,
        isSending,
        isLoadingHistory,
        isLoadingSuggestions,
        sendMessage,
        selectChatSession,
        startNewChat,
        deleteSession,
        clearChat,
        addSystemMessage,
    } = useDocumentChat(currentSummaryId);

    // Fetch document summary title
    useEffect(() => {
        if (!currentSummaryId) return;
        api.get(`/summaries/${currentSummaryId}`)
            .then(({ data }) => {
                if (data?.fileName) {
                    setDocTitle(data.fileName.replace(/\.[^.]+$/, ''));
                }
            })
            .catch(() => { /* non-critical */ });
    }, [currentSummaryId]);

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSending, isUploading]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputQuery.trim() || isSending || isUploading) return;
        const q = inputQuery;
        setInputQuery('');
        await sendMessage(q);
    };

    const handleSuggestedClick = async (q: string) => {
        if (isSending || isUploading) return;
        await sendMessage(q);
    };

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMsgId(id);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopiedMsgId(null), 2000);
    };

    // User Edit Question Handler
    const handleStartEdit = (id: string, currentText: string) => {
        setEditingMsgId(id);
        setEditText(currentText);
    };

    const handleSaveEdit = async (id: string) => {
        if (!editText.trim() || isSending) return;
        setEditingMsgId(null);
        await sendMessage(editText.trim());
    };

    // AI Regenerate Response Handler
    const handleRegenerate = async (questionText: string) => {
        if (isSending) return;
        await sendMessage(questionText);
    };

    // Read Aloud Text-to-Speech Handler
    const handleSpeak = (id: string, text: string) => {
        if (!('speechSynthesis' in window)) {
            toast.error('Text-to-speech is not supported in this browser.');
            return;
        }

        if (speakingMsgId === id) {
            window.speechSynthesis.cancel();
            setSpeakingMsgId(null);
            return;
        }

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`$]/g, ''));
        utterance.rate = 1.0;
        utterance.onend = () => setSpeakingMsgId(null);
        utterance.onerror = () => setSpeakingMsgId(null);

        setSpeakingMsgId(id);
        window.speechSynthesis.speak(utterance);
    };

    // Feedback Thumbs Up / Down
    const handleFeedback = (id: string, type: 'up' | 'down') => {
        setFeedbackMap(prev => ({ ...prev, [id]: type }));
        toast.success(type === 'up' ? 'Thanks for your positive feedback!' : 'Feedback recorded.');
    };

    // Document File Upload Handler
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        e.target.value = '';
        setIsUploading(true);
        setUploadFileName(file.name);

        try {
            const formData = new FormData();
            formData.append('pdf', file);

            const userInfo = localStorage.getItem('userInfo');
            const token = userInfo ? JSON.parse(userInfo).token : null;

            const { data } = await api.post('/summaries/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (data?._id) {
                const newTitle = (data.fileName || file.name).replace(/\.[^.]+$/, '');
                setCurrentSummaryId(data._id);
                setDocTitle(newTitle);

                sessionStorage.setItem(`summary_file_${data._id}`, data.fileName || file.name);

                startNewChat();
                addSystemMessage(`📄 Successfully uploaded document "${data.fileName || file.name}". Now chatting about this file!`);
                toast.success(`Uploaded & processed "${file.name}"!`);
            }
        } catch (err: any) {
            const errMsg = err.response?.data?.message || err.message || 'File upload failed';
            toast.error(errMsg);
            addSystemMessage(`⚠️ Failed to upload file "${file.name}": ${errMsg}`);
        } finally {
            setIsUploading(false);
            setUploadFileName('');
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf,.txt,.docx,.doc,.pptx,.ppt,image/*"
                className="hidden"
            />

            {/* ── Top Navigation Header ───────────────────────────────────────── */}
            <header className="shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 print:hidden">
                <div className="w-full px-4 sm:px-12 lg:px-16 py-2 sm:py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Sidebar Toggle Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="rounded-xl h-9 w-9 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title={isSidebarOpen ? 'Hide Chat History Sidebar' : 'Show Chat History Sidebar'}
                        >
                            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
                            title="Back to Summary"
                        >
                            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </Button>

                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={onBack}>
                            <img
                                src="/icons/logo-transparent-192.png"
                                alt="OmniStudy Logo"
                                className="w-6 h-6 sm:w-8 sm:h-8"
                            />
                            <span className="brand-logo text-[18px] sm:text-[26px]">
                                OmniStudy <span className="brand-logo-ai">AI</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onThemeToggle}
                            className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
                        >
                            {theme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </Button>
                    </div>
                </div>
            </header>

            {/* ── Main Layout Wrapper with ChatGPT-Style Left Chat History Sidebar ── */}
            <div className="flex-1 flex overflow-hidden h-[calc(100vh-57px)]">

                {/* ── ChatGPT Style Left Chat History Sidebar ─────────────────── */}
                <aside
                    className={`${
                        isSidebarOpen ? 'w-64 sm:w-72' : 'w-0 -translate-x-full overflow-hidden border-none'
                    } transition-all duration-300 ease-in-out bg-white dark:bg-gray-800/95 border-r border-gray-200 dark:border-gray-700/80 flex flex-col shrink-0 h-full overflow-hidden z-20`}
                >
                    {/* Sidebar Header & New Chat Button */}
                    <div className="p-3.5 border-b border-gray-200 dark:border-gray-700/80 space-y-2">
                        <Button
                            onClick={startNewChat}
                            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm h-10 shadow-sm gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            <span>New Chat</span>
                        </Button>
                    </div>

                    {/* Chat Conversations History List */}
                    <div className="flex-1 overflow-y-auto p-2.5 space-y-1 text-xs">
                        <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            <span className="flex items-center gap-1.5">
                                <History className="h-3.5 w-3.5 text-blue-500" /> Chat Conversations ({chatSessions.length})
                            </span>
                        </div>

                        {isLoadingHistory ? (
                            <div className="py-8 text-center text-gray-400 space-y-2">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto text-blue-500" />
                                <span className="text-[11px]">Loading chat history...</span>
                            </div>
                        ) : chatSessions.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 text-[11px] px-2 space-y-1">
                                <p className="font-semibold text-gray-500 dark:text-gray-400">No chat threads yet.</p>
                                <p>Ask a question to start and save your first AI chat conversation!</p>
                            </div>
                        ) : (
                            chatSessions.map((session) => {
                                const isSelected = session._id === activeSessionId;
                                const sessionDate = new Date(session.updatedAt || session.createdAt || Date.now()).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                });
                                const msgCount = session.messages?.length || 0;

                                return (
                                    <div
                                        key={session._id}
                                        onClick={() => selectChatSession(session._id)}
                                        className={`group w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                                            isSelected
                                                ? 'bg-blue-50/90 dark:bg-gray-700/80 border border-blue-300 dark:border-gray-600 text-blue-900 dark:text-white font-semibold shadow-sm'
                                                : 'border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-1">
                                            <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-gray-300 dark:group-hover:bg-gray-600 dark:group-hover:text-white'}`}>
                                                <MessageCircle className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="truncate space-y-0.5">
                                                <p className={`truncate text-xs ${isSelected ? 'font-semibold text-blue-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white'}`}>{session.title}</p>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex items-center gap-1.5">
                                                    <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {sessionDate}</span>
                                                    <span>•</span>
                                                    <span>{msgCount} {msgCount === 1 ? 'msg' : 'msgs'}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteSession(session._id);
                                            }}
                                            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/60 text-gray-400 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                            title="Delete chat conversation"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </aside>

                {/* ── Main Chat Column ────────────────────────────────────────── */}
                <main className={`flex-1 flex flex-col p-4 sm:p-6 space-y-4 ${isSidebarOpen ? 'max-w-5xl' : 'max-w-[1400px] sm:px-12 lg:px-16'} mx-auto w-full h-full overflow-hidden transition-all duration-300`}>
                    
                    {/* Header Banner */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden shrink-0">
                        <div>
                            <h1 className="text-lg sm:text-2xl font-semibold line-clamp-1 leading-tight flex items-center gap-2">
                                <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 hidden sm:inline-block" />
                                Ask OmniStudy AI — {docTitle}
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                                Ask questions, clarify formulas, or explore concepts grounded strictly in your document content
                            </p>
                        </div>

                        <Badge variant="outline" className="border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold px-2.5 py-0.5 text-xs shrink-0">
                            Grounded AI Mode
                        </Badge>
                    </div>

                    {/* Main Chat Panel Card */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                        
                        {/* Message Scroll Area */}
                        <div className="flex-1 p-5 overflow-y-auto space-y-6 text-sm">
                            {messages.length === 0 ? (
                                <div className="h-full py-10 flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm border border-blue-100 dark:border-blue-900">
                                        <Sparkles className="h-8 w-8 animate-pulse" />
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                            Have a question about {docTitle}?
                                        </h3>
                                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                                            Type your query or click one of the suggested prompts below to get instant answers with formulas and step-by-step explanations.
                                        </p>
                                    </div>

                                    {/* Suggested Prompts */}
                                    <div className="w-full pt-2 space-y-3">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Suggested Questions
                                        </p>
                                        {isLoadingSuggestions ? (
                                            <div className="flex items-center justify-center py-4 text-gray-400 gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                                <span className="text-xs">Generating study prompts...</span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                {suggestedQuestions.map((q, idx) => (
                                                    <Card
                                                        key={idx}
                                                        onClick={() => handleSuggestedClick(q)}
                                                        className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 hover:border-blue-400 dark:hover:border-blue-600 cursor-pointer transition-all hover:shadow-sm text-left flex flex-col justify-between group"
                                                    >
                                                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-3">
                                                            "{q}"
                                                        </p>
                                                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-200/60 dark:border-gray-800 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                                                            <span>Ask question</span>
                                                            <Sparkles className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform" />
                                                        </div>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                messages.map((m, idx) => (
                                    <div
                                        key={m.id}
                                        className={`flex flex-col space-y-1.5 ${
                                            m.role === 'user' ? 'items-end' : 'items-start'
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium px-1">
                                            {m.role === 'user' ? (
                                                <><span>You</span><User className="h-3 w-3" /></>
                                            ) : (
                                                <><Bot className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /><span className="text-blue-600 dark:text-blue-400 font-semibold">OmniStudy AI</span></>
                                            )}
                                            <span className="text-[10px] ml-1">• {m.timestamp}</span>
                                        </div>

                                        {/* User Question Block */}
                                        {m.role === 'user' ? (
                                            <div className="flex flex-col items-end space-y-1.5 max-w-[90%] sm:max-w-[80%] group">
                                                {editingMsgId === m.id ? (
                                                    <div className="w-full bg-white dark:bg-gray-800 p-3 rounded-2xl border border-blue-400 dark:border-blue-600 shadow-md space-y-2">
                                                        <Input
                                                            value={editText}
                                                            onChange={(e) => setEditText(e.target.value)}
                                                            className="text-sm border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                                                        />
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setEditingMsgId(null)}
                                                                className="text-xs h-8 rounded-lg"
                                                            >
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleSaveEdit(m.id)}
                                                                className="text-xs h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                                                            >
                                                                Save & Resend
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 sm:p-5 rounded-2xl bg-blue-600 text-white rounded-br-none shadow-sm leading-relaxed text-sm">
                                                        <p className="whitespace-pre-wrap">{m.content}</p>
                                                    </div>
                                                )}

                                                {/* User Actions */}
                                                {editingMsgId !== m.id && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                                        <button
                                                            onClick={() => handleStartEdit(m.id, m.content)}
                                                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                            title="Edit question"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCopy(m.id, m.content)}
                                                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                            title="Copy question"
                                                        >
                                                            <Copy className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* AI Assistant Output */
                                            <div className="flex flex-col items-start space-y-2 max-w-[90%] sm:max-w-[85%] group">
                                                <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none shadow-sm w-full leading-relaxed">
                                                    <TypewriterText text={m.content} isLatest={m.id === latestStreamedMsgId} />
                                                </div>

                                                {/* Actions Bar */}
                                                <div className="flex items-center gap-1.5 text-gray-400 text-xs pl-1">
                                                    <button
                                                        onClick={() => handleCopy(m.id, m.content)}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
                                                        title="Copy response"
                                                    >
                                                        {copiedMsgId === m.id ? (
                                                            <Check className="h-3.5 w-3.5 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>

                                                    <button
                                                        onClick={() => handleSpeak(m.id, m.content)}
                                                        className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 ${
                                                            speakingMsgId === m.id ? 'text-blue-600 dark:text-blue-400 animate-pulse' : 'hover:text-gray-700 dark:hover:text-gray-200'
                                                        }`}
                                                        title={speakingMsgId === m.id ? 'Stop reading' : 'Read aloud'}
                                                    >
                                                        {speakingMsgId === m.id ? (
                                                            <VolumeX className="h-3.5 w-3.5" />
                                                        ) : (
                                                            <Volume2 className="h-3.5 w-3.5" />
                                                        )}
                                                    </button>

                                                    {idx > 0 && messages[idx - 1]?.role === 'user' && (
                                                        <button
                                                            onClick={() => handleRegenerate(messages[idx - 1].content)}
                                                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
                                                            title="Regenerate response"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}

                                                    <div className="h-3 w-px bg-gray-200 dark:bg-gray-800 mx-0.5" />

                                                    <button
                                                        onClick={() => handleFeedback(m.id, 'up')}
                                                        className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                                            feedbackMap[m.id] === 'up' ? 'text-green-600 dark:text-green-400 font-bold' : 'hover:text-gray-700 dark:hover:text-gray-200'
                                                        }`}
                                                        title="Good response"
                                                    >
                                                        <ThumbsUp className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleFeedback(m.id, 'down')}
                                                        className={`p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                                                            feedbackMap[m.id] === 'down' ? 'text-red-600 dark:text-red-400 font-bold' : 'hover:text-gray-700 dark:hover:text-gray-200'
                                                        }`}
                                                        title="Bad response"
                                                    >
                                                        <ThumbsDown className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}

                            {isSending && (
                                <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400 italic pt-2">
                                    <Bot className="h-4 w-4 animate-bounce" />
                                    <span className="text-xs font-semibold">OmniStudy AI is analyzing document text and generating answer...</span>
                                </div>
                            )}

                            {isUploading && (
                                <div className="flex items-center gap-2.5 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-xs font-semibold">Uploading and analyzing document "{uploadFileName}"...</span>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input Bar */}
                        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading || isSending}
                                className="h-11 w-11 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
                                title="Upload new file (PDF, TXT, DOCX, PPTX)"
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>

                            <Input
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                placeholder={`Ask any doubt or question about ${docTitle}...`}
                                className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm h-11 px-4 focus-visible:ring-blue-500"
                                disabled={isSending || isUploading}
                            />

                            <Button
                                type="submit"
                                disabled={!inputQuery.trim() || isSending || isUploading}
                                className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shrink-0 shadow-sm transition-all gap-2"
                            >
                                {isSending ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>Send</span>
                                        <Send className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
};
