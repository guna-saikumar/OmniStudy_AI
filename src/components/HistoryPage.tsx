import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { BookOpen, ArrowLeft, FileText, Clock, Eye, Download, Trash2, Moon, Sun } from 'lucide-react';
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

    const handleExport = async (id: string, fileName: string) => {
        try {
            toast.info(`Preparing export for ${fileName}...`);
            const { data } = await api.get(`/summaries/${id}`);

            const docTitle = fileName.replace('.pdf', '').replace(/\.pdf$/i, '');
            const textContent = data.content?.text;
            const keyPoints: string[] = (
                Array.isArray(textContent)
                    ? textContent
                    : (typeof textContent === 'string'
                        ? textContent.split('\n')
                        : ['Summary content not available.'])
            ).map((l: string) => l.replace(/^([^\w\s]+|\d+[\.\)]\s*)+\s*/, '').trim()).filter((l: string) => l.length > 5);

            const documentOutline: any[] = data.content?.documentOutline && data.content.documentOutline.length > 0
                ? data.content.documentOutline
                : keyPoints.slice(0, 6).map((pt: string, i: number) => ({
                    heading: `Section ${i + 1}`,
                    level: 1,
                    bullets: [pt],
                    subSections: [],
                }));

            const outlineText = documentOutline
                .map(s => `## ${s.heading}\n${s.bullets.map((b: string) => `  • ${b}`).join('\n')}`)
                .join('\n\n');

            const content = `${docTitle}\n\nKey Points:\n${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n\nDocument Outline:\n${outlineText}`;

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${docTitle}-summary.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Export completed successfully!');
        } catch (error) {
            toast.error('Failed to export summary');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="w-full px-8 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <span
                                className="text-[28px] font-semibold tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-clip-text text-transparent bg-gradient-to-r"
                                style={{
                                    backgroundImage: 'linear-gradient(to right, #082677 4%, #2B7FFF 13%, #2B7FFF 34%, #082677 43%, #2B7FFF 50%, #2B7FFF 80%, #082677 92%, #2B7FFF 100%)'
                                }}
                            >
                                OmniStudy AI
                            </span>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onThemeToggle} className="rounded-full">
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </Button>
                </div>
            </header>

            <main className="w-full px-8 sm:px-16 lg:px-24 xl:px-32 py-8 space-y-6">
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
                                <Card key={item._id} className="hover:shadow-md transition-shadow">
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
