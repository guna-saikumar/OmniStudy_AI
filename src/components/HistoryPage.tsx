import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { BookOpen, ArrowLeft, FileText, Clock, Eye, Download, Trash2, Moon, Sun, Share2, Copy, MessageCircle, ExternalLink } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import api from '../utils/api';
import { toast } from 'sonner';

interface HistoryPageProps {
    onBack: () => void;
    onViewSummary: (id: string, fileName: string) => void;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
}

export default function HistoryPage({ onBack, onViewSummary, theme, onThemeToggle }: HistoryPageProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchHistory = async () => {
            try {
                const { data } = await api.get('/summaries');
                if (isMounted) setHistory(data);
            } catch (error) {
                if (isMounted) toast.error('Failed to fetch history');
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        fetchHistory();
        return () => { isMounted = false; };
    }, []);

    const handleDelete = (id: string) => {
        const item = history.find((h) => h._id === id);
        const fileName = item?.fileName?.replace('.pdf', '') || 'Summary';

        // Optimistically remove from UI
        const previous = [...history];
        setHistory((prev) => prev.filter((h) => h._id !== id));

        let cancelled = false;
        const timer = setTimeout(async () => {
            if (cancelled) return;
            try {
                await api.delete(`/summaries/${id}`);
            } catch {
                setHistory(previous);
                toast.error('Failed to delete summary');
            }
        }, 4000);

        toast.success(`"${fileName}" deleted`, {
            duration: 4000,
            action: {
                label: 'Undo',
                onClick: () => {
                    cancelled = true;
                    clearTimeout(timer);
                    setHistory(previous);
                    toast.info('Deletion cancelled');
                },
            },
        });
    };
    const handleCopyLink = (id: string) => {
        const shareUrl = `${window.location.origin}/summary/${id}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
    };

    const handleWhatsAppShare = (item: any) => {
        const shareUrl = `${window.location.origin}/summary/${item._id}`;
        const text = encodeURIComponent(`Check out this document summary for "${item.fileName}" on OmniStudy AI: ${shareUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleSystemShare = async (item: any) => {
        const shareUrl = `${window.location.origin}/summary/${item._id}`;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: item.fileName,
                    text: `Check out this document summary for "${item.fileName}" on OmniStudy AI!`,
                    url: shareUrl,
                });
            } else {
                handleCopyLink(item._id);
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') toast.error('Failed to share');
        }
    };
    const handleExport = async (id: string, fileName: string) => {
        try {
            toast.info(`Preparing PDF export for ${fileName}...`);
            const { data: item } = await api.get(`/summaries/${id}`);
            const content = item.content || {};

            const element = document.createElement('div');
            element.className = 'pdf-export-container';
            element.style.background = '#030712'; // Slate 950 (Page Background)
            element.style.color = '#f8fafc';
            element.style.fontFamily = 'Inter, sans-serif';

            let html = `
                <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #1e293b;">
                    <h1 style="font-size: 32px; color: #60a5fa; margin-bottom: 10px; font-weight: 800; letter-spacing: -1px;">OmniStudy AI</h1>
                    <p style="font-size: 14px; color: #94a3b8; margin: 0;">Comprehensive Research Report: <span style="color: #60a5fa;">${item.fileName}</span></p>
                </div>
            `;

            // 1. Key Points
            const keyPoints = Array.isArray(content.text) ? content.text : (typeof content.text === 'string' ? content.text.split('\n') : []);
            if (keyPoints.length > 0) {
                html += `
                    <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
                        <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 20px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">keypoints</h2>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${keyPoints.map((p: string, idx: number) => `
                                <div style="display: flex; align-items: center; gap: 18px; background: #020617; border: 1px solid #1e40af; padding: 16px 20px; border-radius: 10px; page-break-inside: avoid;">
                                    <div style="flex-shrink: 0; width: 28px; height: 28px; background: #2563eb; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px;">
                                        ${idx + 1}
                                    </div>
                                    <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">${p}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            // 2. Outline
            const outline = content.documentOutline || [];
            if (outline.length > 0) {
                html += `
                    <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
                        <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">outline</h2>
                        ${outline.map((s: any, idx: number) => `
                            <div style="margin-bottom: 20px; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; page-break-inside: avoid; background: #020617;">
                                <div style="background: rgba(16, 185, 129, 0.1); padding: 14px 20px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 15px;">
                                    <div style="width: 24px; height: 24px; background: #10b981; color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">
                                        ${idx + 1}
                                    </div>
                                    <h3 style="font-size: 16px; font-weight: bold; color: #f8fafc; margin: 0;">${s.heading}</h3>
                                </div>
                                <div style="padding: 18px;">
                                    <div style="margin-bottom: 15px;">
                                        ${(s.bullets || []).map((b: string) => `
                                            <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                                                <span style="display: inline-block; width: 6px; height: 6px; background: #10b981; border-radius: 50%; margin-top: 8px; margin-right: 12px; flex-shrink: 0;"></span>
                                                <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">${b}</p>
                                            </div>
                                        `).join('')}
                                    </div>
                                    ${(s.subSections || []).map((sub: any, subIdx: number) => `
                                        <div style="margin-left: 20px; margin-top: 15px; padding-left: 15px; border-left: 1px solid #1e293b;">
                                            <h4 style="font-size: 14px; font-weight: bold; color: #10b981; margin-bottom: 10px; display: flex; align-items: center; gap: 10px;">
                                                ${sub.title}
                                            </h4>
                                            <div style="padding-left: 12px;">
                                                ${(sub.bullets || []).map((sb: string) => `
                                                    <div style="display: flex; align-items: flex-start; margin-bottom: 6px;">
                                                        <span style="display: inline-block; width: 4px; height: 4px; background: #475569; border-radius: 50%; margin-top: 8px; margin-right: 10px; flex-shrink: 0;"></span>
                                                        <p style="margin: 0; color: #64748b; font-size: 13px;">${sb}</p>
                                                    </div>
                                                `).join('')}
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            // 3. Infographic (hub, steps, orbit, flow)
            const mindmapData = content.mindMap || content.mindMapData;
            const infographicData = content.infographic || content.infographicData;

            if (infographicData?.sections) {
                html += `
                    <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
                        <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">infographic (hub,steps , orbit , flow)</h2>
                        
                        <!-- Hub Section -->
                        <div style="margin-bottom: 35px; page-break-inside: avoid;">
                            <p style="font-weight: bold; font-size: 15px; color: #818cf8; margin-bottom: 15px; display: flex; align-items: center;">
                                <span style="width: 8px; height: 8px; background: #818cf8; border-radius: 50%; margin-right: 12px; box-shadow: 0 0 10px #818cf8;"></span>
                                Knowledge Hub
                            </p>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                ${infographicData.sections.slice(0, 6).map((sec: any) => `
                                    <div style="background: #020617; padding: 18px; border-radius: 12px; border: 1px solid #1e293b; border-top: 3px solid #818cf8;">
                                        <span style="font-size: 11px; font-weight: bold; color: #c7d2fe; text-transform: uppercase; letter-spacing: 0.8px;">${sec.title}</span>
                                        <p style="font-size: 13px; color: #94a3b8; margin-top: 10px; line-height: 1.6;">${sec.points ? sec.points[0] : ''}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Process Flow Section -->
                        ${infographicData.logicalFlow ? `
                            <div style="margin-bottom: 35px; page-break-inside: avoid;">
                                <p style="font-weight: bold; font-size: 15px; color: #fb923c; margin-bottom: 15px; display: flex; align-items: center;">
                                    <span style="width: 8px; height: 8px; background: #fb923c; border-radius: 50%; margin-right: 12px; box-shadow: 0 0 10px #fb923c;"></span>
                                    Logical Interaction Flow
                                </p>
                                <div style="background: #020617; border: 1px solid #1e293b; padding: 25px; border-radius: 15px; border-style: dashed; border-color: #334155;">
                                    ${infographicData.logicalFlow.map((f: any) => `
                                        <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                            <span style="background: #0f172a; border: 1.5px solid #fb923c; padding: 8px 14px; border-radius: 8px; font-size: 13px; color: #fdba74; font-weight: 600;">${f.from}</span>
                                            <span style="margin: 0 18px; color: #fb923c; font-weight: bold; font-size: 20px;">➔</span>
                                            <span style="background: #0f172a; border: 1.5px solid #fb923c; padding: 8px 14px; border-radius: 8px; font-size: 13px; color: #fdba74; font-weight: 600;">${f.to}</span>
                                            <span style="font-size: 12px; color: #64748b; margin-left: 18px; font-style: italic;">(${f.label})</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <!-- Orbit Summary -->
                        <div style="margin-bottom: 10px; page-break-inside: avoid;">
                            <p style="font-weight: bold; font-size: 15px; color: #22d3ee; margin-bottom: 15px; display: flex; align-items: center;">
                                <span style="width: 8px; height: 8px; background: #22d3ee; border-radius: 50%; margin-right: 12px; box-shadow: 0 0 10px #22d3ee;"></span>
                                Conceptual Orbit
                            </p>
                            <div style="background: #000000; border: 1px solid #22d3ee; padding: 25px; border-radius: 100px; text-align: center; border-style: dotted;">
                                <p style="font-size: 14px; color: #e0f2fe; margin: 0; font-weight: 600;">
                                    Core Sphere: <strong style="font-size: 16px; color: #22d3ee;">${item.fileName}</strong>
                                </p>
                                <p style="font-size: 12px; color: #bae6fd; margin-top: 10px; letter-spacing: 0.5px;">
                                    Outer Influence: ${infographicData.sections.slice(0, 5).map((s: any) => s.title).join(' • ')}
                                </p>
                            </div>
                        </div>
                    </div>
                `;
            }

            // 4. Mindmap
            if (mindmapData?.nodes) {
                html += `
                    <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b; page-break-inside: avoid;">
                        <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">mindmap</h2>
                        <div style="background: #020617; border: 1px solid #312e81; padding: 25px; border-radius: 12px; border-right: 8px solid #7c3aed; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4);">
                            <p style="font-size: 15px; color: #e0e7ff; line-height: 1.7; margin: 0;">
                                Complete neural network mapped with <strong style="color: #c084fc;">${mindmapData.nodes.length}</strong> semantic nodes. 
                                Primary branches: <span style="color: #a5b4fc;">${mindmapData.nodes.slice(0, 8).map((n: any) => n.name || n.label).join(', ')}</span>.
                            </p>
                        </div>
                    </div>
                `;
            }

            // 5. Flashcards
            const flashcards = content.flashcards || [];
            if (flashcards.length > 0) {
                html += `
                    <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b; page-break-inside: avoid;">
                        <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">flashcards</h2>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                            ${flashcards.map((f: any, i: number) => `
                                <div style="border: 1px solid #3d0a21; padding: 18px; border-radius: 12px; background: #020617; border-left: 6px solid #ec4899; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);">
                                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                        <span style="background: #ec4899; color: white; border-radius: 4px; padding: 2px 8px; font-size: 10px; font-weight: bold; margin-right: 12px;">CARD ${i + 1}</span>
                                        <p style="font-weight: 700; color: #fdf2f8; margin: 0; font-size: 15px;">Q: ${f.question}</p>
                                    </div>
                                    <div style="border-top: 1px dashed #500724; padding-top: 12px; color: #fbcfe8; font-size: 14px; line-height: 1.6;">
                                        <strong style="color: #f472b6; display: block; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">The Insight:</strong> ${f.answer}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            // 6. Comparative Analysis
            const tables = content.comparativeTable || [];
            if (Array.isArray(tables) && tables.length > 0) {
                html += `
                    <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
                        <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">comparision</h2>
                        ${tables.map((table: any, tIdx: number) => {
                    if (!table) return '';
                    const isExpanded = table.headers && table.rows;
                    const headers = isExpanded ? table.headers : (table[0] ? Object.keys(table[0]) : []);
                    const rows = isExpanded ? table.rows : table;
                    const tableTitle = table.title || `Comparison Table ${tIdx + 1}`;

                    return `
                                <div style="margin-bottom: 25px; page-break-inside: avoid; background: #020617; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
                                    <h3 style="font-size: 15px; font-weight: bold; color: #cbd5e1; padding: 12px 20px; background: #1e293b; margin: 0;">${tableTitle}</h3>
                                    <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #cbd5e1;">
                                        <thead>
                                            <tr style="background: #000000;">
                                                ${headers.map((h: string) => `<th style="border: 1px solid #1e293b; padding: 10px; text-align: left; color: #60a5fa; font-weight: 600;">${h}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rows.map((row: any) => `
                                                <tr>
                                                    ${isExpanded
                            ? row.map((cell: any) => `<td style="border: 1px solid #1e293b; padding: 10px; vertical-align: top;">${cell || ''}</td>`).join('')
                            : headers.map((k: string) => `<td style="border: 1px solid #1e293b; padding: 10px; vertical-align: top;">${row[k] || ''}</td>`).join('')
                        }
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `;
                }).join('')}
                    </div>
                `;
            }

            element.innerHTML = html;

            const opt: any = {
                margin: [10, 10, 10, 10] as [number, number, number, number],
                filename: `${fileName.split('.')[0]}_OmniStudy_Report.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Dynamic import to avoid blocking initial load
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            await html2pdf().set(opt).from(element).save();
            toast.success('PDF report generated successfully!');
        } catch (error: any) {
            console.error('Export failed:', error);
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            toast.error(`Export failed: ${msg}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
                <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <span className="text-[20px] sm:text-[28px] font-bold tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center">
                                <span style={{ color: '#1d51df' }}>O</span>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>mni</span>
                                <span style={{ color: '#1d51df' }} className="ml-1">S</span>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>tudy</span>
                                <span className="inline-block w-1 sm:w-2"></span>
                                <span style={{ color: '#1d51df' }}>A</span>
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>I</span>
                            </span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onThemeToggle} className="rounded-full">
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </Button>
                </div>
            </header>

            <main className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-8 space-y-6">
                <h1 className="text-3xl font-bold">All Summaries</h1>
                <p className="text-gray-600 dark:text-gray-400">View and manage all your past document summaries.</p>

                <div className="space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col gap-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-24 w-full bg-white dark:bg-gray-800 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <>
                            {history.map((item) => (
                                <Card key={item._id} className="hover:shadow-md transition-shadow dark:bg-black">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className="bg-blue-100 dark:bg-blue-950 p-3 rounded-lg">
                                                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-lg mb-1 truncate">{item.fileName}</h3>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {new Date(item.createdAt).toLocaleDateString()}
                                                        </span>
                                                        <span>{item.pages} pages</span>
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5"
                                                    onClick={() => onViewSummary(item._id, item.fileName)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5"
                                                    onClick={() => handleExport(item._id, item.fileName)}
                                                >
                                                    <Download className="h-4 w-4" />
                                                    Export
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl outline-none">
                                                        <Share2 className="h-4 w-4" />
                                                        Share
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 bg-white dark:bg-slate-900 border shadow-xl z-50">
                                                        <DropdownMenuItem onClick={() => handleCopyLink(item._id)} className="gap-2 rounded-xl cursor-copy">
                                                            <Copy className="h-4 w-4 text-blue-500" />
                                                            Copy Link
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleWhatsAppShare(item)} className="gap-2 rounded-xl">
                                                            <MessageCircle className="h-4 w-4 text-green-500" />
                                                            WhatsApp
                                                        </DropdownMenuItem>
                                                        {!!navigator.share && (
                                                            <DropdownMenuItem onClick={() => handleSystemShare(item)} className="gap-2 rounded-xl">
                                                                <ExternalLink className="h-4 w-4 text-purple-500" />
                                                                More...
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDelete(item._id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {history.length === 0 && (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">No history found.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
