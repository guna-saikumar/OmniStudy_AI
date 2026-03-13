import { useState, useEffect } from 'react';
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
} from 'lucide-react';
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

  const captureElement = async (id: string) => {
    const el = document.getElementById(id);
    if (!el) return null;

    // Temporarily ensure it's visible for capture if it's hidden
    const originalStyle = el.style.display;
    el.style.display = 'block';

    try {
      const dataUrl = await htmlToImage.toPng(el, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0f172a',
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
      toast.info('Generating comprehensive report with visuals...', { duration: 5000 });

      // Capture visuals
      const mindmapImg = await captureElement('export-mindmap');
      // Infographics are handled separately to capture all modes

      const element = document.createElement('div');
      element.className = 'pdf-export-container';
      element.style.padding = '40px';
      element.style.background = '#030712';
      element.style.color = '#f8fafc';
      element.style.fontFamily = 'Inter, sans-serif';

      let html = `
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #1e293b;">
          <h1 style="font-size: 32px; color: #60a5fa; margin-bottom: 10px; font-weight: 800; letter-spacing: -1px;">OmniStudy AI</h1>
          <p style="font-size: 14px; color: #94a3b8; margin: 0;">Comprehensive Research Report: <span style="color: #60a5fa;">${docTitle}</span></p>
        </div>
      `;

      // Key Points
      html += `
        <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
          <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 20px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">keypoints</h2>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${keyPoints.map((p: string, idx: number) => `
              <div style="display: flex; align-items: start; gap: 18px; background: #020617; border: 1px solid #1e40af; padding: 16px 20px; border-radius: 10px; page-break-inside: avoid;">
                <div style="flex-shrink: 0; width: 28px; height: 28px; background: #2563eb; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; line-height: 1;">${idx + 1}</div>
                <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">${p}</p>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // 2. Outline
      if (documentOutline.length > 0) {
        html += `
          <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 24px; border: 1px solid #1e293b;">
            <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">document structure</h2>
            ${documentOutline.map((s: any, idx: number) => `
              <div style="margin-bottom: 20px; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; page-break-inside: avoid; background: #020617;">
                <!-- Header -->
                <div style="background: linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(59, 130, 246, 0.1)); padding: 20px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 16px;">
                  <div style="width: 32px; height: 32px; background: #6366f1; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); flex-shrink: 0;">${idx + 1}</div>
                  <h3 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin: 0;">${s.heading}</h3>
                </div>
                <!-- Content -->
                <div style="padding: 24px; background: rgba(15, 23, 42, 0.5);">
                  <div style="margin-bottom: 20px;">
                    ${(s.bullets || []).map((b: string) => `
                        <div style="display: flex; align-items: flex-start; margin-bottom: 12px; gap: 12px;">
                          <span style="display: block; width: 6px; height: 6px; background: #818cf8; border-radius: 50%; margin-top: 8px; flex-shrink: 0;"></span>
                          <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6; font-weight: 500;">${b}</p>
                        </div>
                    `).join('')}
                  </div>
                  ${(s.subSections || []).map((sub: any) => `
                    <div style="margin-left: 20px; margin-top: 15px; padding-left: 15px; border-left: 2px solid #312e81; padding-top: 4px; padding-bottom: 4px;">
                      <h4 style="font-size: 11px; font-weight: 900; color: #818cf8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">${sub.title}</h4>
                      <div style="padding-left: 4px;">
                        ${(sub.bullets || []).map((sb: string) => `
                          <div style="display: flex; align-items: flex-start; margin-bottom: 6px; gap: 10px;">
                            <span style="color: #475569; font-size: 12px;">—</span>
                            <p style="margin: 0; color: #94a3b8; font-size: 13px; font-weight: 400;">${sb}</p>
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

      // 3. Mind Maps (Support Multiple)
      const mindmapWrapper = document.getElementById('export-mindmap');
      if (mindmapWrapper) {
        const originalDisplay = mindmapWrapper.style.display;
        mindmapWrapper.style.display = 'block';
        const innerMaps = mindmapWrapper.querySelectorAll('[data-mindmap-content="true"]');

        for (let i = 0; i < innerMaps.length; i++) {
          const mapEl = innerMaps[i] as HTMLElement;
          const mapImg = await htmlToImage.toPng(mapEl, {
            quality: 1.0,
            pixelRatio: 3,
            backgroundColor: '#0f172a',
            style: { transform: 'scale(1)', padding: '20px' }
          });

          html += `
            <div style="page-break-before: always; width: 100%; min-height: 290mm; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #030712; padding: 10px; box-sizing: border-box;">
              <div style="width: 96%; border-radius: 24px; overflow: hidden; background: #0f172a; border: 1px solid #1e293b; box-shadow: 0 15px 45px rgba(0,0,0,0.6);">
                <img src="${mapImg}" style="width: 100%; height: auto; display: block;" />
              </div>
              <div style="margin-top: 25px; text-align: center; color: #94a3b8; font-family: Inter, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.8;">
                OmniStudy AI • Mind Map ${i + 1}
              </div>
            </div>
          `;
        }
        mindmapWrapper.style.display = originalDisplay;
      }

      // 4. Infographics (Capture all 4 modes)
      const infraWrapper = document.getElementById('export-infographic-all');
      if (infraWrapper) {
        const originalDisplay = infraWrapper.style.display;
        infraWrapper.style.display = 'block';
        const innerInfras = infraWrapper.querySelectorAll('[data-infographic-content="true"]');

        for (let i = 0; i < innerInfras.length; i++) {
          const infraEl = innerInfras[i] as HTMLElement;
          const infraType = infraEl.getAttribute('data-infographic-view') || 'Visual';
          const infraImg = await htmlToImage.toPng(infraEl, {
            quality: 1.0,
            pixelRatio: 3,
            backgroundColor: '#0f172a',
            style: { transform: 'scale(1)', padding: '20px' }
          });

          const typeLabels: Record<string, string> = {
            hub: 'Knowledge Hub',
            flow: 'Logical Interaction Flow',
            circular: 'Conceptual Orbit',
            flowchart: 'Structural Progression'
          };

          const isSteps = infraType === 'flow';
          const isFlowchart = infraType === 'flowchart';

          html += `
            <div style="page-break-before: always; width: 100%; min-height: 290mm; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #030712; padding: ${isFlowchart || isSteps ? '40px' : '10px'}; box-sizing: border-box;">
               <div style="width: ${isFlowchart ? '42%' : isSteps ? '75%' : '96%'}; ${isFlowchart ? 'max-width: 95mm;' : isSteps ? 'max-height: 265mm;' : ''} border-radius: 20px; overflow: hidden; background: #0f172a; border: 1px solid #1e293b; box-shadow: 0 12px 40px rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center;">
                  <img src="${infraImg}" style="max-width: 100%; max-height: ${isSteps ? '260mm' : '100%'}; width: auto; height: auto; display: block; object-fit: contain;" />
               </div>
               <div style="margin-top: ${isFlowchart || isSteps ? '30px' : '25px'}; text-align: center; color: #94a3b8; font-family: Inter, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.8;">
                  OmniStudy AI • ${typeLabels[infraType] || 'Visual Infographic'}
               </div>
            </div>
          `;
        }
        infraWrapper.style.display = originalDisplay;
      }

      // 5. Flashcards
      const flashcards = summary.content?.flashcards || [];
      if (flashcards.length > 0) {
        html += `
          <div style="margin-bottom: 40px; background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b; page-break-inside: avoid;">
              <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">flashcards</h2>
              <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                  ${flashcards.map((f: any, i: number) => `
                      <div style="border: 1px solid #3d0a21; padding: 18px; border-radius: 12px; background: #020617; border-left: 6px solid #ec4899; margin-bottom: 12px; page-break-inside: avoid;">
                          <p style="font-weight: 700; color: #fdf2f8; margin-bottom: 8px; font-size: 15px;">Q: ${f.question}</p>
                          <p style="color: #fbcfe8; font-size: 14px; line-height: 1.6; border-top: 1px dashed #500724; padding-top: 8px;">A: ${f.answer}</p>
                      </div>
                  `).join('')}
              </div>
          </div>
        `;
      }

      // 6. Comparative Tables
      const tables = summary.content?.comparativeTable || [];
      if (tables.length > 0) {
        tables.forEach((table: any, i: number) => {
          const headers = table.headers || (table[0] ? Object.keys(table[0]) : []);
          const rows = table.rows || (Array.isArray(table) ? table : []);
          html += `
            <div style="page-break-before: always; padding: 20px; background: #030712; min-height: 280mm;">
              <h2 style="font-size: 20px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 700; letter-spacing: 0.5px;">comparative analysis ${tables.length > 1 ? (i + 1) : ''}</h2>
              <div style="background: #020617; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #cbd5e1;">
                  <thead><tr style="background: #000000;">
                    ${headers.map((h: string) => `<th style="border: 1px solid #1e293b; padding: 14px; text-align: left; color: #60a5fa;">${h}</th>`).join('')}
                  </tr></thead>
                  <tbody>
                    ${rows.map((row: any) => `
                      <tr>${(Array.isArray(row) ? row : Object.values(row)).map((cell: any) => `<td style="border: 1px solid #1e293b; padding: 14px;">${cell || ''}</td>`).join('')}</tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              <div style="margin-top: 25px; text-align: center; color: #94a3b8; font-family: Inter, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3em; opacity: 0.8;">
                OmniStudy AI • Comparison Data
              </div>
            </div>
          `;
        });
      }

      element.innerHTML = html;
      const opt = {
        margin: 0,
        filename: `${docTitle}_Full_Report.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(element).save();
      toast.success('Full report exported!');
    } catch (err: any) {
      console.error('PDF failure:', err);
      toast.error('Export failed');
    }
  };

  const handleDownloadModulePDF = async () => {
    try {
      const isVisual = ['mindmap', 'infographic'].includes(activeTab);
      toast.info(`Preparing ${activeTab} ${isVisual ? 'image' : 'report'}...`);

      if (isVisual) {
        const wrapper = document.getElementById(`export-${activeTab}`);
        if (!wrapper) return;

        // NEW: Special handling for Mind Maps - Export ALL maps as a multi-page PDF
        if (activeTab === 'mindmap') {
          const innerMaps = wrapper.querySelectorAll('[data-mindmap-content="true"]');
          if (innerMaps.length > 0) {
            toast.info(`Generating PDF with ${innerMaps.length} mind maps...`);

            const pdfContainer = document.createElement('div');
            pdfContainer.style.background = '#030712';
            pdfContainer.style.padding = '20px';

            for (let i = 0; i < innerMaps.length; i++) {
              const mapEl = innerMaps[i] as HTMLElement;
              const mapImg = await htmlToImage.toPng(mapEl, {
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                style: { transform: 'scale(1)', margin: '0', padding: '40px' },
                cacheBust: true,
              });

              const page = document.createElement('div');
              page.style.width = '297mm';
              page.style.height = '209.5mm'; // Slightly less than 210 to be safe
              page.style.position = 'relative';
              page.style.display = 'flex';
              page.style.flexDirection = 'column';
              page.style.justifyContent = 'center';
              page.style.alignItems = 'center';
              page.style.backgroundColor = '#030712';
              page.style.boxSizing = 'border-box';
              if (i > 0) page.style.pageBreakBefore = 'always';

              page.innerHTML = `
                <div style="width: 92%; max-height: 82%; border-radius: 20px; overflow: hidden; background: #0f172a; border: 1px solid #1e293b; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                  <img src="${mapImg}" style="width: 100%; height: auto; max-height: 100%; display: block;" />
                </div>
                <div style="position: absolute; bottom: 15px; width: 100%; text-align: center; color: #64748b; font-family: Inter, sans-serif; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em;">
                  OmniStudy AI • Mind Map ${i + 1}
                </div>
              `;
              pdfContainer.appendChild(page);
            }

            const pdfOpt = {
              margin: 0,
              filename: `MindMaps_${docTitle.replace(/\s+/g, '_')}.pdf`,
              image: { type: 'jpeg' as const, quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const },
              pagebreak: { mode: 'legacy' }
            };

            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;
            await html2pdf().set(pdfOpt).from(pdfContainer).save();
            toast.success('All mind maps saved to PDF!');
            return;
          }
        }

        // Existing logic for single-image visual (Infographic)
        const innerContent = wrapper.querySelector(`[data-${activeTab}-content="true"]`) as HTMLElement;
        const targetEl = innerContent || wrapper;

        const dataUrl = await htmlToImage.toPng(targetEl, {
          quality: 1.0,
          pixelRatio: 3,
          backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
          style: {
            transform: 'scale(1)',
            transformOrigin: 'center top',
            margin: '0',
            padding: activeTab === 'mindmap' ? '40px' : '0'
          },
          cacheBust: true,
        });

        const link = document.createElement('a');
        link.download = `${activeTab === 'mindmap' ? 'MindMap' : 'Infographic'}_${docTitle.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
        toast.success(`${activeTab === 'mindmap' ? 'Mind Map' : 'Infographic'} saved as full image!`);
        return;
      }

      const img = null; // No image needed for text-based PDF modules

      const element = document.createElement('div');
      element.style.padding = '40px';
      element.style.background = '#030712';
      element.style.color = '#f8fafc';
      element.style.fontFamily = 'Inter, sans-serif';

      let html = `
        <div style="text-align: center; margin-bottom: 40px; padding-bottom: 30px; border-bottom: 1px solid #1e293b;">
          <h1 style="font-size: 32px; color: #60a5fa; margin-bottom: 10px; font-weight: 800; letter-spacing: -1px;">OmniStudy AI</h1>
          <p style="font-size: 14px; color: #94a3b8; margin: 0; text-transform: uppercase;">MODULE: <span style="color: #60a5fa; font-weight: bold;">${activeTab}</span> | ${docTitle}</p>
        </div>
      `;

      if (img) {
        html += `
          <div style="background: #0f172a; padding: 25px; border-radius: 24px; border: 1px solid #1e293b; page-break-inside: avoid;">
             <div style="border-radius: 12px; overflow: hidden; background: #0f172a; border: 1px solid #312e81;">
                <img src="${img}" style="width: 100%; display: block; border-radius: 8px;" />
             </div>
          </div>
        `;
      } else if (activeTab === 'text') {
        html += `
          <div style="background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
            <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 20px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">keypoints</h2>
            ${keyPoints.map((p: string, idx: number) => `
              <div style="display: flex; align-items: center; gap: 18px; background: #020617; border: 1px solid #1e40af; padding: 16px 20px; border-radius: 10px; margin-bottom: 12px; page-break-inside: avoid;">
                <div style="flex-shrink: 0; width: 28px; height: 28px; background: #2563eb; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px;">${idx + 1}</div>
                <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">${p}</p>
              </div>
            `).join('')}
          </div>
        `;
      } else if (activeTab === 'outline') {
        html += `
          <div style="background: #0f172a; padding: 25px; border-radius: 24px; border: 1px solid #1e293b;">
            <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">document structure</h2>
            ${documentOutline.map((s: any, idx: number) => `
              <div style="margin-bottom: 20px; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; page-break-inside: avoid; background: #020617;">
                <div style="background: linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(59, 130, 246, 0.1)); padding: 20px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 16px;">
                  <div style="width: 32px; height: 32px; background: #6366f1; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); flex-shrink: 0;">${idx + 1}</div>
                  <h3 style="font-size: 16px; font-weight: 800; color: #f8fafc; margin: 0;">${s.heading}</h3>
                </div>
                <div style="padding: 24px; background: rgba(15, 23, 42, 0.5);">
                   ${(s.bullets || []).map((b: string) => `
                      <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px;">
                        <span style="width: 6px; height: 6px; background: #818cf8; border-radius: 50%; margin-top: 8px; flex-shrink: 0;"></span>
                        <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.6; font-weight: 500;">${b}</p>
                      </div>
                   `).join('')}
                   ${(s.subSections || []).map((sub: any) => `
                    <div style="margin-left: 20px; margin-top: 15px; padding-left: 15px; border-left: 2px solid #312e81; padding-top: 4px; padding-bottom: 4px;">
                      <h4 style="font-size: 11px; font-weight: 900; color: #818cf8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1em;">${sub.title}</h4>
                      <div style="padding-left: 4px;">
                        ${(sub.bullets || []).map((sb: string) => `
                          <div style="display: flex; align-items: flex-start; margin-bottom: 6px; gap: 10px;">
                            <span style="color: #475569; font-size: 12px;">—</span>
                            <p style="margin: 0; color: #94a3b8; font-size: 13px; font-weight: 400;">${sb}</p>
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
      else if (activeTab === 'flashcards') {
        const flashcards = summary.content?.flashcards || [];
        html += `
          <div style="background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
            <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">flashcards</h2>
            ${flashcards.map((f: any, i: number) => `
              <div style="border: 1px solid #3d0a21; padding: 18px; border-radius: 12px; background: #020617; border-left: 6px solid #ec4899; margin-bottom: 12px; page-break-inside: avoid;">
                <p style="font-weight: 700; color: #fdf2f8; margin-bottom: 8px;">Q: ${f.question}</p>
                <p style="color: #fbcfe8; font-size: 14px; border-top: 1px dashed #500724; padding-top: 8px;">A: ${f.answer}</p>
              </div>
            `).join('')}
          </div>
        `;
      } else if (activeTab === 'table') {
        const tables = summary.content?.comparativeTable || [];
        html += `
          <div style="background: #0f172a; padding: 25px; border-radius: 16px; border: 1px solid #1e293b;">
            <h2 style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px; text-transform: lowercase; font-weight: 600; letter-spacing: 0.5px;">comparison</h2>
            ${tables.map((table: any) => {
          const headers = table.headers || (table[0] ? Object.keys(table[0]) : []);
          const rows = table.rows || (Array.isArray(table) ? table : []);
          return `
                <div style="margin-bottom: 25px; page-break-inside: avoid; background: #020617; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #cbd5e1;">
                    <thead><tr style="background: #000000;">
                      ${headers.map((h: string) => `<th style="border: 1px solid #1e293b; padding: 10px; text-align: left; color: #60a5fa;">${h}</th>`).join('')}
                    </tr></thead>
                    <tbody>
                      ${rows.map((row: any) => `
                        <tr>${(Array.isArray(row) ? row : Object.values(row)).map((cell: any) => `<td style="border: 1px solid #1e293b; padding: 10px;">${cell || ''}</td>`).join('')}</tr>
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
      const opt = {
        margin: 10,
        filename: `${docTitle}_${activeTab}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: (['table'].includes(activeTab) ? 'landscape' : 'portrait') as 'portrait' | 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // @ts-ignore
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set(opt).from(element).save();
      toast.success(`${activeTab} report exported!`);
    } catch (err: any) {
      console.error('Partial PDF failure:', err);
      toast.error('Export failed');
    }
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
      if ((err as Error).name !== 'AbortError') toast.error('Failed to share');
    }
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
        <div className="w-full px-8 sm:px-16 lg:px-24 xl:px-32 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-[28px] font-bold tracking-widest drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] flex items-center">
                <span style={{ color: '#1d51df' }}>O</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>mni</span>
                <span style={{ color: '#1d51df' }} className="ml-1">S</span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400" style={{ backgroundImage: 'linear-gradient(to right, #2B7FFF)', WebkitBackgroundClip: 'text' }}>tudy</span>
                <span className="inline-block w-2"></span>
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

      <main className="w-full px-8 sm:px-16 lg:px-24 xl:px-32 py-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
            <div>
              <h1 className="text-3xl font-bold">{docTitle}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Summary generated from {summary.fileName || fileName}
                {summary.pages && <span className="ml-2">· {summary.pages} page{summary.pages !== 1 ? 's' : ''}</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadModulePDF} className="gap-2 rounded-xl">
                <Download className="h-4 w-4 text-blue-500" />
                This Module
              </Button>
              <Button variant="default" size="sm" onClick={handleDownloadPDF} className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4" />
                Full Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 rounded-xl">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate} className="border-blue-500 text-blue-500 hover:bg-blue-50 gap-2 rounded-xl">
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
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
                  <span className="hidden lg:inline">{tab.label}</span>
                  <span className="lg:hidden">{tab.short}</span>
                </Button>
              );
            })}
          </div>

          <div className="relative">
            {/* Tab: Text */}
            <div id="export-text" className={activeTab === 'text' ? 'block' : 'hidden'}>
              <Card className="dark:bg-gray-950 border-none shadow-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-white/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800"><CardTitle>Key Points</CardTitle></CardHeader>
                <CardContent className="p-8">
                  <ScrollArea className="h-[700px]">
                    <div className="space-y-4">
                      {keyPoints.map((point: string, index: number) => (
                        <div key={index} className="flex gap-4 p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 transition-all hover:translate-x-1">
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
                <CardHeader className="bg-white/50 dark:bg-white/5 border-b border-gray-100 dark:border-gray-800"><CardTitle>Document Structure</CardTitle></CardHeader>
                <CardContent className="p-8">
                  <ScrollArea className="h-[700px]">
                    <div className="space-y-4">
                      {documentOutline.map((section, sIdx) => (
                        <div key={sIdx} className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
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
                                  <h5 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-2">{sub.title}</h5>
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
              <MindMapViewer title={docTitle} data={summary.content?.mindMapData} theme={theme} />
            </div>

            {/* Tab: Infographic */}
            <div id="export-infographic" className={activeTab === 'infographic' ? 'block' : 'hidden'}>
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} />
            </div>

            {/* Tab: Flashcards */}
            <div id="export-flashcards" className={activeTab === 'flashcards' ? 'block' : 'hidden'}>
              <FlashcardsViewer title={docTitle} data={summary.content?.flashcards} />
            </div>

            {/* Tab: Table */}
            <div id="export-table" className={activeTab === 'table' ? 'block' : 'hidden'}>
              <ComparativeTableViewer title={docTitle} data={summary.content?.comparativeTable} theme={theme} />
            </div>

            {/* Hidden: All Infographic Modes for Export */}
            <div id="export-infographic-all" className="hidden pointer-events-none absolute" style={{ top: -10000, width: '1400px' }}>
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} forcedViewMode="hub" />
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} forcedViewMode="flow" />
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} forcedViewMode="circular" />
              <InfographicViewer title={docTitle} data={summary.content?.infographicData} theme={theme} forcedViewMode="flowchart" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}