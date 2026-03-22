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

interface SummaryViewerProps {
  fileName: string;
  summaryId: string | null;
  onBack: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

type TabId = 'text' | 'mindmap' | 'infographic' | 'flashcards' | 'table' | 'outline';

function HighlightedText({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  return (
    <>
      {words.map((word, i) => {
        const clean = word.replace(/[^a-zA-Z0-9\-]/g, '');
        const isImportant =
          /^[A-Z][a-zA-Z]{2,}$/.test(clean) ||
          /^\d+(\.\d+)?%?$/.test(clean) ||
          /^[A-Z]{2,}$/.test(clean) ||
          /^[a-zA-Z]+-[a-zA-Z]+$/.test(clean);

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
        return text.split(/(\s+)/).map(word => {
          const clean = word.replace(/[^a-zA-Z0-9\-]/g, '');
          const isImportant = /^[A-Z][a-zA-Z]{2,}$/.test(clean) || /^\d+(\.\d+)?%?$/.test(clean) || /^[A-Z]{2,}$/.test(clean) || /^[a-zA-Z]+-[a-zA-Z]+$/.test(clean);
          return isImportant ? `<strong style="color: #60a5fa; font-weight: 700;">${word}</strong>` : `<span>${word}</span>`;
        }).join('');
      };

      const finalHtmlEl = document.createElement('div');
      finalHtmlEl.style.background = '#030712';
      finalHtmlEl.style.color = '#f8fafc';
      finalHtmlEl.style.fontFamily = "'Inter', sans-serif";

      const modulesToInclude = ['text', 'outline', 'infographic', 'mindmap', 'flashcards', 'table'];
      
      for (const mType of modulesToInclude) {
        if (['infographic', 'mindmap'].includes(mType)) {
          const wrapperId = mType === 'infographic' ? 'export-infographic-all' : `export-${mType}-fallback`;
          const wrapper = document.getElementById(wrapperId);
          if (!wrapper) continue;

          const origDisplay = wrapper.style.display;
          const origPos = wrapper.style.position;
          const origVisibility = wrapper.style.visibility;
          const origHeight = wrapper.style.height;
          const origOverflow = wrapper.style.overflow;

          wrapper.style.display = 'block'; 
          wrapper.style.position = 'absolute'; 
          wrapper.style.top = '-10000px';
          wrapper.style.width = '1400px';
          wrapper.style.visibility = 'visible';
          wrapper.style.height = 'auto';
          wrapper.style.overflow = 'visible';
          wrapper.classList.remove('hidden');
          
          await new Promise(r => setTimeout(r, 1500)); // Increased stabilization for ultra-hd rendering

          // Use unique attribute to avoid collisions with nested export containers
          const items = wrapper.querySelectorAll('[data-pdf-export-target="true"]');
          for (let i = 0; i < items.length; i++) {
            const el = items[i] as HTMLElement;
            const label = el.getAttribute('data-infographic-label') || mType;
            const isCircular = label === 'Hub' || label === 'Orbit';

            const img = await htmlToImage.toPng(el, { 
              quality: 1.0, 
              pixelRatio: 5.5, // Sync with module export for industrial clarity
              backgroundColor: '#030712',
              style: {
                transform: 'scale(1)',
                transformOrigin: 'center center',
                opacity: '1',
                overflow: 'visible',
                animation: 'none !important',
                transition: 'none !important',
                imageRendering: '-webkit-optimize-contrast'
              }
            });
            const page = document.createElement('div');
            // Minimal padding for maximum visual surface area
            page.style.padding = '15px'; 
            page.style.pageBreakAfter = 'always';
            page.style.backgroundColor = '#020617';

            // Dynamic styling: Standard modes are forced to one page for neatness.
            // Dynamic styling: All infographics and mind maps are allowed to be ultra-tall 
            // and span multiple pages to ensure maximum clarity and readability.
            const imgStyle = 'width:100%; height:auto; display:block;';

            page.innerHTML = `
              <div style="text-align: center; margin-bottom: 15px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                <p style="color:#3b82f6; margin:0; font-size: 14px; font-weight: 900; text-transform:uppercase; letter-spacing:0.1em;">OMNISTUDY AI • ${label}</p>
              </div>
              <div class="pdf-tall-image">
                <img src="${img}" style="${imgStyle}" />
              </div>
            `;
            finalHtmlEl.appendChild(page);
          }
          // Restore original styles
          wrapper.style.display = origDisplay;
          wrapper.style.position = origPos;
          wrapper.style.visibility = origVisibility;
          wrapper.style.height = origHeight;
          wrapper.style.overflow = origOverflow;
          if (origDisplay === 'none') { // Only re-add hidden if it was originally hidden
            wrapper.classList.add('hidden');
          }
        } else {
          const page = document.createElement('div');
          page.style.padding = '40px';
          page.style.pageBreakAfter = 'always';
          if (mType === 'table') page.style.pageBreakBefore = 'always';

          let html = `
            <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #1e293b; padding-bottom: 20px;">
              <h1 style="color:#3b82f6; margin:0; font-size: 32px; font-weight: 900;">OMNISTUDY AI</h1>
              <p style="color:#94a3b8; margin:5px 0 0 0; text-transform:uppercase; font-size:12px;">${mType} Report | ${docTitle}</p>
            </div>
          `;
          if (mType === 'text') {
            html += keyPoints.map((p, i) => `
              <div style="background:rgba(30, 58, 138, 0.2); border:1px solid rgba(30, 58, 138, 0.3); padding:20px; border-radius:18px; margin-bottom:12px; display:flex; gap:16px; align-items:center; page-break-inside:avoid;">
                <div style="width:32px; height:32px; background:#3b82f6; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13px; flex-shrink:0; box-shadow:0 0 15px rgba(59, 130, 246, 0.3);">${i+1}</div>
                <p style="margin:0; font-size:15px; color:#f1f5f9; line-height:1.6; font-weight:500;">${highlightTextForPDF(p)}</p>
              </div>
            `).join('');
          } else if (mType === 'outline') {
            html += documentOutline.map((s, i) => `
              <div style="margin-bottom:20px; border:1px solid #1e293b; border-radius:16px; background:#020617; overflow:hidden; page-break-inside:avoid;">
                <div style="background:linear-gradient(to right, #1e1b4b, #1e3a8a); padding:15px 20px; border-bottom:1px solid #1e293b; display:flex; align-items:center; gap:16px;">
                  <div style="width:32px; height:32px; background:#6366f1; color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; box-shadow:0 4px 12px rgba(99, 102, 241, 0.3); flex-shrink:0;">${i+1}</div>
                  <h4 style="margin:0; font-weight:700; color:#f8fafc; font-size:16px;">${s.heading}</h4>
                </div>
                <div style="padding:20px; background:#000;">
                  ${s.bullets.map(b => `<div style="display:flex; gap:12px; margin-bottom:12px; page-break-inside:avoid;"><div style="width:6px; height:6px; background:#818cf8; border-radius:50%; margin-top:6px; flex-shrink:0;"></div><p style="margin:0; color:#cbd5e1; font-size:14px; line-height:1.5;">${b}</p></div>`).join('')}
                  ${(s.subSections || []).map(sub => `
                    <div style="margin-left:24px; border-left:2px solid #312e81; padding:5px 0 5px 15px; margin-top:15px; background:rgba(99, 102, 241, 0.05); border-radius:0 8px 8px 0; page-break-inside:avoid;">
                      <h5 style="margin:0 0 8px 0; font-size:11px; font-weight:900; color:#818cf8; text-transform:uppercase; letter-spacing:0.05em;">${sub.title}</h5>
                      <div style="display:flex; flex-direction:column; gap:6px;">
                        ${sub.bullets.map(sb => `<p style="margin:0; color:#94a3b8; font-size:13px; line-height:1.4; page-break-inside:avoid;">— ${sb}</p>`).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('');
          } else if (mType === 'flashcards') {
            const fs = summary?.content?.flashcards || [];
            html += fs.map((f: any) => `<div style="border-left:6px solid #ec4899; background:#020617; border: 1px solid #1e293b; padding:18px; margin-bottom:12px; border-radius:10px; page-break-inside:avoid;"><p style="font-weight:bold; margin:0 0 8px 0; color:#fdf2f8; font-size:15px;">Q: ${f.question}</p><p style="color:#fbcfe8; margin:0; font-size:14px; line-height:1.5;">A: ${f.answer}</p></div>`).join('');
          } else if (mType === 'table') {
            const tables = summary?.content?.comparativeTable || [];
            html += tables.map((table: any) => {
              const headers = table.headers || (table[0] ? Object.keys(table[0]) : []);
              const rows = table.rows || (Array.isArray(table) ? table : []);
              return `
                <div style="margin-bottom:30px; border:1px solid #1e293b; border-radius:16px; background:#020617; overflow:hidden; page-break-inside:avoid;">
                  <div style="background:linear-gradient(to right, #1e1b4b, #1e3a8a); padding:15px 20px; border-bottom:1px solid #1e293b;">
                    <h4 style="margin:0; font-weight:700; color:#f8fafc; font-size:16px;">${table.title || 'Comparison Table'}</h4>
                  </div>
                  <div style="padding:0; background:#000;">
                    <table style="width:100%; border-collapse:collapse; color:#cbd5e1; font-size:11px; table-layout:auto;">
                      <thead>
                        <tr style="background:#0f172a; border-bottom:1px solid #1e293b;">
                          <th style="padding:12px; border:1px solid #1e293b; color:#94a3b8; text-align:center; width:40px;">#</th>
                          ${headers.map((h: string) => `<th style="padding:12px; border:1px solid #1e293b; color:#60a5fa; text-align:left; font-weight:700;">${h.toUpperCase()}</th>`).join('')}
                        </tr>
                      </thead>
                      <tbody>
                        ${rows.map((row: any, rIdx: number) => {
                          const cells = Array.isArray(row) ? row : Object.values(row);
                          return `
                            <tr>
                              <td style="padding:12px; border:1px solid #1e293b; text-align:center; color:#475569; font-family:monospace;">${rIdx + 1}</td>
                              ${cells.map((cell: any, cIdx: number) => `
                                <td style="padding:12px; border:1px solid #1e293b; vertical-align:top; line-height:1.5; ${cIdx === 0 ? 'color:#60a5fa; font-weight:700;' : ''}">
                                  ${cell || ''}
                                </td>
                              `).join('')}
                            </tr>
                          `;
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            }).join('');
          }
          page.innerHTML = html;
          finalHtmlEl.appendChild(page);
        }
      }

      const opt = {
        margin: 0, filename: `${docTitle}_Full_Report.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 1.0, 
          useCORS: true, 
          backgroundColor: '#030712',
          logging: false,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(finalHtmlEl).save();
      toast.success('Comprehensive report downloaded!');
    } catch (err: any) {
      console.error('Full PDF Export failed:', err);
      toast.error('Full export failed');
    }
  };

  const handleDownloadModulePDF = async () => {
    try {
      toast.info(`Exporting ${activeTab}...`);
      
      const highlightTextForPDF = (text: string) => {
        if (!text) return '';
        return text.split(/(\s+)/).map(word => {
          const clean = word.replace(/[^a-zA-Z0-9\-]/g, '');
          const isImportant = /^[A-Z][a-zA-Z]{2,}$/.test(clean) || /^\d+(\.\d+)?%?$/.test(clean) || /^[A-Z]{2,}$/.test(clean) || /^[a-zA-Z]+-[a-zA-Z]+$/.test(clean);
          return isImportant ? `<strong style="color: #60a5fa; font-weight: 700;">${word}</strong>` : `<span>${word}</span>`;
        }).join('');
      };

      // SPECIAL HANDLING: Infographics download as multiple high-res PNGs
      if (activeTab === 'infographic') {
        const wrapper = document.getElementById('export-infographic-all');
        if (!wrapper) return;
        const subItems = wrapper.querySelectorAll('[data-pdf-export-target="true"]');
        
        wrapper.classList.remove('hidden');
        wrapper.style.visibility = 'visible';
        wrapper.style.position = 'absolute';
        wrapper.style.top = '-10000px';

        await new Promise(r => setTimeout(r, 1000));

        for (let i = 0; i < subItems.length; i++) {
          const target = subItems[i] as HTMLElement;
          const label = target.getAttribute('data-infographic-label') || 'Module';
          const modeName = label === 'Hub' ? 'hub' : label === 'Steps' ? 'flow' : label === 'Orbit' ? 'circular' : 'flowchart';
          
          if (modeName !== activeInfographicMode) continue;
          
          const saveName = modeName === 'hub' ? 'KnowledgeHub' : modeName === 'flow' ? 'ProcessSteps' : modeName === 'circular' ? 'ConceptualOrbit' : 'ActionFlow';

          const usePdf = (modeName === 'flow' || modeName === 'flowchart');

          // Capture as High-Res Image FIRST (This is more reliable than direct PDF capture for complex SVGs)
          const imgData = await htmlToImage.toPng(target, { 
            quality: 1.0, 
            pixelRatio: 5.5, // Ultra-wide high density capture
            backgroundColor: theme === 'dark' ? '#030712' : '#ffffff',
            style: { transform: 'scale(1)', opacity: '1', animation: 'none !important', transition: 'none !important' }
          });          if (usePdf) {
            const pdfEl = document.createElement('div');
            pdfEl.style.padding = '0';
            pdfEl.style.background = '#030712';
            pdfEl.style.minHeight = '297mm'; // A4 Height
            pdfEl.style.display = 'flex';
            pdfEl.style.flexDirection = 'column';
            
            pdfEl.innerHTML = `
              <div style="padding: 24px 32px; background: #030712; color: #fff; font-family: 'Inter', sans-serif; flex: 1; display: flex; flex-direction: column;">
                <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1e293b; padding-bottom: 16px; flex-shrink: 0;">
                  <h1 style="color:#3b82f6; margin:0; font-size: 28px; font-weight: 900; letter-spacing: -0.02em;">OMNISTUDY AI</h1>
                  <p style="color:#94a3b8; margin:8px 0 0 0; text-transform:uppercase; font-size:11px; font-weight: 800; letter-spacing: 0.15em;">${saveName.replace(/([A-Z])/g, ' $1').trim()} | ${docTitle}</p>
                </div>
                
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 10px;">
                  <div style="width: 100%; max-width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 50px rgba(0,0,0,0.7); border: 1px solid #1e293b; background: #030712;">
                    <img src="${imgData}" style="width: 100%; height: auto; display: block; object-fit: contain; image-rendering: -webkit-optimize-contrast;" />
                  </div>
                </div>

                <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #475569; letter-spacing: 0.05em; font-weight: 600;">
                  DOCUMENT VISUALIZATION SYSTEM | HIGH-FIDELITY STUDY MODULE
                </div>
              </div>
            `;

            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            const pdfOpt = {
              margin: 0, 
              filename: `Infographic_${saveName}_${docTitle.replace(/\s+/g, '_')}.pdf`,
              image: { type: 'png' as const, quality: 1.0 },
              html2canvas: { scale: 2.0, useCORS: true, backgroundColor: '#030712' },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as any },
              pagebreak: { mode: ['css', 'legacy'] }
            };
            await html2pdf().set(pdfOpt).from(pdfEl).save();
          } else {
            const link = document.createElement('a');
            link.download = `Infographic_${saveName}_${docTitle.replace(/\s+/g, '_')}.png`;
            link.href = imgData;
            link.click();
          }
          await new Promise(r => setTimeout(r, 400));
        }
        
        wrapper.classList.add('hidden');
        toast.success(`Success! ${activeInfographicMode.toUpperCase()} module saved.`);
        return;
      }

      // SPECIAL HANDLING: Mind Map downloads as high-res PDF (Multi-page)
      if (activeTab === 'mindmap') {
        const wrapper = document.getElementById('export-mindmap-fallback');
        if (!wrapper) return;
        const subItems = wrapper.querySelectorAll('[data-pdf-export-target="true"]');
        if (subItems.length === 0) return;

        wrapper.classList.remove('hidden');
        wrapper.style.visibility = 'visible';
        wrapper.style.position = 'absolute';
        wrapper.style.top = '-10000px';
        
        await new Promise(r => setTimeout(r, 1200));

        const pdfEl = document.createElement('div');
        pdfEl.style.background = '#030712';
        
        for (let i = 0; i < subItems.length; i++) {
          const target = subItems[i] as HTMLElement;
          const label = target.getAttribute('data-infographic-label') || 'Mind Map';
          const nodeCount = target.querySelectorAll('foreignObject h3').length;

          // Capture as High-Res Image FIRST
          const imgData = await htmlToImage.toPng(target, { 
            quality: 1.0, 
            pixelRatio: 4.5, // High density for mindmaps
            backgroundColor: theme === 'dark' ? '#030712' : '#ffffff',
            style: { transform: 'scale(1)', opacity: '1', animation: 'none !important', transition: 'none !important' }
          });

          const pg = document.createElement('div');
          pg.style.width = '210mm'; // Standard A4 Portrait Width
          pg.style.boxSizing = 'border-box';
          pg.style.background = '#030712';
          pg.style.display = 'flex';
          pg.style.flexDirection = 'column';
          if (i > 0) pg.style.pageBreakBefore = 'always';
          
          pg.innerHTML = `
            <div style="padding: 40px 32px; background: #030712; color: #fff; font-family: 'Inter', sans-serif; display: flex; flex-direction: column; box-sizing: border-box;">
              <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 16px; flex-shrink: 0;">
                <h1 style="color:#3b82f6; margin:0; font-size: 26px; font-weight: 900; letter-spacing: -0.02em;">OMNISTUDY AI</h1>
                <p style="color:#94a3b8; margin:8px 0 0 0; text-transform:uppercase; font-size:10px; font-weight: 800; letter-spacing: 0.15em;">${label} | ${docTitle} | MODULE ${i+1}</p>
              </div>
              
              <div style="width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 50px rgba(0,0,0,0.7); border: 1.5px solid #1e293b; background: #030712;">
                <img src="${imgData}" style="width: 100%; height: auto; display: block; image-rendering: -webkit-optimize-contrast;" />
              </div>

              <div style="text-align: center; margin-top: 30px; font-size: 9px; color: #475569; letter-spacing: 0.05em; font-weight: 600; flex-shrink: 0; text-transform: uppercase;">
                CONCEPTUAL NETWORK SYSTEM | ${nodeCount} SEGMENTS ANALYZED
              </div>
            </div>
          `;
          pdfEl.appendChild(pg);
          await new Promise(r => setTimeout(r, 400));
        }

        // @ts-ignore
        const html2pdf = (await import('html2pdf.js')).default;
        const pdfOpt = {
          margin: 0, 
          filename: `MindMaps_${docTitle.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'png' as const, quality: 1.0 },
          html2canvas: { scale: 1.5, useCORS: true, backgroundColor: '#030712' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as any },
          pagebreak: { mode: ['css', 'legacy'] }
        };
        await html2pdf().set(pdfOpt).from(pdfEl).save();
        
        wrapper.classList.add('hidden');
        toast.success(`Success! All mind maps saved as a multi-page PDF.`);
        return;
      }

      // STANDARD HANDLING: Other modules download as PDF
      const element = document.createElement('div');
      element.style.padding = '40px';
      element.style.background = '#030712';
      element.style.color = '#f8fafc';
      element.style.fontFamily = "'Inter', sans-serif";

      let html = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #1e293b; padding-bottom: 20px;">
          <h1 style="color:#3b82f6; margin:0; font-size: 32px; font-weight: 900;">OMNISTUDY AI</h1>
          <p style="color:#94a3b8; margin:5px 0 0 0; text-transform:uppercase; font-size:12px;">${activeTab} Report | ${docTitle}</p>
        </div>
      `;

      if (activeTab === 'text') {
        html += keyPoints.map((p, i) => `
          <div style="background:rgba(30, 58, 138, 0.2); border:1px solid rgba(30, 58, 138, 0.3); padding:20px; border-radius:18px; margin-bottom:12px; display:flex; gap:16px; align-items:center; page-break-inside:avoid;">
            <div style="width:32px; height:32px; background:#3b82f6; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:13px; flex-shrink:0; box-shadow:0 0 15px rgba(59, 130, 246, 0.3);">${i+1}</div>
            <p style="margin:0; font-size:15px; color:#f1f5f9; line-height:1.6; font-weight:500;">${highlightTextForPDF(p)}</p>
          </div>
        `).join('');
      } else if (activeTab === 'outline') {
        html += documentOutline.map((s, i) => `
          <div style="margin-bottom:20px; border:1px solid #1e293b; border-radius:16px; background:#020617; overflow:hidden; page-break-inside:avoid;">
            <div style="background:linear-gradient(to right, #1e1b4b, #1e3a8a); padding:15px 20px; border-bottom:1px solid #1e293b; display:flex; align-items:center; gap:16px;">
              <div style="width:32px; height:32px; background:#6366f1; color:white; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; box-shadow:0 4px 12px rgba(99, 102, 241, 0.3); flex-shrink:0;">${i+1}</div>
              <h4 style="margin:0; font-weight:700; color:#f8fafc; font-size:16px;">${s.heading}</h4>
            </div>
            <div style="padding:20px; background:#000;">
              ${s.bullets.map(b => `<div style="display:flex; gap:12px; margin-bottom:12px; page-break-inside:avoid;"><div style="width:6px; height:6px; background:#818cf8; border-radius:50%; margin-top:6px; flex-shrink:0;"></div><p style="margin:0; color:#cbd5e1; font-size:14px; line-height:1.5;">${b}</p></div>`).join('')}
              ${(s.subSections || []).map(sub => `
                <div style="margin-left:24px; border-left:2px solid #312e81; padding:5px 0 5px 15px; margin-top:15px; background:rgba(99, 102, 241, 0.05); border-radius:0 8px 8px 0; page-break-inside:avoid;">
                  <h5 style="margin:0 0 8px 0; font-size:11px; font-weight:900; color:#818cf8; text-transform:uppercase; letter-spacing:0.05em;">${sub.title}</h5>
                  <div style="display:flex; flex-direction:column; gap:6px;">
                    ${sub.bullets.map(sb => `<p style="margin:0; color:#94a3b8; font-size:13px; line-height:1.4; page-break-inside:avoid;">— ${sb}</p>`).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
      } else if (activeTab === 'flashcards') {
        html += (summary?.content?.flashcards || []).map((f: any) => `<div style="border-left:6px solid #ec4899; background:#020617; border: 1px solid #1e293b; padding:18px; margin-bottom:12px; border-radius:10px; page-break-inside:avoid;"><p style="font-weight:bold; margin:0 0 8px 0; color:#fdf2f8; font-size:15px;">Q: ${f.question}</p><p style="color:#fbcfe8; margin:0; font-size:14px; line-height:1.5;">A: ${f.answer}</p></div>`).join('');
      } else if (activeTab === 'table' || (activeTab as string) === 'comparative') {
        const tables = summary?.content?.comparativeTable || [];
        html += tables.map((table: any) => {
          const headers = table.headers || (table[0] ? Object.keys(table[0]) : []);
          const rows = table.rows || (Array.isArray(table) ? table : []);
          return `
            <div style="margin-bottom:30px; border:1px solid #1e293b; border-radius:16px; background:#020617; overflow:hidden; page-break-inside:avoid;">
              <div style="background:linear-gradient(to right, #1e1b4b, #1e3a8a); padding:15px 20px; border-bottom:1px solid #1e293b;">
                <h4 style="margin:0; font-weight:700; color:#f8fafc; font-size:16px;">${table.title || 'Comparison Table'}</h4>
              </div>
              <div style="padding:0; background:#000;">
                <table style="width:100%; border-collapse:collapse; color:#cbd5e1; font-size:11px;">
                  <thead>
                    <tr style="background:#0f172a; border-bottom:1px solid #1e293b;">
                      <th style="padding:12px; border:1px solid #1e293b; color:#94a3b8; text-align:center; width:40px;">#</th>
                      ${headers.map((h: string) => `<th style="padding:12px; border:1px solid #1e293b; color:#60a5fa; text-align:left; font-weight:700;">${h.toUpperCase()}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.map((row: any, rIdx: number) => {
                      const cells = Array.isArray(row) ? row : Object.values(row);
                      return `
                        <tr>
                          <td style="padding:12px; border:1px solid #1e293b; text-align:center; color:#475569; font-family:monospace;">${rIdx + 1}</td>
                          ${cells.map((cell: any, cIdx: number) => `
                            <td style="padding:12px; border:1px solid #1e293b; vertical-align:top; line-height:1.5; ${cIdx === 0 ? 'color:#60a5fa; font-weight:700;' : ''}">
                              ${cell || ''}
                            </td>
                          `).join('')}
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          `;
        }).join('');
      }

      element.innerHTML = html;
      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      const pdfOpt = {
        margin: 10, filename: `${activeTab}_Report_${docTitle.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 1.5, useCORS: true, backgroundColor: '#030712' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: (activeTab === 'table' ? 'landscape' : 'portrait') as any },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      await html2pdf().set(pdfOpt).from(element).save();
      toast.success(`${activeTab} saved!`);
    } catch (err: any) {
      console.error('Module export error:', err);
      toast.error('Export failed');
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
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[18px] sm:text-[28px] font-bold tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center">
                <span style={{ color: '#1d51df' }}>O</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>mni</span>
                <span style={{ color: '#1d51df' }} className="ml-0.5 sm:ml-1">S</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>tudy</span>
                <span className="inline-block w-0.5 sm:w-2"></span>
                <span style={{ color: '#1d51df' }}>A</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>I</span>
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
              <h1 className="text-lg sm:text-3xl font-bold line-clamp-2 leading-tight">{docTitle}</h1>
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
                  <CardTitle className="text-lg sm:text-xl font-bold">Key Points</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-8">
                  <ScrollArea className="h-[700px]">
                    <div className="space-y-4">
                      {keyPoints.map((point: string, index: number) => (
                        <div key={index} className="flex gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 transition-all hover:translate-x-1">
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-blue-500/20 leading-none">{index + 1}</span>
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed"><HighlightedText text={point} /></p>
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
                  <CardTitle className="text-lg sm:text-xl font-bold">Outline</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-8">
                  <ScrollArea className="h-[700px]">
                    <div className="space-y-4">
                      {documentOutline.map((section, sIdx) => (
                        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
                          <button
                            className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-indigo-50/30 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/20 hover:from-indigo-100/40 transition-all"
                            onClick={() => toggleSection(sIdx)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-indigo-500/20">{sIdx + 1}</div>
                              <h4 className="font-bold text-gray-900 dark:text-gray-100">{section.heading}</h4>
                            </div>
                            {expandedSections[sIdx] === false ? <ChevronRight className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                          </button>
                          {expandedSections[sIdx] !== false && (
                            <div className="p-6 space-y-4 bg-white dark:bg-gray-950/50">
                              {section.bullets.map((b, bIdx) => (
                                <div key={bIdx} className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" /><p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{b}</p></div>
                              ))}
                              {section.subSections?.map((sub, ssIdx) => (
                                <div key={ssIdx} className="pl-6 border-l-2 border-indigo-50 dark:border-indigo-900/50 py-1">
                                  <h5 className="text-xs font-black text-indigo-500 uppercase tracking-tighter mb-2">{sub.title}</h5>
                                  <div className="space-y-1">{sub.bullets.map((sb, sbIdx) => <p key={sbIdx} className="text-xs text-gray-500 dark:text-gray-400">— {sb}</p>)}</div>
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
              <MindMapViewer title={docTitle} data={finalMindMapData} theme={theme} />
            </div>

            {/* Tab: Infographic */}
            <div id="export-infographic" className={activeTab === 'infographic' ? 'block' : 'hidden'}>
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} onViewModeChange={setActiveInfographicMode} />
            </div>

            {/* Tab: Flashcards */}
            <div id="export-flashcards" className={activeTab === 'flashcards' ? 'block' : 'hidden'}>
              <FlashcardsViewer title={docTitle} data={summary.content?.flashcards} />
            </div>

            {/* Tab: Table */}
            <div id="export-table" className={activeTab === 'table' ? 'block' : 'hidden'}>
              <ComparativeTableViewer title={docTitle} data={summary.content?.comparativeTable} theme={theme} />
            </div>

            {/* Hidden: All Infographic Modes for Export (Used by handleDownloadPDF) */}
            <div id="export-infographic-all" className="hidden pointer-events-none absolute" style={{ top: -10000, width: '1400px' }}>
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} forcedViewMode="hub" forcedFanned={true} contentOnly={true} />
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} forcedViewMode="flow" forcedFanned={true} contentOnly={true} />
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} forcedViewMode="circular" forcedFanned={true} contentOnly={true} />
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} forcedViewMode="flowchart" forcedFanned={true} contentOnly={true} />
            </div>

            {/* Hidden: Mindmap for Full Export Fallback */}
            <div id="export-mindmap-fallback" className="hidden pointer-events-none absolute" style={{ top: -10000, width: '1400px' }}>
              <MindMapViewer title={docTitle} data={finalMindMapData} theme={theme} contentOnly={true} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}