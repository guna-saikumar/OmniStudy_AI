import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import {
  BookOpen,
  ArrowLeft,
  Copy,
  Download,
  Share2,
  RefreshCw,
  FileText,
  ImageIcon,
  Moon,
  Sun,
  CheckCircle2,
  Table,
  SquareStack,
  Network,
  List,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import MindMapViewer from './MindMapViewer';
import InfographicViewer from './InfographicViewer';
import FlashcardsViewer from './FlashcardsViewer';
import ComparativeTableViewer from './ComparativeTableViewer';

interface SummaryViewerProps {
  fileName: string;
  summaryId: string | null;
  onBack: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

type TabId = 'text' | 'mindmap' | 'infographic' | 'flashcards' | 'table' | 'outline';

// ── Highlights important words (capitalized nouns, numbers, technical terms) ──
function HighlightedText({ text }: { text: string }) {
  // Split on whitespace but keep the spaces for rendering
  const words = text.split(/(\s+)/);
  return (
    <>
      {words.map((word, i) => {
        const clean = word.replace(/[^a-zA-Z0-9\-]/g, '');
        const isImportant =
          /^[A-Z][a-zA-Z]{2,}$/.test(clean) ||   // Capitalised proper noun/acronym
          /^\d+(\.\d+)?%?$/.test(clean) ||         // Numbers / percentages
          /^[A-Z]{2,}$/.test(clean) ||             // All-caps acronym
          /^[a-zA-Z]+-[a-zA-Z]+$/.test(clean);    // Hyphenated compound term

        return isImportant ? (
          <strong key={i} className="font-semibold text-blue-700 dark:text-blue-300">
            {word}
          </strong>
        ) : (
          <span key={i}>{word}</span>
        );
      })}
    </>
  );
}


export default function SummaryViewer({
  fileName,
  summaryId,
  onBack,
  theme,
  onThemeToggle,
}: SummaryViewerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('text');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  const toggleSection = (i: number) =>
    setExpandedSections(prev => ({ ...prev, [i]: prev[i] === false ? true : false }));

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      if (!summaryId) return;
      try {
        setLoading(true);
        const { data } = await api.get(`/summaries/${summaryId}`);
        if (isMounted) setSummary(data);
      } catch (error) {
        if (isMounted) toast.error('Failed to load summary details');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchSummary();
    return () => { isMounted = false; };
  }, [summaryId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 text-blue-500 animate-spin" />
          <p className="text-gray-500">Loading your summary...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Card className="w-[400px]">
          <CardHeader><CardTitle>Summary Not Found</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <p className="text-center text-gray-500">We couldn't find the summary you're looking for.</p>
            <Button onClick={onBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const docTitle = summary.fileName?.replace('.pdf', '').replace(/\.pdf$/i, '') || 'Document';

  const textContent = summary.content?.text;
  const keyPoints: string[] = (
    Array.isArray(textContent)
      ? textContent
      : (typeof textContent === 'string'
        ? textContent.split('\n')
        : ['Summary content not available.'])
  ).map((l: string) => l.replace(/^([^\w\s]+|\d+[\.\)]\s*)+\s*/, '').trim()).filter((l: string) => l.length > 5);


  // Document Outline data
  const documentOutline: {
    heading: string;
    level: number;
    bullets: string[];
    subSections: { title: string; bullets: string[] }[];
  }[] =
    summary.content?.documentOutline && summary.content.documentOutline.length > 0
      ? summary.content.documentOutline
      : keyPoints.slice(0, 6).map((pt: string, i: number) => ({
        heading: `Section ${i + 1}`,
        level: 1,
        bullets: [pt],
        subSections: [],
      }));

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleCopy = () => {
    const text = keyPoints.join('\n');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => toast.success('Summary copied!'),
        () => toast.error('Copy failed')
      );
    }
  };

  const handleDownloadTXT = () => {
    const outlineText = documentOutline
      .map(s => `## ${s.heading}\n${s.bullets.map(b => `  • ${b}`).join('\n')}`)
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
    toast.success('TXT downloaded!');
  };

  const handleDownloadPDF = () => {
    // Hidden style tag to ensure toast and other UI are hidden during print
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        [data-sonner-toaster] { display: none !important; }
        .print\\:hidden { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    window.print();

    // Clean up after print dialog is closed
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1000);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: docTitle,
          text: 'Check out this document summary on OmniStudy AI!',
          url: window.location.href,
        });
        toast.success('Shared successfully!');
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };
  const handleRegenerate = async () => {
    if (!summaryId) return;
    try {
      setLoading(true);
      toast.info('Regenerating with smarter exhaustive logic...');
      const { data } = await api.post(`/summaries/${summaryId}/regenerate`);
      setSummary(data);
      toast.success('Summary regenerated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Regeneration failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Tab config ────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; short: string; icon: React.ReactNode; activeBg: string; iconBg: string; iconColor: string }[] = [
    { id: 'text', label: 'Key Points', short: 'Points', icon: <FileText className="h-4 w-4" />, activeBg: 'bg-blue-500 hover:bg-blue-600', iconBg: 'bg-blue-100 dark:bg-blue-950', iconColor: 'text-blue-600 dark:text-blue-400' },
    { id: 'outline', label: 'Outline', short: 'Outline', icon: <List className="h-4 w-4" />, activeBg: 'bg-indigo-500 hover:bg-indigo-600', iconBg: 'bg-indigo-100 dark:bg-indigo-950', iconColor: 'text-indigo-600 dark:text-indigo-400' },
    { id: 'infographic', label: 'Infographic', short: 'Visual', icon: <ImageIcon className="h-4 w-4" />, activeBg: 'bg-orange-500 hover:bg-orange-600', iconBg: 'bg-orange-100 dark:bg-orange-950', iconColor: 'text-orange-600 dark:text-orange-400' },
    { id: 'mindmap', label: 'Mind Map', short: 'Map', icon: <Network className="h-4 w-4" />, activeBg: 'bg-purple-500 hover:bg-purple-600', iconBg: 'bg-purple-100 dark:bg-purple-950', iconColor: 'text-purple-600 dark:text-purple-400' },
    { id: 'flashcards', label: 'Flashcards', short: 'Cards', icon: <SquareStack className="h-4 w-4" />, activeBg: 'bg-pink-500 hover:bg-pink-600', iconBg: 'bg-pink-100 dark:bg-pink-950', iconColor: 'text-pink-600 dark:text-pink-400' },
    { id: 'table', label: 'Comparison', short: 'Table', icon: <Table className="h-4 w-4" />, activeBg: 'bg-gray-600 hover:bg-gray-700', iconBg: 'bg-gray-100 dark:bg-gray-800', iconColor: 'text-gray-600 dark:text-gray-400' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 print:hidden">
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

      <main className="w-full px-8 sm:px-16 lg:px-24 xl:px-32 py-8">
        <div className="space-y-6">
          {/* Title and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-3xl font-bold">{docTitle}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Summary generated from {summary.fileName || fileName}
                {summary.pages && <span className="ml-2">· {summary.pages} page{summary.pages !== 1 ? 's' : ''}</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}><Copy className="h-4 w-4 mr-2" />Copy</Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}><Download className="h-4 w-4 mr-2" />PDF</Button>
              <Button variant="outline" size="sm" onClick={handleDownloadTXT}><Download className="h-4 w-4 mr-2" />TXT</Button>
              <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="h-4 w-4 mr-2" />Share</Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate} className="border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950">
                <RefreshCw className="h-4 w-4 mr-2" />Regenerate
              </Button>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="w-full">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? 'default' : 'outline'}
                    size="sm"
                    className={`gap-2 text-xs sm:text-sm ${isActive ? tab.activeBg : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <div className={`p-1.5 rounded ${isActive ? 'bg-white/20' : tab.iconBg}`}>
                      <span className={isActive ? 'text-white' : tab.iconColor}>{tab.icon}</span>
                    </div>
                    <span className="hidden lg:inline">{tab.label}</span>
                    <span className="lg:hidden">{tab.short}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* ── Text View (Key Points Only) ──────────── */}
          <div className={activeTab === 'text' ? 'block' : 'hidden mb-12 break-inside-avoid'}>
            <Card>
              <CardHeader><CardTitle>Key Points</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[700px] pr-4 print:h-auto print:overflow-visible overflow-visible">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        {keyPoints.map((point: string, index: number) => (
                          <div key={index} className="flex gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 shadow-sm">
                            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                              {index + 1}
                            </span>
                            <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm md:text-base">
                              <HighlightedText text={point} />
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* ── Document Outline View ─────────────────────────────── */}
          <div className={activeTab === 'outline' ? 'block' : 'hidden mb-12 break-inside-avoid'}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5 text-indigo-500" />
                  Document Outline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[700px] pr-4 print:h-auto print:overflow-visible overflow-visible">
                  <div className="space-y-4">
                    {documentOutline.map((section, sIdx) => (
                      <div key={sIdx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
                        <button
                          className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/30 dark:to-blue-950/30 hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/40 dark:hover:to-blue-900/40 transition-colors text-left"
                          onClick={() => toggleSection(sIdx)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500 text-white text-sm font-bold flex-shrink-0 shadow-sm">
                              {sIdx + 1}
                            </div>
                            <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base">{section.heading}</h4>
                          </div>
                          {expandedSections[sIdx] === false ? <ChevronRight className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </button>

                        {expandedSections[sIdx] !== false && (
                          <div className="p-5 space-y-6 bg-white dark:bg-gray-950">
                            <div className="space-y-3">
                              {(section.bullets || []).map((bullet: string, bIdx: number) => (
                                <div key={bIdx} className="flex gap-4">
                                  <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-2.5 shadow-sm" />
                                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{bullet}</p>
                                </div>
                              ))}
                            </div>

                            {section.subSections && section.subSections.length > 0 && (
                              <div className="space-y-4 pl-6 border-l-2 border-indigo-100 dark:border-indigo-900">
                                {(section.subSections as { title: string; bullets: string[] }[]).map((sub, ssIdx) => (
                                  <div key={ssIdx} className="space-y-2">
                                    <h5 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                      {sub.title}
                                    </h5>
                                    <div className="space-y-1.5">
                                      {(sub.bullets || []).map((b: string, bIdx: number) => (
                                        <div key={bIdx} className="flex gap-3 pl-4">
                                          <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700 flex-shrink-0 mt-2" />
                                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{b}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* ── Mind Map ──────────────────────────────────────────────── */}
          <div className={activeTab === 'mindmap' ? 'block' : 'hidden mb-12 break-inside-avoid'}>
            <MindMapViewer title={docTitle} data={summary.content?.mindMapData} />
          </div>

          {/* ── Infographic ───────────────────────────────────────────── */}
          <div className={activeTab === 'infographic' ? 'block' : 'hidden mb-12 break-inside-avoid'}>
            <InfographicViewer title={docTitle} data={summary.content?.infographicData} />
          </div>

          {/* ── Flashcards ────────────────────────────────────────────── */}
          <div className={activeTab === 'flashcards' ? 'block' : 'hidden mb-12 break-inside-avoid'}>
            <FlashcardsViewer title={docTitle} data={summary.content?.flashcards} />
          </div>

          {/* ── Comparative Table ─────────────────────────────────────── */}
          <div className={activeTab === 'table' ? 'block' : 'hidden mb-12 break-inside-avoid'}>
            <ComparativeTableViewer title={docTitle} data={summary.content?.comparativeTable} />
          </div>
        </div>
      </main>
    </div>
  );
}