import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import {
  ArrowLeft,
  Download,
  Share2,
  RefreshCw,
  FileText,
  ImageIcon,
  Moon,
  Sun,
  Table,
  SquareStack,
  Network,
  List,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { toast } from 'sonner';
import MindMapViewer from './MindMapViewer';
import InfographicViewer from './InfographicViewer';
import FlashcardsViewer from './FlashcardsViewer';
import ComparativeTableViewer from './ComparativeTableViewer';
import * as htmlToImage from 'html-to-image';
import { Skeleton } from './ui/skeleton';
import { useTranslation, type ModuleType } from '../hooks/useTranslation';
import TranslationControls from './TranslationControls';
import TranslateAllPanel from './TranslateAllPanel';
import { QuizSection } from './QuizSection';
import { DocumentChatDrawer } from './DocumentChatDrawer';

interface SummaryViewerProps {
  fileName: string;
  summaryId: string | null;
  onBack: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

type TabId = 'text' | 'mindmap' | 'infographic' | 'flashcards' | 'table' | 'outline';

import MathText from './MathText';

function HighlightedText({ text }: { text: string }) {
  if (!text) return null;
  if (text.includes('$') || text.includes('\\') || /[\^\_\{\}]/.test(text)) {
    return <MathText content={text} inline />;
  }

  const words = text.split(/(\s+)/);
  return (
    <>
      {words.map((word, i) => {
        const clean = word.replace(/^[^\w\u0900-\u0D7F]+|[^\w\u0900-\u0D7F]+$/g, '');
        
        // Highlight English shortforms (AI, CPU, RAM, API, etc.), numbers, percents, or capitalized/tech terms
        const isImportant =
          /^[A-Z0-9_\-]{2,8}$/.test(clean) ||
          /^\d+(\.\d+)?%?$/.test(clean) ||
          /^[A-Z][a-zA-Z0-9\-]{2,}$/.test(clean) ||
          /^[a-zA-Z]+-[a-zA-Z]+$/.test(clean) ||
          (/^[\u0900-\u0D7F]{4,}$/.test(clean) && (i % 6 === 0)); // Highlight key terms in Indic text

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
  const [activeInfographicMode, setActiveInfographicMode] = useState<'hub' | 'flow' | 'circular' | 'flowchart'>('hub');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  // ── Translation Hook ─────────────────────────────────────────────────────
  const {
    activeLanguages,
    showTranslated,
    translationStates,
    translationErrors,
    isTranslatingAll,
    serviceAvailable,
    translateModule: doTranslateModule,
    translateAll,
    toggleOriginal,
    resetAllToOriginal,
    setModuleLanguage,
    getDisplayContent,
    hasTranslation,
  } = useTranslation(summaryId);

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

  // HOOKS MUST BE AT THE TOP - Moving all processing here
  const docTitle = summary?.fileName?.replace('.pdf', '').replace(/\.pdf$/i, '') || 'Document';
  const textContent = summary?.content?.text;

  const keyPoints: string[] = useMemo(() => {
    if (!summary) return [];
    return (
      Array.isArray(textContent)
        ? textContent
        : (typeof textContent === 'string'
          ? textContent.split('\n')
          : ['Summary content not available.'])
    ).map((l: string) => l.replace(/^([^\w\s]+|\d+[\.\)]\s*)+\s*/, '').trim()).filter((l: string) => l.length > 5);
  }, [summary, textContent]);

  const documentOutline: {
    heading: string;
    level: number;
    bullets: string[];
    subSections: { title: string; bullets: string[] }[];
  }[] = useMemo(() => {
    if (!summary) return [];
    return summary.content?.documentOutline && summary.content.documentOutline.length > 0
      ? summary.content.documentOutline
      : keyPoints.slice(0, 6).map((pt: string, i: number) => ({
        heading: `Section ${i + 1}`,
        level: 1,
        bullets: [pt],
        subSections: [],
      }));
  }, [summary, keyPoints]);

  // NEW: Robust Mind Map data handling with fallback to document outline
  const rawMindMap = summary?.content?.mindMapData;
  const finalMindMapData = useMemo(() => {
    if (!summary) return null;

    const hasContent = (d: any) => {
      if (!d) return false;
      const getNodes = (obj: any) => {
        if (!obj) return [];
        if (Array.isArray(obj)) return obj;
        return obj.nodes || obj.children || [];
      };

      const rootNodes = getNodes(d);
      if (rootNodes.length === 0) return false;
      if (Array.isArray(d) && d.length > 0 && typeof d[0] === 'object') {
        const firstMapNodes = getNodes(d[0]);
        if (firstMapNodes.length === 0) return false;
      }
      return true;
    };

    if (hasContent(rawMindMap)) {
      if (Array.isArray(rawMindMap) && rawMindMap.length > 0) {
        const first = rawMindMap[0];
        const isFlatList = !first.nodes && !first.children && (first.name || first.label || first.heading);
        if (isFlatList) return { title: docTitle, nodes: rawMindMap };
      }
      return rawMindMap;
    }

    if (documentOutline && documentOutline.length > 0) {
      return {
        title: docTitle,
        nodes: documentOutline.map(s => ({
          name: s.heading,
          children: (s.bullets || []).map(b => ({ name: b }))
        }))
      };
    }
    return rawMindMap;
  }, [summary, rawMindMap, documentOutline, docTitle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5 animate-in fade-in duration-500">
              <img 
                id="app-logo-target"
                src="/icons/logo-transparent-192.png" 
                alt="OmniStudy Logo" 
                className="w-6 h-6 sm:w-8 sm:h-8" 
              />
              <span 
                id="app-title-target"
                className="brand-logo text-[20px] sm:text-[28px]"
              >
                OmniStudy <span className="brand-logo-ai">AI</span>
              </span>
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <main className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-8 space-y-8 animate-in fade-in duration-700 [animation-delay:300ms]">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
              <div className="flex-1" />
              <div className="hidden sm:flex items-center gap-2">
                 <Skeleton className="h-9 w-24 rounded-lg" />
                 <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pb-4 overflow-hidden border-b border-gray-200 dark:border-gray-700">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-10 w-32 rounded-xl flex-shrink-0" />
            ))}
          </div>
          <div className="space-y-6">
            <Skeleton className="h-[600px] w-full rounded-3xl" />
          </div>
        </main>
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

  const captureElement = async (id: string, ratio = 2) => {
    const el = document.getElementById(id);
    if (!el) return null;

    // Temporarily ensure it's visible for capture if it's hidden
    const originalStyle = el.style.display;
    el.style.display = 'block';

    try {
      const dataUrl = await htmlToImage.toPng(el, {
        quality: 1.0,
        pixelRatio: ratio,
        backgroundColor: '#0f172a',
        style: { overflow: 'visible', imageRendering: '-webkit-optimize-contrast' }
      });
      el.style.display = originalStyle;
      return dataUrl;
    } catch (e) {
      console.error(`Failed to capture ${id}`, e);
      el.style.display = originalStyle;
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info('Synthesizing comprehensive report...', { duration: 6000 });
      const highlightTextForPDF = (text: string) => {
        if (!text) return '';
        // If text contains non-ASCII characters (e.g. Telugu, Hindi, Tamil), preserve it directly
        // without regex splitting that could break Unicode combining marks (matras / halant)
        if (/[^\u0000-\u007F]/.test(text)) {
          return `<span>${text}</span>`;
        }
        return text.split(/(\s+)/).map(word => {
          const clean = word.replace(/[^a-zA-Z0-9\-]/g, '');
          const isImportant = /^[A-Z][a-zA-Z]{2,}$/.test(clean) || /^\d+(\.\d+)?%?$/.test(clean) || /^[A-Z]{2,}$/.test(clean) || /^[a-zA-Z]+-[a-zA-Z]+$/.test(clean);
          return isImportant ? `<strong style="color: #60a5fa; font-weight: 700;">${word}</strong>` : `<span>${word}</span>`;
        }).join('');
      };

      const getNormalizedFlashcards = (raw: any): { question: string; answer: string }[] => {
        let list = raw;
        if (list && !Array.isArray(list)) {
          if (Array.isArray(list.flashcards)) list = list.flashcards;
          else if (Array.isArray(list.cards)) list = list.cards;
          else if (Array.isArray(list.data)) list = list.data;
          else list = [list];
        }
        if (!Array.isArray(list) || list.length === 0) {
          if (documentOutline && documentOutline.length > 0) {
            return documentOutline.slice(0, 10).map((sec, i) => ({
              question: `What is the core focus of "${sec.heading}"?`,
              answer: sec.bullets?.[0] || `Essential principles and methodologies for ${sec.heading}.`
            }));
          }
          if (keyPoints && keyPoints.length > 0) {
            return keyPoints.slice(0, 8).map((pt, i) => ({
              question: `Key Takeaway ${i + 1}`,
              answer: pt
            }));
          }
          return [{ question: 'Document Overview', answer: 'Comprehensive synthesis generated by OmniStudy AI.' }];
        }

        return list.map((item: any, idx: number) => {
          if (typeof item === 'string') {
            return { question: `Concept ${idx + 1}`, answer: item };
          }
          const q = item.question || item.q || item.front || item.prompt || item.title || `Concept ${idx + 1}`;
          const a = item.answer || item.a || item.back || item.response || item.definition || item.description || 'Details specified in document.';
          return { question: String(q), answer: String(a) };
        });
      };

      const getNormalizedComparativeTables = (raw: any): { title: string; headers: string[]; rows: string[][] }[] => {
        let rawList = raw;
        if (rawList && !Array.isArray(rawList)) {
          if (Array.isArray(rawList.tables)) rawList = rawList.tables;
          else if (Array.isArray(rawList.comparativeTable)) rawList = rawList.comparativeTable;
          else rawList = [rawList];
        }
        if (!Array.isArray(rawList) || rawList.length === 0) {
          if (documentOutline && documentOutline.length > 0) {
            return [{
              title: `${docTitle} - Structural Breakdown`,
              headers: ['Section / Topic', 'Core Analysis & Points'],
              rows: documentOutline.slice(0, 10).map((sec, i) => [
                sec.heading || `Section ${i + 1}`,
                (sec.bullets || []).slice(0, 3).join(' • ') || 'Key concepts analyzed.'
              ])
            }];
          }
          if (keyPoints && keyPoints.length > 0) {
            return [{
              title: `${docTitle} - Key Insights Table`,
              headers: ['#', 'Key Insight'],
              rows: keyPoints.slice(0, 8).map((pt, i) => [String(i + 1), pt])
            }];
          }
          return [{
            title: 'Comparative Analysis',
            headers: ['Feature', 'Details'],
            rows: [['Document Synthesis', 'All analyzed sections from OmniStudy AI.']]
          }];
        }

        if (rawList[0] && ('concept' in rawList[0] || 'keyFeatures' in rawList[0])) {
          return [{
            title: 'Core Concepts Comparison',
            headers: ['Concept / Section', 'Key Features', 'Examples', 'Differences / Role'],
            rows: rawList.map((r: any) => [
              String(r.concept || r.title || r.name || ''),
              String(r.keyFeatures || r.features || r.description || ''),
              String(r.examples || r.example || ''),
              String(r.differences || r.role || r.details || '')
            ])
          }];
        }

        if (rawList[0] && ('headers' in rawList[0] || 'rows' in rawList[0])) {
          return rawList.map((t: any, idx: number) => ({
            title: t.title || `Comparison Table ${idx + 1}`,
            headers: Array.isArray(t.headers) ? t.headers.map(String) : [],
            rows: Array.isArray(t.rows) ? t.rows.map((row: any) => Array.isArray(row) ? row.map(String) : Object.values(row).map(String)) : []
          }));
        }

        if (rawList[0] && typeof rawList[0] === 'object') {
          const headers = Object.keys(rawList[0]);
          return [{
            title: 'Comparative Analysis',
            headers: headers,
            rows: rawList.map((item: any) => headers.map(h => String(item[h] ?? '')))
          }];
        }

        return [{
          title: 'Comparative Analysis',
          headers: ['Parameter', 'Summary Value'],
          rows: [['Synthesis', 'Generated by OmniStudy AI']]
        }];
      };

      const translatedModule = (Object.keys(showTranslated) as ModuleType[]).find(
        (m) => showTranslated[m] && activeLanguages[m] && activeLanguages[m] !== 'en'
      );
      const fullLang = translatedModule ? activeLanguages[translatedModule] : (showTranslated.text && activeLanguages.text !== 'en' ? activeLanguages.text : '');
      const langSuffix = fullLang ? `_${fullLang.toUpperCase()}` : '';
      const docHeaderTitle = docTitle + (fullLang ? ` (${fullLang.toUpperCase()})` : '');

      const tempContainer = document.createElement('div');
      tempContainer.id = 'temp-pdf-export-container';
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '0';
      tempContainer.style.top = '0';
      tempContainer.style.width = '1450px';
      tempContainer.style.zIndex = '-9999';
      tempContainer.style.opacity = '1';
      tempContainer.style.visibility = 'visible';
      tempContainer.style.overflow = 'visible';
      tempContainer.style.pointerEvents = 'none';
      document.body.appendChild(tempContainer);

      // @ts-ignore
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let pageCount = 0;

      const addPdfPage = (orientation: 'portrait' | 'landscape' = 'portrait') => {
        if (pageCount > 0) {
          pdf.addPage('a4', orientation);
        }
        pageCount++;
      };

      const drawPageBackgroundAndHeader = (
        sectionLabel: string,
        pageSubtitle: string = docHeaderTitle,
        orientation: 'portrait' | 'landscape' = 'portrait'
      ) => {
        const pageW = orientation === 'landscape' ? 297 : 210;
        const pageH = orientation === 'landscape' ? 210 : 297;

        pdf.setFillColor(3, 7, 18);
        pdf.rect(0, 0, pageW, pageH, 'F');

        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('OMNISTUDY AI', pageW / 2, 13, { align: 'center' });

        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(8.5);
        pdf.setFont('helvetica', 'bold');

        // Sanitize for jsPDF vector font (ASCII only, strictly bounded to prevent crossing page margins)
        const safeSubtitle = (pageSubtitle || '')
          .replace(/[^\x20-\x7E]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        const maxSubLen = orientation === 'landscape' ? 65 : 42;
        const boundedSub = safeSubtitle.length > maxSubLen ? safeSubtitle.slice(0, maxSubLen - 3) + '...' : safeSubtitle;

        const headerText = boundedSub
          ? `${sectionLabel.toUpperCase()} • ${boundedSub.toUpperCase()}`
          : sectionLabel.toUpperCase();
        pdf.text(headerText, pageW / 2, 19, { align: 'center' });

        pdf.setDrawColor(30, 41, 59);
        pdf.setLineWidth(0.4);
        pdf.line(12, 23, pageW - 12, 23);
      };

      const addImageFitToPage = async (
        imgData: string,
        boxX = 10,
        boxY = 28,
        boxW = 190,
        boxH = 252
      ) => {
        const img = new Image();
        img.src = imgData;
        await new Promise((res) => {
          if (img.complete) res(null);
          else { img.onload = () => res(null); img.onerror = () => res(null); }
        });

        const ratio = (img.width || 1400) / (img.height || 1000);
        let drawW = boxW;
        let drawH = drawW / ratio;
        if (drawH > boxH) {
          drawH = boxH;
          drawW = drawH * ratio;
        }
        const drawX = boxX + (boxW - drawW) / 2;
        const drawY = boxY + (boxH - drawH) / 2;

        pdf.addImage(imgData, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');
      };

      const chunk = <T,>(arr: T[], size: number): T[][] => {
        const res: T[][] = [];
        for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
        return res;
      };

      // Helper to capture exact "like before" HTML pages
      const captureClassicHtmlPage = async (innerHtml: string): Promise<string> => {
        const el = document.createElement('div');
        el.style.width = '794px'; // 210mm at 96 DPI
        el.style.minHeight = '1122px'; // 297mm at 96 DPI
        el.style.boxSizing = 'border-box';
        el.style.padding = '24px 28px';
        el.style.backgroundColor = '#030712';
        el.style.color = '#f8fafc';
        (el.style as any).webkitFontSmoothing = 'antialiased';
        (el.style as any).mozOsxFontSmoothing = 'grayscale';
        el.style.textRendering = 'optimizeLegibility';
        el.style.fontFamily = "'Inter', 'Noto Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Nirmala UI', sans-serif";
        el.innerHTML = innerHtml;

        tempContainer.appendChild(el);
        await new Promise(r => setTimeout(r, 60));

        const dataUrl = await htmlToImage.toPng(el, {
          quality: 1.0,
          pixelRatio: 2.5, // Crisp HD rendering
          backgroundColor: '#030712',
          style: {
            transform: 'scale(1)',
            opacity: '1',
            overflow: 'visible',
            imageRendering: '-webkit-optimize-contrast'
          }
        });
        tempContainer.removeChild(el);
        return dataUrl;
      };

      // ── 1. MODULE: KEY POINTS (LIKE BEFORE: EXACT STYLING & HEADERS) ─────
      const currentPoints = (getDisplayContent('text', keyPoints) as string[]) || keyPoints;
      if (currentPoints.length > 0) {
        const pointChunks = chunk(currentPoints, 7);
        for (let cIdx = 0; cIdx < pointChunks.length; cIdx++) {
          const ptGroup = pointChunks[cIdx];
          const globalOffset = cIdx * 7;
          const html = `
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">
              <h1 style="color:#3b82f6; margin:0; font-size: 28px; font-weight: 900;">OMNISTUDY AI</h1>
              <p style="color:#94a3b8; margin:5px 0 0 0; text-transform:uppercase; font-size:12px;">Key Insights Report | ${docTitle}${fullLang ? ` (${fullLang.toUpperCase()})` : ''}${pointChunks.length > 1 ? ` (Part ${cIdx + 1})` : ''}</p>
            </div>
            ${ptGroup.map((p, i) => `
              <div style="background:rgba(30, 58, 138, 0.2); border:1px solid rgba(30, 58, 138, 0.3); padding:16px 20px; border-radius:14px; margin-bottom:12px; display:flex; gap:16px; align-items:center; width:100%; box-sizing:border-box;">
                <div style="width:30px; height:30px; background:#3b82f6; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13px; flex-shrink:0; box-shadow:0 0 15px rgba(59, 130, 246, 0.3);">${globalOffset + i + 1}</div>
                <p style="margin:0; font-size:14px; color:#f1f5f9; line-height:1.6; font-weight:500; word-break:break-word; flex:1;">${highlightTextForPDF(p)}</p>
              </div>
            `).join('')}
          `;
          const pageImg = await captureClassicHtmlPage(html);
          addPdfPage('portrait');
          pdf.addImage(pageImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        }
      }

      // ── 2. MODULE: DOCUMENT OUTLINE (LIKE BEFORE: EXACT STYLING & HEADERS) ─
      const currentOutline = (getDisplayContent('documentOutline', documentOutline) as typeof documentOutline) || documentOutline;
      if (currentOutline.length > 0) {
        const outlineChunks = chunk(currentOutline, 2);
        for (let cIdx = 0; cIdx < outlineChunks.length; cIdx++) {
          const secGroup = outlineChunks[cIdx];
          const globalOffset = cIdx * 2;
          const html = `
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">
              <h1 style="color:#3b82f6; margin:0; font-size: 28px; font-weight: 900;">OMNISTUDY AI</h1>
              <p style="color:#94a3b8; margin:5px 0 0 0; text-transform:uppercase; font-size:12px;">Document Outline Report | ${docTitle}${fullLang ? ` (${fullLang.toUpperCase()})` : ''}${outlineChunks.length > 1 ? ` (Part ${cIdx + 1})` : ''}</p>
            </div>
            ${secGroup.map((s, i) => `
              <div style="margin-bottom:20px; border:1px solid #1e293b; border-radius:14px; background:#020617; overflow:hidden; width:100%; box-sizing:border-box;">
                <div style="background:linear-gradient(to right, #1e1b4b, #1e3a8a); padding:14px 18px; border-bottom:1px solid #1e293b; display:flex; align-items:center; gap:14px;">
                  <div style="width:28px; height:28px; background:#6366f1; color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13px; box-shadow:0 4px 12px rgba(99, 102, 241, 0.3); flex-shrink:0;">${globalOffset + i + 1}</div>
                  <h4 style="margin:0; font-weight:700; color:#f8fafc; font-size:15px; word-break:break-word;">${s.heading}</h4>
                </div>
                <div style="padding:16px 18px; background:#000;">
                  ${s.bullets.map(b => `<div style="display:flex; gap:12px; margin-bottom:10px;"><div style="width:6px; height:6px; background:#818cf8; border-radius:50%; margin-top:6px; flex-shrink:0;"></div><p style="margin:0; color:#cbd5e1; font-size:13px; line-height:1.5; word-break:break-word; flex:1;">${b}</p></div>`).join('')}
                  ${(s.subSections || []).map(sub => `
                    <div style="margin-left:16px; border-left:2px solid #312e81; padding:5px 0 5px 12px; margin-top:12px; background:rgba(99, 102, 241, 0.05); border-radius:0 8px 8px 0;">
                      <h5 style="margin:0 0 6px 0; font-size:11px; font-weight:900; color:#818cf8; text-transform:uppercase; letter-spacing:0.05em; word-break:break-word;">${sub.title}</h5>
                      <div style="display:flex; flex-direction:column; gap:6px;">
                        ${sub.bullets.map(sb => `<p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.4; word-break:break-word;">— ${sb}</p>`).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          `;
          const pageImg = await captureClassicHtmlPage(html);
          addPdfPage('portrait');
          pdf.addImage(pageImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        }
      }

      // ── 3. MODULE: INFOGRAPHICS (NEW TECHNOLOGY WITH FULL CLARITY) ───────
      const infoWrapper = document.getElementById('export-infographic-all');
      if (infoWrapper) {
        const origDisplay = infoWrapper.style.display;
        const origPos = infoWrapper.style.position;
        const origLeft = infoWrapper.style.left;
        const origTop = infoWrapper.style.top;
        const origZIndex = infoWrapper.style.zIndex;
        const origOpacity = infoWrapper.style.opacity;
        const origVisibility = infoWrapper.style.visibility;

        infoWrapper.style.display = 'block';
        infoWrapper.style.position = 'fixed';
        infoWrapper.style.left = '0';
        infoWrapper.style.top = '0';
        infoWrapper.style.zIndex = '-9999';
        infoWrapper.style.opacity = '1';
        infoWrapper.style.visibility = 'visible';
        infoWrapper.classList.remove('hidden');

        await new Promise(r => setTimeout(r, 1000));

        const infoItems = Array.from(infoWrapper.querySelectorAll('[data-pdf-export-target="true"]')).filter((el) => {
          const htmlEl = el as HTMLElement;
          return !!htmlEl.querySelector('svg') || htmlEl.offsetHeight > 50;
        });

        for (let i = 0; i < infoItems.length; i++) {
          const target = infoItems[i] as HTMLElement;
          const label = target.getAttribute('data-infographic-label') || 'Infographic';

          const imgData = await htmlToImage.toPng(target, {
            quality: 1.0,
            pixelRatio: 3.2, // NEW TECHNOLOGY: 3.2x Ultra-HD direct lossless PNG
            backgroundColor: '#030712',
            style: {
              transform: 'scale(1)',
              opacity: '1',
              animation: 'none !important',
              transition: 'none !important',
              imageRendering: '-webkit-optimize-contrast'
            }
          });

          if (!imgData) continue;
          addPdfPage('portrait');
          drawPageBackgroundAndHeader(`Visual Architecture • ${label}`);
          await addImageFitToPage(imgData, 10, 28, 190, 252);
        }

        infoWrapper.style.display = origDisplay;
        infoWrapper.style.position = origPos;
        infoWrapper.style.left = origLeft;
        infoWrapper.style.top = origTop;
        infoWrapper.style.zIndex = origZIndex;
        infoWrapper.style.opacity = origOpacity;
        infoWrapper.style.visibility = origVisibility;
        if (origDisplay === 'none' || origDisplay === '') infoWrapper.classList.add('hidden');
      }

      // ── 4. MODULE: MIND MAPS (NEW TECHNOLOGY WITH FULL CLARITY) ───────────
      const mmWrapper = document.getElementById('export-mindmap-fallback');
      if (mmWrapper) {
        const origDisplay = mmWrapper.style.display;
        const origPos = mmWrapper.style.position;
        const origLeft = mmWrapper.style.left;
        const origTop = mmWrapper.style.top;
        const origZIndex = mmWrapper.style.zIndex;
        const origOpacity = mmWrapper.style.opacity;
        const origVisibility = mmWrapper.style.visibility;

        mmWrapper.style.display = 'block';
        mmWrapper.style.position = 'fixed';
        mmWrapper.style.left = '0';
        mmWrapper.style.top = '0';
        mmWrapper.style.zIndex = '-9999';
        mmWrapper.style.opacity = '1';
        mmWrapper.style.visibility = 'visible';
        mmWrapper.classList.remove('hidden');

        await new Promise(r => setTimeout(r, 1000));

        const mmItems = Array.from(mmWrapper.querySelectorAll('[data-pdf-export-target="true"]')).filter((el) => {
          const htmlEl = el as HTMLElement;
          return !!htmlEl.querySelector('svg') || htmlEl.offsetHeight > 50;
        });

        for (let i = 0; i < mmItems.length; i++) {
          const target = mmItems[i] as HTMLElement;
          const label = target.getAttribute('data-infographic-label') || 'Mind Map';

          const imgData = await htmlToImage.toPng(target, {
            quality: 1.0,
            pixelRatio: 3.2, // NEW TECHNOLOGY: 3.2x Ultra-HD direct lossless PNG
            backgroundColor: '#030712',
            style: {
              transform: 'scale(1)',
              opacity: '1',
              animation: 'none !important',
              transition: 'none !important',
              imageRendering: '-webkit-optimize-contrast'
            }
          });

          if (!imgData) continue;
          addPdfPage('portrait');
          drawPageBackgroundAndHeader(`Mind Map • Module ${i + 1}`);
          await addImageFitToPage(imgData, 10, 28, 190, 252);
        }

        mmWrapper.style.display = origDisplay;
        mmWrapper.style.position = origPos;
        mmWrapper.style.left = origLeft;
        mmWrapper.style.top = origTop;
        mmWrapper.style.zIndex = origZIndex;
        mmWrapper.style.opacity = origOpacity;
        mmWrapper.style.visibility = origVisibility;
        if (origDisplay === 'none' || origDisplay === '') mmWrapper.classList.add('hidden');
      }

      // ── 5. MODULE: FLASHCARDS (LIKE BEFORE: EXACT STYLING & HEADERS) ──────
      const rawFlashcards = getDisplayContent('flashcards', summary?.content?.flashcards);
      const cards = getNormalizedFlashcards(rawFlashcards);
      if (cards.length > 0) {
        const cardChunks = chunk(cards, 5);
        for (let cIdx = 0; cIdx < cardChunks.length; cIdx++) {
          const cardGroup = cardChunks[cIdx];
          const html = `
            <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">
              <h1 style="color:#3b82f6; margin:0; font-size: 28px; font-weight: 900;">OMNISTUDY AI</h1>
              <p style="color:#94a3b8; margin:5px 0 0 0; text-transform:uppercase; font-size:12px;">Flashcards Report | ${docTitle}${fullLang ? ` (${fullLang.toUpperCase()})` : ''}${cardChunks.length > 1 ? ` (Part ${cIdx + 1})` : ''}</p>
            </div>
            ${cardGroup.map((f) => `
              <div style="border-left:6px solid #ec4899; background:#020617; border: 1px solid #1e293b; padding:16px 18px; margin-bottom:12px; border-radius:10px; width:100%; box-sizing:border-box; word-break:break-word;">
                <p style="font-weight:bold; margin:0 0 8px 0; color:#fdf2f8; font-size:14px; word-break:break-word;">Q: ${highlightTextForPDF(f.question)}</p>
                <p style="color:#fbcfe8; margin:0; font-size:13px; line-height:1.5; word-break:break-word;">A: ${highlightTextForPDF(f.answer)}</p>
              </div>
            `).join('')}
          `;
          const pageImg = await captureClassicHtmlPage(html);
          addPdfPage('portrait');
          pdf.addImage(pageImg, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
        }
      }

      // ── 6. MODULE: COMPARATIVE TABLE (NEW TECHNOLOGY: 2 TABLES PER PAGE, FULL CLARITY) ───
      const rawTables = getDisplayContent('comparativeTable', summary?.content?.comparativeTable);
      const tables = getNormalizedComparativeTables(rawTables);

      // Structure tables into compact units of up to 5 rows so 2 tables fit comfortably per page
      interface TableSubBlock {
        title: string;
        subtitle?: string;
        headers: string[];
        rows: string[][];
        globalRowOffset: number;
      }
      const tableSubBlocks: TableSubBlock[] = [];
      for (const table of tables) {
        if (!table.rows || table.rows.length === 0) continue;
        const rowChunks = chunk(table.rows, 5);
        for (let rIdx = 0; rIdx < rowChunks.length; rIdx++) {
          tableSubBlocks.push({
            title: table.title,
            subtitle: rowChunks.length > 1 ? `(Part ${rIdx + 1} of ${rowChunks.length})` : undefined,
            headers: table.headers,
            rows: rowChunks[rIdx],
            globalRowOffset: rIdx * 5
          });
        }
      }

      // Group into 2 tables per page
      const pagePairs = chunk(tableSubBlocks, 2);
      for (let pIdx = 0; pIdx < pagePairs.length; pIdx++) {
        const pair = pagePairs[pIdx];
        const pageEl = document.createElement('div');
        pageEl.style.width = '1400px';
        pageEl.style.minHeight = pair.length === 2 ? '1840px' : '960px';
        pageEl.style.boxSizing = 'border-box';
        pageEl.style.padding = '12px 24px';
        pageEl.style.backgroundColor = '#020617';
        pageEl.style.color = '#f8fafc';
        pageEl.style.display = 'flex';
        pageEl.style.flexDirection = 'column';
        pageEl.style.justifyContent = 'space-between';
        (pageEl.style as any).webkitFontSmoothing = 'antialiased';
        pageEl.style.fontFamily = "'Inter', 'Noto Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Nirmala UI', sans-serif";

        pageEl.innerHTML = pair.map((tbl, tblIdx) => `
          <div style="flex: 1; display: flex; flex-direction: column; border: 1px solid #1e293b; border-radius: 18px; background: #020617; overflow: hidden; width: 100%; box-sizing: border-box; ${tblIdx > 0 ? 'margin-top: 36px;' : ''}; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
            <div style="background: linear-gradient(to right, #1e1b4b, #1e3a8a); padding: 18px 24px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box; flex-shrink: 0;">
              <h4 style="margin: 0; font-weight: 700; color: #f8fafc; font-size: 19px; word-break: break-word; overflow-wrap: anywhere;">
                ${tbl.title} ${tbl.subtitle ? `<span style="color: #93c5fd; font-weight: 400; font-size: 15px; margin-left: 10px;">${tbl.subtitle}</span>` : ''}
              </h4>
              <span style="font-size: 12px; font-weight: 700; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(59, 130, 246, 0.2); padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.4); flex-shrink: 0;">
                Table ${pair.length > 1 ? `${tblIdx + 1}/2` : '1/1'}
              </span>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; padding: 0; background: #000; width: 100%; box-sizing: border-box; overflow: hidden;">
              <table style="width: 100%; height: 100%; border-collapse: collapse; color: #cbd5e1; font-size: 14.5px; table-layout: fixed; box-sizing: border-box;">
                <thead>
                  <tr style="background: #0f172a; border-bottom: 1px solid #1e293b;">
                    <th style="padding: 14px 10px; border: 1px solid #1e293b; color: #94a3b8; text-align: center; width: 48px; box-sizing: border-box; font-size: 13px;">#</th>
                    ${tbl.headers.map(h => `<th style="padding: 14px 16px; border: 1px solid #1e293b; color: #60a5fa; text-align: left; font-weight: 700; word-break: break-word; overflow-wrap: anywhere; box-sizing: border-box; font-size: 14px;">${h.toUpperCase()}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${tbl.rows.map((row, rowI) => `
                    <tr style="background: ${rowI % 2 === 0 ? 'rgba(15, 23, 42, 0.5)' : '#020617'};">
                      <td style="padding: 16px 10px; border: 1px solid #1e293b; text-align: center; color: #64748b; font-family: monospace; font-weight: bold; box-sizing: border-box; vertical-align: middle;">${tbl.globalRowOffset + rowI + 1}</td>
                      ${row.map((cell, cellI) => `
                        <td style="padding: 16px 16px; border: 1px solid #1e293b; vertical-align: middle; line-height: 1.6; word-break: break-word; overflow-wrap: anywhere; white-space: normal; box-sizing: border-box; ${cellI === 0 ? 'color: #60a5fa; font-weight: 700;' : ''}">
                          ${highlightTextForPDF(cell)}
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('');

        tempContainer.appendChild(pageEl);
        await new Promise(r => setTimeout(r, 60));

        const pageImg = await htmlToImage.toPng(pageEl, {
          quality: 1.0,
          pixelRatio: 3.2, // NEW TECHNOLOGY: 3.2x Ultra-HD direct lossless PNG
          backgroundColor: '#020617',
          style: {
            transform: 'scale(1)',
            opacity: '1',
            overflow: 'visible',
            imageRendering: '-webkit-optimize-contrast'
          }
        });
        tempContainer.removeChild(pageEl);

        addPdfPage('portrait');
        drawPageBackgroundAndHeader('Comparative Analysis', `Part ${pIdx + 1} of ${pagePairs.length}`);

        const boxX = 12;
        const boxY = 27;
        const boxW = 186;
        const maxH = 254;

        const img = new Image();
        img.src = pageImg;
        await new Promise((res) => {
          if (img.complete) res(null);
          else { img.onload = () => res(null); img.onerror = () => res(null); }
        });

        const ratio = (img.width || 1400) / (img.height || 1850);
        let drawW = boxW;
        let drawH = drawW / ratio;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * ratio;
        }
        const drawX = boxX + (boxW - drawW) / 2;
        const drawY = boxY;

        pdf.addImage(pageImg, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');
      }

      pdf.save(`${docTitle}_Full_Report${langSuffix}.pdf`);
      toast.success('Ultra-HD comprehensive report downloaded!');
    } catch (err: any) {
      console.error('Full PDF Export failed:', err);
      toast.error('Full export failed');
    } finally {
      if (tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }
  };

  const handleDownloadModulePDF = async () => {
    try {
      toast.info(`Exporting ${activeTab}...`);
      
      const highlightTextForPDF = (text: string) => {
        if (!text) return '';
        // If text contains non-ASCII characters (e.g. Telugu, Hindi, Tamil), preserve it directly
        // without regex splitting that could break Unicode combining marks (matras / halant)
        if (/[^\u0000-\u007F]/.test(text)) {
          return `<span>${text}</span>`;
        }
        return text.split(/(\s+)/).map(word => {
          const clean = word.replace(/[^a-zA-Z0-9\-]/g, '');
          const isImportant = /^[A-Z][a-zA-Z]{2,}$/.test(clean) || /^\d+(\.\d+)?%?$/.test(clean) || /^[A-Z]{2,}$/.test(clean) || /^[a-zA-Z]+-[a-zA-Z]+$/.test(clean);
          return isImportant ? `<strong style="color: #60a5fa; font-weight: 700;">${word}</strong>` : `<span>${word}</span>`;
        }).join('');
      };

      const activeModuleType: ModuleType = activeTab === 'outline'
        ? 'documentOutline'
        : activeTab === 'mindmap'
        ? 'mindMapData'
        : activeTab === 'infographic'
        ? 'infographicData'
        : activeTab === 'table'
        ? 'comparativeTable'
        : 'text';

      const modLang = activeLanguages[activeModuleType];
      const isModTranslated = showTranslated[activeModuleType] && modLang && modLang !== 'en';
      const modSuffix = isModTranslated ? `_${modLang.toUpperCase()}` : '';

      // SPECIAL HANDLING: Infographics download as high-res PDF
      if (activeTab === 'infographic') {
        const wrapper = document.getElementById('export-infographic-all');
        if (!wrapper) return;
        const subItems = wrapper.querySelectorAll('[data-pdf-export-target="true"]');
        
        const origDisplay = wrapper.style.display;
        const origPos = wrapper.style.position;
        const origLeft = wrapper.style.left;
        const origTop = wrapper.style.top;
        const origZIndex = wrapper.style.zIndex;
        const origOpacity = wrapper.style.opacity;
        const origVisibility = wrapper.style.visibility;

        wrapper.style.display = 'block';
        wrapper.style.position = 'fixed';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.zIndex = '-9999';
        wrapper.style.opacity = '1';
        wrapper.style.visibility = 'visible';
        wrapper.classList.remove('hidden');

        await new Promise(r => setTimeout(r, 800));

        for (let i = 0; i < subItems.length; i++) {
          const target = subItems[i] as HTMLElement;
          const label = target.getAttribute('data-infographic-label') || 'Module';
          const modeName = label === 'Hub' ? 'hub' : label === 'Steps' ? 'flow' : label === 'Orbit' ? 'circular' : 'flowchart';
          
          if (modeName !== activeInfographicMode) continue;
          
          const saveName = modeName === 'hub' ? 'KnowledgeHub' : modeName === 'flow' ? 'ProcessSteps' : modeName === 'circular' ? 'ConceptualOrbit' : 'ActionFlow';

          // Capture as High-Res Image FIRST
          const imgData = await htmlToImage.toPng(target, { 
            quality: 1.0, 
            pixelRatio: 3.5, // 3.5x HD resolution
            backgroundColor: theme === 'dark' ? '#030712' : '#ffffff',
            style: { 
              transform: 'scale(1)', 
              opacity: '1', 
              animation: 'none !important', 
              transition: 'none !important',
              imageRendering: '-webkit-optimize-contrast'
            }
          });

          // @ts-ignore
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
          
          // Draw Dark Background
          pdf.setFillColor(3, 7, 18);
          pdf.rect(0, 0, 210, 297, 'F');

          // Draw Header
          pdf.setTextColor(59, 130, 246);
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text('OMNISTUDY AI', 105, 16, { align: 'center' });

          pdf.setTextColor(148, 163, 184);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          const titleText = `${saveName.replace(/([A-Z])/g, ' $1').trim().toUpperCase()} | ${docTitle}${isModTranslated ? ` (${modLang.toUpperCase()})` : ''}`;
          pdf.text(titleText, 105, 22, { align: 'center' });

          pdf.setDrawColor(30, 41, 59);
          pdf.setLineWidth(0.4);
          pdf.line(15, 26, 195, 26);

          // Measure image to fit neatly within printable boundaries
          const img = new Image();
          img.src = imgData;
          await new Promise((res) => {
            if (img.complete) res(null);
            else { img.onload = () => res(null); img.onerror = () => res(null); }
          });

          const boxX = 10;
          const boxY = 30;
          const boxW = 190;
          const boxH = 252;
          const ratio = (img.width || 1400) / (img.height || 1000);

          let drawW = boxW;
          let drawH = drawW / ratio;
          if (drawH > boxH) {
            drawH = boxH;
            drawW = drawH * ratio;
          }
          const drawX = boxX + (boxW - drawW) / 2;
          const drawY = boxY + (boxH - drawH) / 2;

          pdf.addImage(imgData, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');
          pdf.save(`Infographic_${saveName}_${docTitle.replace(/\s+/g, '_')}${modSuffix}.pdf`);
          await new Promise(r => setTimeout(r, 400));
        }
        
        wrapper.style.display = origDisplay;
        wrapper.style.position = origPos;
        wrapper.style.left = origLeft;
        wrapper.style.top = origTop;
        wrapper.style.zIndex = origZIndex;
        wrapper.style.opacity = origOpacity;
        wrapper.style.visibility = origVisibility;
        if (origDisplay === 'none' || origDisplay === '') {
          wrapper.classList.add('hidden');
        }
        toast.success(`Success! ${activeInfographicMode.toUpperCase()} module saved.`);
        return;
      }

      // SPECIAL HANDLING: Mind Map downloads as high-res PDF (Multi-page)
      if (activeTab === 'mindmap') {
        const wrapper = document.getElementById('export-mindmap-fallback');
        if (!wrapper) return;
        const subItems = Array.from(wrapper.querySelectorAll('[data-pdf-export-target="true"]')).filter((el) => {
          const htmlEl = el as HTMLElement;
          return !!htmlEl.querySelector('svg') || htmlEl.offsetHeight > 50 || htmlEl.innerText.trim().length > 0;
        });
        if (subItems.length === 0) return;

        const origDisplay = wrapper.style.display;
        const origPos = wrapper.style.position;
        const origLeft = wrapper.style.left;
        const origTop = wrapper.style.top;
        const origZIndex = wrapper.style.zIndex;
        const origOpacity = wrapper.style.opacity;
        const origVisibility = wrapper.style.visibility;

        wrapper.style.display = 'block';
        wrapper.style.position = 'fixed';
        wrapper.style.left = '0';
        wrapper.style.top = '0';
        wrapper.style.zIndex = '-9999';
        wrapper.style.opacity = '1';
        wrapper.style.visibility = 'visible';
        wrapper.classList.remove('hidden');
        
        await new Promise(r => setTimeout(r, 1000));

        // @ts-ignore
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        let validPageCount = 0;
        for (let i = 0; i < subItems.length; i++) {
          const target = subItems[i] as HTMLElement;
          const label = target.getAttribute('data-infographic-label') || 'Mind Map';

          // Capture as High-Res Image FIRST
          const imgData = await htmlToImage.toPng(target, { 
            quality: 1.0, 
            pixelRatio: 3.0, // 3.0x HD resolution for mindmaps
            backgroundColor: theme === 'dark' ? '#030712' : '#ffffff',
            style: { 
              transform: 'scale(1)', 
              opacity: '1', 
              animation: 'none !important', 
              transition: 'none !important',
              imageRendering: '-webkit-optimize-contrast'
            }
          });

          if (!imgData) continue;
          if (validPageCount > 0) pdf.addPage();
          validPageCount++;

          // 1. Dark Background
          pdf.setFillColor(3, 7, 18);
          pdf.rect(0, 0, 210, 297, 'F');

          // 2. Header
          pdf.setTextColor(59, 130, 246);
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text('OMNISTUDY AI', 105, 16, { align: 'center' });

          pdf.setTextColor(148, 163, 184);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          const pageTitle = `${label.toUpperCase()} | ${docTitle}${isModTranslated ? ` (${modLang.toUpperCase()})` : ''} | MODULE ${i+1}`;
          pdf.text(pageTitle, 105, 22, { align: 'center' });

          pdf.setDrawColor(30, 41, 59);
          pdf.setLineWidth(0.4);
          pdf.line(15, 26, 195, 26);

          // 3. Fit Image
          const img = new Image();
          img.src = imgData;
          await new Promise((res) => {
            if (img.complete) res(null);
            else { img.onload = () => res(null); img.onerror = () => res(null); }
          });

          const boxX = 10;
          const boxY = 30;
          const boxW = 190;
          const boxH = 252;
          const ratio = (img.width || 1400) / (img.height || 1000);

          let drawW = boxW;
          let drawH = drawW / ratio;
          if (drawH > boxH) {
            drawH = boxH;
            drawW = drawH * ratio;
          }
          const drawX = boxX + (boxW - drawW) / 2;
          const drawY = boxY + (boxH - drawH) / 2;

          pdf.addImage(imgData, 'PNG', drawX, drawY, drawW, drawH, undefined, 'FAST');
          await new Promise(r => setTimeout(r, 300));
        }

        pdf.save(`MindMaps_${docTitle.replace(/\s+/g, '_')}${modSuffix}.pdf`);
        wrapper.style.display = origDisplay;
        wrapper.style.position = origPos;
        wrapper.style.left = origLeft;
        wrapper.style.top = origTop;
        wrapper.style.zIndex = origZIndex;
        wrapper.style.opacity = origOpacity;
        wrapper.style.visibility = origVisibility;
        if (origDisplay === 'none' || origDisplay === '') {
          wrapper.classList.add('hidden');
        }
        toast.success(`Success! All mind maps saved as a multi-page PDF.`);
        return;
      }

      // STANDARD HANDLING: Other modules download as PDF
      const element = document.createElement('div');
      element.style.padding = '24px 28px';
      element.style.background = '#030712';
      element.style.color = '#f8fafc';
      element.style.width = activeTab === 'table' ? '297mm' : '210mm';
      element.style.maxWidth = activeTab === 'table' ? '297mm' : '210mm';
      element.style.boxSizing = 'border-box';
      (element.style as any).webkitFontSmoothing = 'antialiased';
      (element.style as any).mozOsxFontSmoothing = 'grayscale';
      element.style.textRendering = 'optimizeLegibility';
      element.style.fontFamily = "'Inter', 'Noto Sans', 'Noto Sans Telugu', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Kannada', 'Noto Sans Malayalam', 'Nirmala UI', sans-serif";

      let html = `
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">
          <h1 style="color:#3b82f6; margin:0; font-size: 28px; font-weight: 900;">OMNISTUDY AI</h1>
          <p style="color:#94a3b8; margin:5px 0 0 0; text-transform:uppercase; font-size:12px;">${activeTab} Report | ${docTitle}${isModTranslated ? ` (${modLang.toUpperCase()})` : ''}</p>
        </div>
      `;

      if (activeTab === 'text') {
        const currentPoints = (getDisplayContent('text', keyPoints) as string[]) || keyPoints;
        html += currentPoints.map((p, i) => `
          <div style="background:rgba(30, 58, 138, 0.2); border:1px solid rgba(30, 58, 138, 0.3); padding:16px 20px; border-radius:14px; margin-bottom:12px; display:flex; gap:16px; align-items:center; page-break-inside:avoid; box-sizing:border-box; width:100%; overflow:hidden;">
            <div style="width:30px; height:30px; background:#3b82f6; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13px; flex-shrink:0; box-shadow:0 0 15px rgba(59, 130, 246, 0.3);">${i+1}</div>
            <p style="margin:0; font-size:14px; color:#f1f5f9; line-height:1.6; font-weight:500; word-break:break-word; overflow-wrap:break-word; flex:1;">${highlightTextForPDF(p)}</p>
          </div>
        `).join('');
      } else if (activeTab === 'outline') {
        const currentOutline = (getDisplayContent('documentOutline', documentOutline) as typeof documentOutline) || documentOutline;
        html += currentOutline.map((s, i) => `
          <div style="margin-bottom:20px; border:1px solid #1e293b; border-radius:14px; background:#020617; overflow:hidden; box-sizing:border-box; width:100%;">
            <div style="background:linear-gradient(to right, #1e1b4b, #1e3a8a); padding:14px 18px; border-bottom:1px solid #1e293b; display:flex; align-items:center; gap:14px; page-break-inside:avoid;">
              <div style="width:28px; height:28px; background:#6366f1; color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13px; box-shadow:0 4px 12px rgba(99, 102, 241, 0.3); flex-shrink:0;">${i+1}</div>
              <h4 style="margin:0; font-weight:700; color:#f8fafc; font-size:15px; word-break:break-word;">${s.heading}</h4>
            </div>
            <div style="padding:16px 18px; background:#000;">
              ${s.bullets.map(b => `<div style="display:flex; gap:12px; margin-bottom:10px; page-break-inside:avoid;"><div style="width:6px; height:6px; background:#818cf8; border-radius:50%; margin-top:6px; flex-shrink:0;"></div><p style="margin:0; color:#cbd5e1; font-size:13px; line-height:1.5; word-break:break-word; overflow-wrap:break-word; flex:1;">${b}</p></div>`).join('')}
              ${(s.subSections || []).map(sub => `
                <div style="margin-left:16px; border-left:2px solid #312e81; padding:5px 0 5px 12px; margin-top:12px; background:rgba(99, 102, 241, 0.05); border-radius:0 8px 8px 0; page-break-inside:avoid;">
                  <h5 style="margin:0 0 6px 0; font-size:11px; font-weight:900; color:#818cf8; text-transform:uppercase; letter-spacing:0.05em; word-break:break-word;">${sub.title}</h5>
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    ${sub.bullets.map(sb => `<p style="margin:0; color:#94a3b8; font-size:12px; line-height:1.4; page-break-inside:avoid; word-break:break-word; overflow-wrap:break-word;">— ${sb}</p>`).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
      } else if (activeTab === 'flashcards') {
        const rawFlashcards = getDisplayContent('flashcards', summary?.content?.flashcards);
        const cards = getNormalizedFlashcards(rawFlashcards);
        html += cards.map((f) => `
          <div style="border-left:6px solid #ec4899; background:#020617; border: 1px solid #1e293b; padding:16px 18px; margin-bottom:12px; border-radius:10px; page-break-inside:avoid; box-sizing:border-box; width:100%; word-break:break-word;">
            <p style="font-weight:bold; margin:0 0 8px 0; color:#fdf2f8; font-size:14px; word-break:break-word;">Q: ${highlightTextForPDF(f.question)}</p>
            <p style="color:#fbcfe8; margin:0; font-size:13px; line-height:1.5; word-break:break-word;">A: ${highlightTextForPDF(f.answer)}</p>
          </div>
        `).join('');
      } else if (activeTab === 'table' || (activeTab as string) === 'comparative') {
        const rawTables = getDisplayContent('comparativeTable', summary?.content?.comparativeTable);
        const tables = getNormalizedComparativeTables(rawTables);
        html += tables.map((table) => `
          <div style="margin-bottom:24px; border:1px solid #1e293b; border-radius:14px; background:#020617; overflow:hidden; box-sizing:border-box; width:100%;">
            <div style="background:linear-gradient(to right, #1e1b4b, #1e3a8a); padding:12px 18px; border-bottom:1px solid #1e293b;">
              <h4 style="margin:0; font-weight:700; color:#f8fafc; font-size:15px; word-break:break-word;">${table.title}</h4>
            </div>
            <div style="padding:0; background:#000; overflow:hidden;">
              <table style="width:100%; max-width:100%; border-collapse:collapse; color:#cbd5e1; font-size:13px; table-layout:fixed; word-break:break-word;">
                <thead>
                  <tr style="background:#0f172a; border-bottom:1px solid #1e293b; page-break-inside:avoid;">
                    <th style="padding:12px 10px; border:1px solid #1e293b; color:#94a3b8; text-align:center; width:38px;">#</th>
                    ${table.headers.map(h => `<th style="padding:12px 10px; border:1px solid #1e293b; color:#60a5fa; text-align:left; font-weight:700; word-break:break-word;">${h.toUpperCase()}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${table.rows.map((row, rIdx) => `
                    <tr style="page-break-inside:avoid; background:${rIdx % 2 === 0 ? 'rgba(15, 23, 42, 0.4)' : '#020617'};">
                      <td style="padding:12px 10px; border:1px solid #1e293b; text-align:center; color:#64748b; font-family:monospace; font-weight:bold;">${rIdx + 1}</td>
                      ${row.map((cell, cIdx) => `
                        <td style="padding:12px 10px; border:1px solid #1e293b; vertical-align:top; line-height:1.5; word-break:break-word; overflow-wrap:break-word; ${cIdx === 0 ? 'color:#60a5fa; font-weight:700;' : ''}">
                          ${highlightTextForPDF(cell)}
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('');
      }

      element.innerHTML = html;
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const pdfOpt = {
        margin: 0, 
        filename: `${activeTab}_Report_${docTitle.replace(/\s+/g, '_')}${modSuffix}.pdf`,
        image: { type: 'jpeg' as const, quality: 1.0 },
        html2canvas: { 
          scale: 2.0, 
          useCORS: true, 
          backgroundColor: '#030712',
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: (activeTab === 'table' ? 'landscape' : 'portrait') as any },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      await html2pdf().set(pdfOpt).from(element).save();
      toast.success(`${activeTab} saved!`);
    } catch (err: any) {
      console.error('Module export error:', err);
      toast.error('Export failed');
    } finally {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: docTitle,
          text: `Check out this document summary for "${docTitle}" on OmniStudy AI!`,
          url: window.location.href,
        });
      } else {
        handleCopyLink();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') toast.error('Failed to share');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out this document summary for "${docTitle}" on OmniStudy AI: ${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleRegenerate = async () => {
    if (!summaryId) return;
    try {
      setLoading(true);
      toast.info('Regenerating...');
      const { data } = await api.post(`/summaries/${summaryId}/regenerate`);
      setSummary(data);
      toast.success('Regenerated!');
    } catch (error: any) {
      toast.error('Regeneration failed');
    } finally {
      setLoading(false);
    }
  };

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
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 print:hidden">
        <div className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-2 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full h-8 w-8 sm:h-10 sm:w-10">
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-1.5">
              <img src="/icons/logo-transparent-192.png" alt="OmniStudy Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="brand-logo text-[18px] sm:text-[28px]">
                OmniStudy <span className="brand-logo-ai">AI</span>
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onThemeToggle} className="rounded-full h-8 w-8 sm:h-10 sm:w-10">
            {theme === 'light' ? <Moon className="h-4 w-4 sm:h-5 sm:w-5" /> : <Sun className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>
        </div>
      </header>

      <main className="w-full px-4 sm:px-16 lg:px-24 xl:px-32 py-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
            <div className="w-full sm:w-auto">
              <h1 className="text-lg sm:text-3xl font-semibold line-clamp-2 leading-tight">{docTitle}</h1>
              <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1 font-medium">
                Summary from {summary.fileName || fileName}
                {summary.pages && <span className="ml-2">· {summary.pages} pg{summary.pages !== 1 ? 's' : ''}</span>}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={handleDownloadModulePDF} className="gap-1.5 sm:gap-2 rounded-xl flex-1 sm:flex-initial h-8 sm:h-9 text-[10px] sm:text-sm px-3 sm:px-4">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                  This Module
                </Button>
                <Button variant="default" size="sm" onClick={handleDownloadPDF} className="gap-1.5 sm:gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-initial h-8 sm:h-9 text-[10px] sm:text-sm px-3 sm:px-4">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                  Full Export
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 text-[10px] sm:text-xs font-medium transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl outline-none flex-1 sm:flex-initial">
                    <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    Share
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-2xl p-1 bg-white dark:bg-slate-900 border shadow-xl z-50">
                    <DropdownMenuItem onClick={handleCopyLink} className="gap-2 rounded-xl cursor-copy">
                      <Copy className="h-4 w-4 text-blue-500" />
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleWhatsAppShare} className="gap-2 rounded-xl">
                      <MessageCircle className="h-4 w-4 text-green-500" />
                      Share via WhatsApp
                    </DropdownMenuItem>
                    {!!navigator.share && (
                      <DropdownMenuItem onClick={handleShare} className="gap-2 rounded-xl">
                        <ExternalLink className="h-4 w-4 text-purple-500" />
                        More Options...
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={handleRegenerate} className="gap-1.5 sm:gap-2 rounded-xl flex-1 sm:flex-initial h-8 sm:h-9 text-[10px] sm:text-sm border-blue-500 text-blue-500 hover:bg-blue-50">
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                  Regenerate
                </Button>
              </div>
            </div>
          </div>

          {/* ── Translation: Translate All Panel ────────────────────────── */}
          <TranslateAllPanel
            translationStates={translationStates}
            isTranslatingAll={isTranslatingAll}
            serviceAvailable={serviceAvailable}
            onTranslateAll={translateAll}
            onResetOriginal={resetAllToOriginal}
          />

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-2 text-xs sm:text-sm justify-start px-1.2 sm:px-1.5 ${isActive ? tab.activeBg : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20' : tab.iconBg}`}>
                    <span className={isActive ? 'text-white' : tab.iconColor}>{tab.icon}</span>
                  </div>
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>

          <div className="relative">
            {/* Tab: Text */}
            <div id="export-text" className={activeTab === 'text' ? 'block' : 'hidden'}>
              <Card className="dark:bg-gray-950 border-none shadow-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-white/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold">Key Points</CardTitle>
                    <TranslationControls moduleType="text" summaryId={summaryId} state={translationStates.text} activeLanguage={activeLanguages.text} showTranslated={showTranslated.text} hasTranslation={(lang) => hasTranslation('text', lang)} error={translationErrors.text} onLanguageChange={setModuleLanguage} onTranslate={doTranslateModule} onToggleOriginal={toggleOriginal} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-8">
                  <ScrollArea className="h-[700px]">
                    <div className="space-y-4">
                      {(getDisplayContent('text', keyPoints) as string[]).map((point: string, index: number) => (
                        <div key={index} className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 transition-all hover:translate-x-1" style={{ overflow: 'hidden' }}>
                          <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 aspect-square rounded-full bg-blue-500 text-white text-[10px] sm:text-xs font-semibold flex items-center justify-center shadow-lg shadow-blue-500/20 leading-none">{index + 1}</span>
                          <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed min-w-0 flex-1" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}><HighlightedText text={point} /></p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Tab: Outline */}
            <div id="export-outline" className={activeTab === 'outline' ? 'block' : 'hidden'}>
              <Card className="dark:bg-gray-950 border-none shadow-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-white/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold">Outline</CardTitle>
                    <TranslationControls moduleType="documentOutline" summaryId={summaryId} state={translationStates.documentOutline} activeLanguage={activeLanguages.documentOutline} showTranslated={showTranslated.documentOutline} hasTranslation={(lang) => hasTranslation('documentOutline', lang)} error={translationErrors.documentOutline} onLanguageChange={setModuleLanguage} onTranslate={doTranslateModule} onToggleOriginal={toggleOriginal} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-8">
                  <ScrollArea className="h-[700px]">
                    <div className="space-y-4">
                      {(getDisplayContent('documentOutline', documentOutline) as typeof documentOutline).map((section, sIdx) => (
                        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                          <button
                            className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-indigo-50/30 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/20 hover:from-indigo-100/40 transition-all"
                            onClick={() => toggleSection(sIdx)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 aspect-square rounded-full bg-indigo-500 text-white text-[10px] sm:text-xs font-semibold flex items-center justify-center shadow-lg shadow-indigo-500/20">{sIdx + 1}</div>
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100"><MathText content={section.heading} inline /></h4>
                            </div>
                            {expandedSections[sIdx] === false ? <ChevronRight className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                          </button>
                          {expandedSections[sIdx] !== false && (
                            <div className="p-6 space-y-4 bg-white dark:bg-gray-950/50">
                              {section.bullets.map((b, bIdx) => (
                                <div key={bIdx} className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" /><div className="text-sm text-gray-700 dark:text-gray-300 font-medium min-w-0 flex-1" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}><MathText content={b} /></div></div>
                              ))}
                              {section.subSections?.map((sub, ssIdx) => (
                                <div key={ssIdx} className="pl-6 border-l-2 border-indigo-50 dark:border-indigo-900/50 py-1">
                                  <h5 className="text-xs font-black text-indigo-500 uppercase tracking-tighter mb-2"><MathText content={sub.title} inline /></h5>
                                  <div className="space-y-1">{sub.bullets.map((sb, sbIdx) => <div key={sbIdx} className="text-xs text-gray-500 dark:text-gray-400">— <MathText content={sb} inline /></div>)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Tab: Mindmap */}
            <div id="export-mindmap" className={activeTab === 'mindmap' ? 'block' : 'hidden'}>
              <div className="flex items-center justify-end mb-3">
                <TranslationControls moduleType="mindMapData" summaryId={summaryId} state={translationStates.mindMapData} activeLanguage={activeLanguages.mindMapData} showTranslated={showTranslated.mindMapData} hasTranslation={(lang) => hasTranslation('mindMapData', lang)} error={translationErrors.mindMapData} onLanguageChange={setModuleLanguage} onTranslate={doTranslateModule} onToggleOriginal={toggleOriginal} />
              </div>
              <MindMapViewer title={docTitle} data={getDisplayContent('mindMapData', finalMindMapData)} theme={theme} />
            </div>

            {/* Tab: Infographic */}
            <div id="export-infographic" className={activeTab === 'infographic' ? 'block' : 'hidden'}>
              <div className="flex items-center justify-end mb-3">
                <TranslationControls moduleType="infographicData" summaryId={summaryId} state={translationStates.infographicData} activeLanguage={activeLanguages.infographicData} showTranslated={showTranslated.infographicData} hasTranslation={(lang) => hasTranslation('infographicData', lang)} error={translationErrors.infographicData} onLanguageChange={setModuleLanguage} onTranslate={doTranslateModule} onToggleOriginal={toggleOriginal} />
              </div>
              <InfographicViewer title={docTitle} data={getDisplayContent('infographicData', summary.content?.infographicData)} theme={theme} onViewModeChange={setActiveInfographicMode} />
            </div>

            {/* Tab: Flashcards */}
            <div id="export-flashcards" className={activeTab === 'flashcards' ? 'block' : 'hidden'}>
              <div className="flex items-center justify-end mb-3">
                <TranslationControls moduleType="flashcards" summaryId={summaryId} state={translationStates.flashcards} activeLanguage={activeLanguages.flashcards} showTranslated={showTranslated.flashcards} hasTranslation={(lang) => hasTranslation('flashcards', lang)} error={translationErrors.flashcards} onLanguageChange={setModuleLanguage} onTranslate={doTranslateModule} onToggleOriginal={toggleOriginal} />
              </div>
              <FlashcardsViewer title={docTitle} data={getDisplayContent('flashcards', summary.content?.flashcards)} />
            </div>

            {/* Tab: Table */}
            <div id="export-table" className={activeTab === 'table' ? 'block' : 'hidden'}>
              <div className="flex items-center justify-end mb-3">
                <TranslationControls moduleType="comparativeTable" summaryId={summaryId} state={translationStates.comparativeTable} activeLanguage={activeLanguages.comparativeTable} showTranslated={showTranslated.comparativeTable} hasTranslation={(lang) => hasTranslation('comparativeTable', lang)} error={translationErrors.comparativeTable} onLanguageChange={setModuleLanguage} onTranslate={doTranslateModule} onToggleOriginal={toggleOriginal} />
              </div>
              <ComparativeTableViewer title={docTitle} data={getDisplayContent('comparativeTable', summary.content?.comparativeTable)} theme={theme} />
            </div>

            {/* Hidden: All Infographic Modes for Export (Used by handleDownloadPDF & handleDownloadModulePDF) */}
            <div id="export-infographic-all" className="hidden pointer-events-none" style={{ position: 'fixed', left: 0, top: 0, zIndex: -9999, width: '1400px', opacity: 0 }}>
              <InfographicViewer title={docTitle} data={getDisplayContent('infographicData', summary.content?.infographicData)} theme={theme} forcedViewMode="hub" forcedFanned={true} contentOnly={true} />
              <InfographicViewer title={docTitle} data={getDisplayContent('infographicData', summary.content?.infographicData)} theme={theme} forcedViewMode="flow" forcedFanned={true} contentOnly={true} />
              <InfographicViewer title={docTitle} data={getDisplayContent('infographicData', summary.content?.infographicData)} theme={theme} forcedViewMode="circular" forcedFanned={true} contentOnly={true} />
              <InfographicViewer title={docTitle} data={getDisplayContent('infographicData', summary.content?.infographicData)} theme={theme} forcedViewMode="flowchart" forcedFanned={true} contentOnly={true} />
            </div>

            {/* Hidden: Mindmap for Full Export Fallback */}
            <div id="export-mindmap-fallback" className="hidden pointer-events-none" style={{ position: 'fixed', left: 0, top: 0, zIndex: -9999, width: '1400px', opacity: 0 }}>
              <MindMapViewer title={docTitle} data={getDisplayContent('mindMapData', finalMindMapData)} theme={theme} contentOnly={true} />
            </div>
          </div>
        </div>
      </main>

      {/* ── Document-Grounded AI Chatbot Floating Overlay ───────────────────── */}
      <DocumentChatDrawer
        summaryId={summaryId}
        docTitle={docTitle}
        theme={theme}
      />

      {/* ── Test Yourself / AI Quiz Overlay Sticky Action ───────────────────── */}
      <QuizSection
        summaryId={summaryId}
        docTitle={docTitle}
        fileName={summary?.fileName || fileName}
        theme={theme}
        onThemeToggle={onThemeToggle}
        activeLanguage={activeLanguages.text}
      />
    </div>
  );
}